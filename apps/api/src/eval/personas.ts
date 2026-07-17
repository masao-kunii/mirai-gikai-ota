import type { InterviewSubjectInput } from "@mirai-gikai/shared/interview-prompts/subject-prompts";

/**
 * インタビュー評価ハーネス用の対象（テーマ/取り組み）と模擬回答者ペルソナ。
 *
 * 本番の DB には依存せず、評価を自己完結で回せるよう固定データとして持つ。
 * ここを差し替えれば別テーマ・別ペルソナで評価できる。
 */

export type EvalPersona = {
  id: string;
  /** 一言ラベル（出力用） */
  label: string;
  /** 背景（回答者LLMの人物設定） */
  background: string;
  /** この人物の対象への基本スタンス */
  stanceHint: "for" | "against" | "neutral";
  /** 対象への詳しさ */
  knowledge: "beginner" | "intermediate" | "expert";
  /** 典型的な回答の長さ */
  responseLength: "short" | "medium" | "long";
  /**
   * この人物が本当は伝えたい主要な論点。
   * インタビューがこれらをどれだけ引き出せたか（網羅性）の採点に使う。
   */
  keyPoints: string[];
};

/** 評価対象のテーマ/取り組み（本番の theme_contents 相当を手書き） */
export const EVAL_SUBJECT: InterviewSubjectInput = {
  kind: "theme",
  name: "子育て・教育",
  summary:
    "大田区は妊娠・出産から乳幼児期、学齢期、若者世代まで切れ目のない支援を進めています。保育・学童の整備、子どもの生活応援、妊娠・出産期の支援、児童館の充実、子どもを守る取り組み、学校給食費の無償化や医療費助成などに取り組んでいます。",
  detail:
    "主な取り組み: 保育・学童の整備（待機児童対策）／子どもの生活応援（貧困対策）／妊娠・出産期の支援（産後ケア等）／若者の支援／児童館の充実と子どもを守る取り組み。最近の取り組み: 学校給食費の無償化（令和7年度〜）、妊婦のための支援給付、産後ケア事業。",
};

export const EVAL_PERSONAS: EvalPersona[] = [
  {
    id: "working-parent",
    label: "共働きで保育園を探す親",
    background:
      "30代の会社員。1歳の子どもがいる共働き世帯。4月の職場復帰に向けて保育園を探しているが、希望する園に入れるか不安。送り迎えの時間の都合や、病児保育の少なさにも困っている。",
    stanceHint: "neutral",
    knowledge: "beginner",
    responseLength: "medium",
    keyPoints: [
      "希望する保育園に入れるか不安（待機児童）",
      "送り迎えの時間と勤務時間が合わない",
      "子どもが熱を出したときの病児保育が足りない",
    ],
  },
  {
    id: "tight-budget",
    label: "家計が厳しいひとり親",
    background:
      "40代のひとり親。中学生の子を育てている。生活は楽ではなく、給食費の無償化はとても助かっている。塾に通わせる余裕がなく、子どもの学習の遅れが心配。行政の支援制度が分かりにくいとも感じている。",
    stanceHint: "for",
    knowledge: "beginner",
    responseLength: "short",
    keyPoints: [
      "学校給食費の無償化が家計の助けになっている",
      "塾に通わせる余裕がなく学習支援がほしい",
      "支援制度が分かりにくく、どこに相談すればいいか分からない",
    ],
  },
  {
    id: "childcare-worker",
    label: "現場を知る保育士",
    background:
      "私立保育園に10年勤める保育士。現場の人手不足を痛感している。区の支援は評価しているが、保育士の待遇改善や、配慮の必要な子どもへの支援体制の強化が必要だと考えている。",
    stanceHint: "for",
    knowledge: "expert",
    responseLength: "long",
    keyPoints: [
      "保育の現場が人手不足で、保育士の待遇改善が必要",
      "配慮が必要な子ども（発達支援など）への体制強化",
      "区の支援は評価しているが現場まで届いていない面もある",
    ],
  },
];
