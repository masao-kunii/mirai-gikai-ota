import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateInterview, type InterviewEvaluation } from "./evaluate";
import { EVAL_PERSONAS, EVAL_SUBJECT, type EvalPersona } from "./personas";
import { runSimulatedInterview, type SimResult } from "./run-interview";

/**
 * インタビュー評価ハーネス（軽量MVP）。
 *
 * 模擬回答者ペルソナ × 区政テーマで、インタビュアー（subject-prompts）と対話させ、
 * レポート生成 → 判定LLMで品質採点 → transcript と点数を Markdown 出力する。
 * プロンプト改善を回すための開発用ツール。ローカルの Vertex/Gemini で実行する。
 *
 *   pnpm --filter api eval        （dotenv 経由でモデル認証を注入して実行）
 */

const MODEL = process.env.INTERVIEW_EVAL_MODEL ?? "gemini-2.5-flash";

type PersonaResult = {
  persona: EvalPersona;
  sim: SimResult;
  evaluation: InterviewEvaluation;
};

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function renderTranscript(sim: SimResult): string {
  return sim.transcript
    .map((t) => {
      const who = t.role === "interviewer" ? "**Q**" : "A";
      return `${who} ${t.content}`;
    })
    .join("\n\n");
}

function renderReport(sim: SimResult): string {
  if (!sim.report) return "_（レポート未生成）_";
  const r = sim.report;
  const opinions = r.opinions
    .map((o) => `  - **${o.title}**: ${o.content}`)
    .join("\n");
  return [
    `- **要約**: ${r.summary ?? "-"}`,
    `- **スタンス**: ${r.stance ?? "-"} / **立場**: ${r.role_title ?? "-"}（${r.role ?? "-"}）`,
    `- **意見**:\n${opinions || "  -"}`,
    `- **充実度(total)**: ${r.content_richness?.total ?? "-"}`,
  ].join("\n");
}

function renderMarkdown(results: PersonaResult[]): string {
  const lines: string[] = [];
  lines.push(`# インタビュー評価レポート`);
  lines.push("");
  lines.push(`- モデル: \`${MODEL}\``);
  lines.push(`- 対象: ${EVAL_SUBJECT.name}`);
  lines.push(`- ペルソナ数: ${results.length}`);
  lines.push("");

  lines.push(`## サマリ（5点満点・高いほど良い）`);
  lines.push("");
  lines.push(
    "| ペルソナ | 質問の質 | 網羅性 | レポート忠実度 | 回答者満足度 | 完了 |"
  );
  lines.push("|---|---|---|---|---|---|");
  for (const { persona, sim, evaluation: e } of results) {
    lines.push(
      `| ${persona.label} | ${e.question_quality} | ${e.coverage} | ${e.report_faithfulness} | ${e.interviewee_satisfaction} | ${sim.reachedComplete ? "✅" : "—"} |`
    );
  }
  lines.push(
    `| **平均** | **${avg(results.map((r) => r.evaluation.question_quality))}** | **${avg(results.map((r) => r.evaluation.coverage))}** | **${avg(results.map((r) => r.evaluation.report_faithfulness))}** | **${avg(results.map((r) => r.evaluation.interviewee_satisfaction))}** | |`
  );
  lines.push("");

  for (const { persona, sim, evaluation: e } of results) {
    lines.push(`## ${persona.label}`);
    lines.push("");
    lines.push(`> 背景: ${persona.background}`);
    lines.push("");
    lines.push(`### 対話（${sim.exchanges}往復）`);
    lines.push("");
    lines.push(renderTranscript(sim));
    lines.push("");
    lines.push(`### 生成レポート`);
    lines.push("");
    lines.push(renderReport(sim));
    lines.push("");
    lines.push(`### 評価`);
    lines.push("");
    lines.push(
      `- 質問の質 **${e.question_quality}** / 網羅性 **${e.coverage}** / レポート忠実度 **${e.report_faithfulness}** / 回答者満足度 **${e.interviewee_satisfaction}**`
    );
    lines.push(`- 引き出せた論点: ${e.covered_points.join(" / ") || "—"}`);
    lines.push(`- 引き出せなかった論点: ${e.missed_points.join(" / ") || "—"}`);
    lines.push(`- 良かった点: ${e.strengths.join(" / ") || "—"}`);
    lines.push(`- 改善のヒント: ${e.improvements.join(" / ") || "—"}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  console.log(
    `🎤 インタビュー評価ハーネス（model=${MODEL} / 対象=${EVAL_SUBJECT.name} / ${EVAL_PERSONAS.length}ペルソナ）`
  );
  const results: PersonaResult[] = [];
  for (const persona of EVAL_PERSONAS) {
    console.log(`\n▶ ${persona.label} を実行中...`);
    const sim = await runSimulatedInterview({
      subject: EVAL_SUBJECT,
      persona,
      model: MODEL,
    });
    console.log(
      `  対話 ${sim.exchanges} 往復 / 完了=${sim.reachedComplete} / レポート=${sim.report ? "あり" : "なし"}`
    );
    const evaluation = await evaluateInterview({
      subject: EVAL_SUBJECT,
      persona,
      sim,
      model: MODEL,
    });
    console.log(
      `  採点: 質問=${evaluation.question_quality} 網羅=${evaluation.coverage} 忠実=${evaluation.report_faithfulness} 満足=${evaluation.interviewee_satisfaction}`
    );
    results.push({ persona, sim, evaluation });
  }

  const md = renderMarkdown(results);
  const outDir = join(process.cwd(), "eval-output");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `interview-eval-${stamp}.md`);
  writeFileSync(outPath, md, "utf-8");

  console.log("\n===== 平均スコア =====");
  console.log(
    `質問の質 ${avg(results.map((r) => r.evaluation.question_quality))} / 網羅性 ${avg(results.map((r) => r.evaluation.coverage))} / レポート忠実度 ${avg(results.map((r) => r.evaluation.report_faithfulness))} / 回答者満足度 ${avg(results.map((r) => r.evaluation.interviewee_satisfaction))}`
  );
  console.log(`\n📄 詳細レポート: ${outPath}`);
}

main().catch((e) => {
  console.error("インタビュー評価でエラー:", e);
  process.exit(1);
});
