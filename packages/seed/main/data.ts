import type { Database } from "@mirai-gikai/supabase";

type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
type FactionStanceInsert =
  Database["public"]["Tables"]["faction_stances"]["Insert"];
type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
type BillsTagsInsert = Database["public"]["Tables"]["bills_tags"]["Insert"];
type CouncilSessionInsert =
  Database["public"]["Tables"]["council_sessions"]["Insert"];
type FactionInsert = Database["public"]["Tables"]["factions"]["Insert"];
type CommitteeInsert = Database["public"]["Tables"]["committees"]["Insert"];
type CouncilSessionMinutesInsert = Omit<
  Database["public"]["Tables"]["council_session_minutes"]["Insert"],
  "council_session_id"
> & { session_slug: string };
type InterviewConfigInsert =
  Database["public"]["Tables"]["interview_configs"]["Insert"];
type InterviewQuestionInsert =
  Database["public"]["Tables"]["interview_questions"]["Insert"];
type InterviewSessionInsert =
  Database["public"]["Tables"]["interview_sessions"]["Insert"];
type InterviewMessageInsert =
  Database["public"]["Tables"]["interview_messages"]["Insert"];
type InterviewReportInsert =
  Database["public"]["Tables"]["interview_report"]["Insert"];

// 定例会データ
// 配列の先頭が「最新（次回もしくは現在開催中）」の会期、続いて過去の会期の順で並べる。
// 出典: https://www.city.ota.tokyo.jp/gikai/kugikai_oshirase/kaiginittei.html
export const councilSessions: CouncilSessionInsert[] = [
  {
    name: "令和8年 第2回定例会",
    slug: "r8-2",
    council_url:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/index.html",
    start_date: "2026-06-16",
    end_date: "2026-06-25",
    is_active: true,
  },
  {
    name: "令和8年 第1回定例会",
    slug: "r8-1",
    council_url:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/index.html",
    start_date: "2026-02-13",
    end_date: "2026-03-25",
    is_active: false,
  },
  {
    name: "令和7年 第4回定例会",
    slug: "r7-4",
    council_url:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/index.html",
    start_date: "2025-11-26",
    end_date: "2025-12-07",
    is_active: false,
  },
];

// 議事録（会議録速報版）データ
// 出典: https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.html
// 令和8年第1回定例会の本会議録（PDF）。markdown_text は admin の
// markitdown 実行で後から埋める運用。
export const councilSessionMinutes: CouncilSessionMinutesInsert[] = [
  {
    session_slug: "r8-1",
    meeting_date: "2026-02-13",
    day_number: 1,
    title: "令和8年第1回定例会（第1日）",
    source_pdf_url:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.files/080213.pdf",
  },
  {
    session_slug: "r8-1",
    meeting_date: "2026-02-20",
    day_number: 2,
    title: "令和8年第1回定例会（第2日）",
    source_pdf_url:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.files/080220.pdf",
  },
  {
    session_slug: "r8-1",
    meeting_date: "2026-02-24",
    day_number: 3,
    title: "令和8年第1回定例会(第3日)",
    source_pdf_url:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.files/080224.pdf",
  },
  {
    session_slug: "r8-1",
    meeting_date: "2026-03-04",
    day_number: 4,
    title: "令和8年第1回定例会（第4日）",
    source_pdf_url:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.files/080304.pdf",
  },
  {
    session_slug: "r8-1",
    meeting_date: "2026-03-25",
    day_number: 5,
    title: "令和8年第1回定例会（第5日）",
    source_pdf_url:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.files/080325.pdf",
  },
];

// 会派データ
// alternative_names は議事録など外部ソースで使われる正式名・別表記を登録する。
// AI 抽出時の自動マッチングに使われる（admin の faction-matching ロジック参照）。
export const factions: FactionInsert[] = [
  {
    name: "jimin-musho",
    display_name: "自民党・無所属の会",
    alternative_names: [
      "自由民主党大田区議団・無所属の会",
      "自由民主党大田区議団",
      "自民党大田区議団",
    ],
    sort_order: 1,
    is_active: true,
  },
  {
    name: "komei",
    display_name: "公明党",
    alternative_names: ["大田区議会公明党", "公明党大田区議団"],
    sort_order: 2,
    is_active: true,
  },
  {
    name: "tsubasa",
    display_name: "つばさ",
    alternative_names: ["つばさ大田区議団"],
    sort_order: 3,
    is_active: true,
  },
  {
    name: "kyosan",
    display_name: "共産党",
    alternative_names: ["日本共産党大田区議団", "日本共産党"],
    sort_order: 4,
    is_active: true,
  },
  {
    name: "rikken",
    display_name: "立憲民主党",
    alternative_names: ["立憲民主党大田区議団", "立憲民主党・無所属"],
    sort_order: 5,
    is_active: true,
  },
  {
    name: "ishin",
    display_name: "維新の会",
    alternative_names: [
      "日本維新の会大田区議団",
      "日本維新の会",
      "維新の会大田区議団",
    ],
    sort_order: 6,
    is_active: true,
  },
  {
    name: "tofa-kokumin",
    display_name: "都ファ・国民",
    alternative_names: [
      "都民ファースト・国民民主党",
      "都民ファースト",
      "国民民主党",
    ],
    sort_order: 7,
    is_active: true,
  },
  {
    name: "fair-min",
    display_name: "フェアな民主主義",
    alternative_names: ["フェアな民主主義大田区議団"],
    sort_order: 8,
    is_active: true,
  },
  {
    name: "reiwa",
    display_name: "れいわ新選組",
    alternative_names: [
      "ＯＴＡれいわ新選組",
      "OTAれいわ新選組",
      "れいわ新選組大田区議団",
    ],
    sort_order: 9,
    is_active: true,
  },
  {
    name: "kodomo-bosai",
    display_name: "子ども防災会",
    alternative_names: ["大田子ども防災会"],
    sort_order: 10,
    is_active: true,
  },
  {
    name: "soshi",
    display_name: "未来創志会",
    alternative_names: ["おおた未来創志会", "大田未来創志会"],
    sort_order: 11,
    is_active: true,
  },
];

// 委員会データ
export const committees: CommitteeInsert[] = [
  {
    name: "総務財政委員会",
    description: "区の総務・財政に関する事項についての審査",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "地域産業委員会",
    description: "地域振興、産業経済に関する事項についての審査",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "健康福祉委員会",
    description: "健康、福祉、医療に関する事項についての審査",
    sort_order: 3,
    is_active: true,
  },
  {
    name: "まちづくり環境委員会",
    description: "都市計画、環境、まちづくりに関する事項についての審査",
    sort_order: 4,
    is_active: true,
  },
  {
    name: "こども文教委員会",
    description: "子育て支援、教育、文化に関する事項についての審査",
    sort_order: 5,
    is_active: true,
  },
  {
    name: "議会運営委員会",
    description: "議会の運営に関する事項についての審査",
    sort_order: 6,
    is_active: true,
  },
];

// タグデータ
export const tags: TagInsert[] = [
  {
    label: "まちづくり・環境",
    description: "まちづくり、環境保護、都市計画に関する議案",
    featured_priority: 1,
  },
  {
    label: "子育て・教育",
    description: "子育て支援、教育政策、若者支援に関する議案",
    featured_priority: 2,
  },
  {
    label: "福祉・医療",
    description: "福祉、医療、高齢者支援に関する議案",
    featured_priority: 3,
  },
];

// 議案データ
// 配列の先頭6件が現在開催中の会期、後ろ5件が前回の会期に紐づくよう
// run.ts でリンクされる (slice(0,6) と slice(6))。
export const bills: BillInsert[] = [
  // === 現在開催中 (令和8年第2回) の区長提出議案 ===
  {
    name: "大田区シニア世代デジタル活用支援条例",
    proposal_type: "mayor_bill",
    status: "in_committee",
    status_note: "総務財政委員会で審査中",
    published_at: "2026-05-09T09:00:00+09:00",
    publish_status: "published",
    is_featured: true,
  },
  {
    name: "大田区気候変動対策推進条例",
    proposal_type: "mayor_bill",
    status: "submitted",
    status_note: "本会議で議案上程、まちづくり環境委員会へ付託予定",
    published_at: "2026-05-09T10:00:00+09:00",
    publish_status: "published",
    is_featured: true,
  },
  {
    name: "大田区児童相談所設置条例",
    proposal_type: "mayor_bill",
    status: "plenary_session",
    status_note: "委員会審査終了、本会議で採決予定",
    published_at: "2026-05-12T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  // === 報告 ===
  {
    name: "令和7年度 大田区一般会計補正予算 (専決処分) の報告",
    proposal_type: "report",
    status: "submitted",
    status_note: "本会議で報告済み",
    published_at: "2026-05-10T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  // === 請願・陳情 ===
  {
    name: "区立公園の喫煙所設置に関する陳情",
    proposal_type: "petition",
    status: "in_committee",
    status_note: "まちづくり環境委員会で審査中",
    published_at: "2026-05-08T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "学校給食における国産食材使用率向上に関する請願",
    proposal_type: "petition",
    status: "submitted",
    status_note: "こども文教委員会へ付託予定",
    published_at: "2026-05-09T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  // === 過去の議案 (令和7年第4回 など) ===
  {
    name: "大田区子ども医療費助成条例の一部改正",
    proposal_type: "mayor_bill",
    status: "in_committee",
    status_note: "こども文教委員会で審査中",
    published_at: "2026-02-20T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "大田区地域包括ケアシステム推進条例",
    proposal_type: "mayor_bill",
    status: "approved",
    status_note: "本会議で可決",
    published_at: "2025-11-26T10:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "大田区公園条例の一部改正",
    proposal_type: "mayor_bill",
    status: "rejected",
    status_note: "本会議で否決",
    published_at: "2025-12-01T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "大田区学校給食費の無償化に関する条例",
    proposal_type: "mayor_bill",
    status: "approved",
    status_note: "本会議で可決、来年度から実施",
    published_at: "2025-11-28T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "大田区防災対策基本条例の一部改正",
    proposal_type: "mayor_bill",
    status: "rejected",
    status_note: "本会議で否決",
    published_at: "2025-12-05T10:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
];

// 議案とタグの関連付け
export function createBillsTags(
  insertedBills: { id: string; name: string }[],
  insertedTags: { id: string; label: string }[]
): Omit<BillsTagsInsert, "id" | "created_at">[] {
  const billTagMap: { [billName: string]: string[] } = {
    "大田区シニア世代デジタル活用支援条例": ["福祉・医療"],
    "大田区気候変動対策推進条例": ["まちづくり・環境"],
    "大田区児童相談所設置条例": ["子育て・教育"],
    "大田区子ども医療費助成条例の一部改正": ["子育て・教育"],
    "大田区地域包括ケアシステム推進条例": ["福祉・医療"],
    "大田区公園条例の一部改正": ["まちづくり・環境"],
    "大田区学校給食費の無償化に関する条例": ["子育て・教育"],
    "大田区防災対策基本条例の一部改正": ["まちづくり・環境"],
  };

  const billsTags: Omit<BillsTagsInsert, "id" | "created_at">[] = [];

  for (const bill of insertedBills) {
    const tagLabels = billTagMap[bill.name] || [];
    for (const tagLabel of tagLabels) {
      const tag = insertedTags.find((t) => t.label === tagLabel);
      if (tag) {
        billsTags.push({
          bill_id: bill.id,
          tag_id: tag.id,
        });
      }
    }
  }

  return billsTags;
}

// 会派見解データ
// 議案名 → 会派 name → 賛否・コメント のマップ。
// 表示は client/components/faction-stances-section.tsx で「賛成→中立→反対」「sort_order 昇順」で並べる。
type StanceEntry = { type: "for" | "against" | "neutral"; comment: string };
const factionStancesByBill: Record<string, Record<string, StanceEntry>> = {
  // === 現在の会期（令和8年第2回）===
  大田区シニア世代デジタル活用支援条例: {
    "jimin-musho": {
      type: "for",
      comment: `デジタル化が進む中、シニア世代を取り残さないための制度的な支援は不可欠です。地域包括支援センターとの連携も実態に即しており、賛成いたします。`,
    },
    komei: {
      type: "for",
      comment: `誰一人取り残さないデジタル社会の実現は党としても重視している政策方向と一致します。詐欺被害の予防教育を併せて行うことを強く要望します。`,
    },
    tsubasa: {
      type: "neutral",
      comment: `方向性に異論はないものの、年間3.5億円の継続的な予算負担と効果検証の枠組みが条例案では明確になっていません。継続的なモニタリング体制の追加を求めて慎重に判断します。`,
    },
    kyosan: {
      type: "for",
      comment: `窓口での対面・電話対応の保証は、デジタル化により行政サービスから排除されがちな高齢者・障害者の権利を守るうえで重要です。`,
    },
    rikken: {
      type: "for",
      comment: `スマホ教室の常設化と相談員制度はかねてから求めてきた施策です。地域の NPO や民間との連携も含めた運用を期待します。`,
    },
  },
  大田区気候変動対策推進条例: {
    "jimin-musho": {
      type: "neutral",
      comment: `2050年カーボンニュートラルの方向性には賛同しますが、住宅断熱や太陽光パネル補助の急拡大が事業者・施工体制に追いつくかについて懸念があります。段階的な拡充を求めます。`,
    },
    komei: {
      type: "for",
      comment: `家庭部門・運輸部門が排出量の大半を占める区の特性を踏まえ、住宅断熱への補助拡充は理にかなっています。賛成。`,
    },
    kyosan: {
      type: "for",
      comment: `気候危機への抜本的な対策として、区の責務を条例で明確化することは重要な一歩です。中小事業者への支援拡充を歓迎します。`,
    },
    rikken: {
      type: "for",
      comment: `2030年に2013年比50%削減という具体的な数値目標を条例に明記する点を高く評価します。実現に向けた進捗の毎年度公表も併せて求めます。`,
    },
    ishin: {
      type: "against",
      comment: `カーボンニュートラルの方向性には賛同しますが、屋上緑化の義務化や既存建築物への規制強化は事業者の負担が大きく、現状では時期尚早と判断します。`,
    },
  },
  大田区児童相談所設置条例: {
    "jimin-musho": {
      type: "for",
      comment: `児童虐待相談件数が増加している現状を踏まえ、区独自の児童相談所設置は喫緊の課題です。十分な専門人材の確保を強く求めます。`,
    },
    komei: {
      type: "for",
      comment: `地域に密着した子ども家庭支援を行う上で、区児童相談所の設置は長年の懸案でした。子ども家庭支援センターとの役割分担を明確にした運用を望みます。`,
    },
    tsubasa: {
      type: "for",
      comment: `先行設置区の事例も踏まえると、地域に根ざした初期対応が可能になることは大きなメリットです。賛成いたします。`,
    },
    kyosan: {
      type: "for",
      comment: `子どもの権利を守る最後の砦として、児童相談所の体制充実は不可欠です。一時保護所併設と里親推進も評価します。`,
    },
    rikken: {
      type: "for",
      comment: `児童福祉司・心理司の配置基準を上回る体制を区独自に整える点は重要です。継続的な人材育成への投資を求めます。`,
    },
  },
  // === 過去の議案（令和7年第4回など）===
  大田区子ども医療費助成条例の一部改正: {
    "jimin-musho": {
      type: "for",
      comment: `子どもの医療費助成の拡充は、子育て世代の経済的負担を軽減する重要な施策です。`,
    },
    komei: {
      type: "for",
      comment: `かねてから推進してきた高校生世代までの医療費助成拡大が実現する点を評価します。`,
    },
    kyosan: {
      type: "for",
      comment: `子どもの命と健康を守る上で、所得制限のない助成制度は重要です。`,
    },
  },
  大田区地域包括ケアシステム推進条例: {
    "jimin-musho": {
      type: "for",
      comment: `高齢化が進む中、医療・介護・予防・住まい・生活支援を一体的に提供する体制の整備は、市民の安心につながります。`,
    },
    komei: {
      type: "for",
      comment: `地域包括ケアの基盤整備は急務であり、条例化による推進力強化を歓迎します。`,
    },
  },
  大田区公園条例の一部改正: {
    "jimin-musho": {
      type: "against",
      comment: `公園利活用の方向性には賛同しますが、想定されている収益事業の管理・透明性に懸念が残ります。`,
    },
    kyosan: {
      type: "against",
      comment: `公共空間の商業利用拡大は、本来の住民利用との両立への配慮が不足しています。`,
    },
  },
  大田区学校給食費の無償化に関する条例: {
    "jimin-musho": {
      type: "for",
      comment: `子育て支援と教育の充実を同時に実現する重要な政策です。財源の継続的確保についても慎重な検討を行いつつ賛成します。`,
    },
    komei: {
      type: "for",
      comment: `所得に関わらず全児童生徒を対象とする無償化を歓迎します。`,
    },
    rikken: {
      type: "for",
      comment: `子育て世帯の負担軽減として直接効果が大きい施策です。`,
    },
  },
  大田区防災対策基本条例の一部改正: {
    "jimin-musho": {
      type: "against",
      comment: `防災対策の強化は重要ですが、現行条例の運用改善で対応できる部分も多いと考えます。`,
    },
    komei: {
      type: "against",
      comment: `マンション管理組合への新たな義務化は負担が大きく、インセンティブ型の制度設計を求めます。`,
    },
  },
};

export function createFactionStances(
  insertedBills: { id: string; name: string }[],
  insertedFactions: { id: string; name: string }[]
): FactionStanceInsert[] {
  const factionByName = new Map(insertedFactions.map((f) => [f.name, f.id]));
  const stances: FactionStanceInsert[] = [];
  for (const bill of insertedBills) {
    const stancesForBill = factionStancesByBill[bill.name];
    if (!stancesForBill) continue;
    for (const [factionName, entry] of Object.entries(stancesForBill)) {
      const factionId = factionByName.get(factionName);
      if (!factionId) {
        console.warn(
          `⚠️  faction "${factionName}" not found for bill "${bill.name}"`
        );
        continue;
      }
      stances.push({
        bill_id: bill.id,
        faction_id: factionId,
        type: entry.type,
        comment: entry.comment,
      });
    }
  }
  return stances;
}

// インタビュー設定を作成（最初の議案用）
export function createInterviewConfig(
  insertedBills: { id: string; name: string }[]
): Omit<InterviewConfigInsert, "id" | "created_at" | "updated_at"> | null {
  const targetBill = insertedBills[0];
  if (!targetBill) return null;

  return {
    bill_id: targetBill.id,
    name: "デフォルト設定",
    status: "public",
    themes: ["賛否", "理由"],
    // NOTE: upstream migration 20260428100000 で knowledge_source は
    // interview_configs から bills へ移設された。bills 側の更新は
    // run.ts で targetBill に対して行う。
  };
}

// インタビュー質問を作成
export function createInterviewQuestions(
  interviewConfigId: string
): Omit<InterviewQuestionInsert, "id" | "created_at" | "updated_at">[] {
  return [
    {
      interview_config_id: interviewConfigId,
      question: "この議案に賛成ですか？反対ですか？",
      follow_up_guide: "ユーザーの立場を明確にしてください。",
      quick_replies: ["賛成", "反対", "どちらでもない"],
      question_order: 1,
    },
    {
      interview_config_id: interviewConfigId,
      question: "その理由を教えてください。",
      follow_up_guide: "具体的な理由を引き出してください。",
      quick_replies: null,
      question_order: 2,
    },
  ];
}

// インタビューセッションを作成（5パターン × 20回 = 100件）
export function createInterviewSessions(
  interviewConfigId: string
): Omit<InterviewSessionInsert, "id" | "created_at" | "updated_at">[] {
  const now = new Date();
  const sessions: Omit<
    InterviewSessionInsert,
    "id" | "created_at" | "updated_at"
  >[] = [];

  // 20回ループして100件作成
  for (let i = 0; i < 20; i++) {
    const baseOffset = i * 86400000 * 3; // 3日ずつずらす

    // パターン1: 完了 + レポートあり（賛成）
    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 1).padStart(12, "0")}`,
      started_at: new Date(
        now.getTime() - baseOffset - 3600000
      ).toISOString(),
      completed_at: new Date(
        now.getTime() - baseOffset - 3000000
      ).toISOString(),
    });

    // パターン2: 完了 + レポートあり（反対）
    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 2).padStart(12, "0")}`,
      started_at: new Date(
        now.getTime() - baseOffset - 7200000
      ).toISOString(),
      completed_at: new Date(
        now.getTime() - baseOffset - 6600000
      ).toISOString(),
    });

    // パターン3: 完了 + レポートあり（中立）
    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 3).padStart(12, "0")}`,
      started_at: new Date(
        now.getTime() - baseOffset - 10800000
      ).toISOString(),
      completed_at: new Date(
        now.getTime() - baseOffset - 10200000
      ).toISOString(),
    });

    // パターン4: 完了したけどレポート未作成
    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 4).padStart(12, "0")}`,
      started_at: new Date(
        now.getTime() - baseOffset - 14400000
      ).toISOString(),
      completed_at: new Date(
        now.getTime() - baseOffset - 13800000
      ).toISOString(),
    });

    // パターン5: 進行中（未完了、レポートなし）
    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 5).padStart(12, "0")}`,
      started_at: new Date(
        now.getTime() - baseOffset - 1800000
      ).toISOString(),
      completed_at: null,
    });
  }

  return sessions;
}

// インタビューメッセージを作成（5パターンをループ）
export function createInterviewMessages(
  sessionIds: string[]
): Omit<InterviewMessageInsert, "id" | "created_at">[] {
  const conversations = [
    // パターン1: 賛成（完了 + レポートあり）
    [
      {
        role: "assistant" as const,
        content: "この議案に賛成ですか？反対ですか？",
      },
      { role: "user" as const, content: "賛成です" },
      {
        role: "assistant" as const,
        content: "その理由を教えてください。",
      },
      {
        role: "user" as const,
        content:
          "なぜなら賛成だからです。市民のためになると思います。",
      },
      {
        role: "assistant" as const,
        content:
          "ありがとうございました。ご意見を承りました。",
      },
    ],
    // パターン2: 反対（完了 + レポートあり）
    [
      {
        role: "assistant" as const,
        content: "この議案に賛成ですか？反対ですか？",
      },
      { role: "user" as const, content: "反対です" },
      {
        role: "assistant" as const,
        content: "その理由を教えてください。",
      },
      {
        role: "user" as const,
        content: "財源が不明確だと思います。",
      },
      {
        role: "assistant" as const,
        content:
          "ありがとうございました。ご意見を承りました。",
      },
    ],
    // パターン3: どちらでもない（完了 + レポートあり）
    [
      {
        role: "assistant" as const,
        content: "この議案に賛成ですか？反対ですか？",
      },
      {
        role: "user" as const,
        content: "どちらでもないです",
      },
      {
        role: "assistant" as const,
        content: "その理由を教えてください。",
      },
      {
        role: "user" as const,
        content: "もっと情報が必要だと思います。",
      },
      {
        role: "assistant" as const,
        content:
          "ありがとうございました。ご意見を承りました。",
      },
    ],
    // パターン4: 完了したけどレポート未作成
    [
      {
        role: "assistant" as const,
        content: "この議案に賛成ですか？反対ですか？",
      },
      { role: "user" as const, content: "賛成です" },
      {
        role: "assistant" as const,
        content: "その理由を教えてください。",
      },
      {
        role: "user" as const,
        content: "良い議案だと思います。",
      },
      {
        role: "assistant" as const,
        content:
          "ありがとうございました。ご意見を承りました。",
      },
    ],
    // パターン5: 進行中（途中で離脱）
    [
      {
        role: "assistant" as const,
        content: "この議案に賛成ですか？反対ですか？",
      },
      {
        role: "user" as const,
        content: "うーん、ちょっと考えさせてください",
      },
    ],
  ];

  const messages: Omit<
    InterviewMessageInsert,
    "id" | "created_at"
  >[] = [];

  sessionIds.forEach((sessionId, sessionIndex) => {
    // 5パターンをループ
    const patternIndex = sessionIndex % 5;
    const conversation = conversations[patternIndex];
    conversation.forEach((msg) => {
      messages.push({
        interview_session_id: sessionId,
        role: msg.role,
        content: msg.content,
      });
    });
  });

  return messages;
}

// インタビューレポートを作成（パターン1,2,3のみ = 5の倍数で0,1,2番目）
export function createInterviewReports(
  sessionIds: string[]
): Omit<
  InterviewReportInsert,
  "id" | "created_at" | "updated_at"
>[] {
  const reportTemplates = [
    {
      stance: "for" as const,
      summary:
        "この議案に賛成。市民のためになると考えている。",
      role: "general_citizen" as const,
      role_description: "議案の内容に賛同する市民",
      opinions: [
        { title: "賛成理由", content: "市民のためになる" },
      ],
    },
    {
      stance: "against" as const,
      summary: "財源の不明確さを理由に反対。",
      role: "work_related" as const,
      role_description: "財政面を懸念する市民",
      opinions: [
        { title: "反対理由", content: "財源が不明確" },
      ],
    },
    {
      stance: "neutral" as const,
      summary:
        "判断するにはより多くの情報が必要と考えている。",
      role: "subject_expert" as const,
      role_description: "慎重な判断を求める市民",
      opinions: [
        { title: "態度保留理由", content: "情報不足" },
      ],
    },
  ];

  const reports: Omit<
    InterviewReportInsert,
    "id" | "created_at" | "updated_at"
  >[] = [];

  // パターン1,2,3（5の倍数で0,1,2番目）のみレポートを作成
  sessionIds.forEach((sessionId, index) => {
    const patternIndex = index % 5;
    if (patternIndex < 3) {
      const loopIndex = Math.floor(index / 5);
      reports.push({
        interview_session_id: sessionId,
        ...reportTemplates[patternIndex],
        is_public_by_user: loopIndex < 5, // 最初の5件は公開
      });
    }
  });

  return reports;
}

// デモ用の固定ID
export const DEMO_SESSION_ID =
  "00000000-0000-0000-0000-000000000001";
export const DEMO_REPORT_ID =
  "00000000-0000-0000-0000-000000000001";

// 4種類のロールを確認するためのデモ用ID
export const DEMO_SESSION_ID_WORK =
  "00000000-0000-0000-0000-000000000002";
export const DEMO_SESSION_ID_DAILY =
  "00000000-0000-0000-0000-000000000003";
export const DEMO_SESSION_ID_CITIZEN =
  "00000000-0000-0000-0000-000000000004";
export const DEMO_REPORT_ID_WORK =
  "00000000-0000-0000-0000-000000000002";
export const DEMO_REPORT_ID_DAILY =
  "00000000-0000-0000-0000-000000000003";
export const DEMO_REPORT_ID_CITIZEN =
  "00000000-0000-0000-0000-000000000004";

// デモ用のインタビューセッション（公開、固定ID）
export function createDemoSession(
  interviewConfigId: string
): InterviewSessionInsert {
  const now = new Date();
  return {
    id: DEMO_SESSION_ID,
    interview_config_id: interviewConfigId,
    user_id: "00000000-0000-0000-0000-000000000000",
    started_at: new Date(now.getTime() - 3600000).toISOString(),
    completed_at: new Date(now.getTime() - 3000000).toISOString(),
  };
}

// デモ用のインタビューメッセージ
export function createDemoMessages(): Omit<
  InterviewMessageInsert,
  "id" | "created_at"
>[] {
  return [
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。\n\n大田区議会で審議されている議案について、市民の皆さまのご意見をお聞かせください。この議案について、どのようにお考えですか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "user",
      content:
        "市政のデジタル化や、ムダの削減を達成して欲しい",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content:
        "なるほど。市政のデジタル化を通じて、行政サービスの効率化と市民の利便性向上を期待されているということですね。とても重要な指摘だと思います。\n\n具体的に、大田区のどのような行政手続きや窓口サービスがデジタル化されると良いとお考えですか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "user",
      content:
        "市役所の窓口手続きのオンライン化や、行政文書のデジタル化が進むと市民にとって便利になると期待しています。",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content:
        "ありがとうございました。ご意見を承りました。",
    },
  ];
}

// デモ用のインタビューレポート（固定ID）
export function createDemoReport(): InterviewReportInsert {
  return {
    id: DEMO_REPORT_ID,
    interview_session_id: DEMO_SESSION_ID,
    stance: "neutral",
    summary: "期待と懸念両方がある",
    role: "subject_expert",
    role_description:
      "大田区在住の会社員\n行政手続きの煩雑さを日常的に感じている",
    opinions: [
      {
        title:
          "市政のデジタル化や、ムダの削減を達成して欲しい",
        content:
          "市役所の窓口手続きのオンライン化や、行政文書のデジタル化が進むと市民にとって便利になると期待している。",
      },
    ],
    is_public_by_user: true,
  };
}

// 追加のデモ用セッション（3種類のロール確認用）
export function createAdditionalDemoSessions(
  interviewConfigId: string
): InterviewSessionInsert[] {
  const now = new Date();
  return [
    {
      id: DEMO_SESSION_ID_WORK,
      interview_config_id: interviewConfigId,
      user_id: "00000000-0000-0000-0000-000000000010",
      started_at: new Date(now.getTime() - 7200000).toISOString(),
      completed_at: new Date(now.getTime() - 6600000).toISOString(),
    },
    {
      id: DEMO_SESSION_ID_DAILY,
      interview_config_id: interviewConfigId,
      user_id: "00000000-0000-0000-0000-000000000011",
      started_at: new Date(now.getTime() - 10800000).toISOString(),
      completed_at: new Date(now.getTime() - 10200000).toISOString(),
    },
    {
      id: DEMO_SESSION_ID_CITIZEN,
      interview_config_id: interviewConfigId,
      user_id: "00000000-0000-0000-0000-000000000012",
      started_at: new Date(now.getTime() - 14400000).toISOString(),
      completed_at: new Date(now.getTime() - 10200000).toISOString(),
    },
  ];
}

// 追加のデモ用メッセージ（3種類のロール確認用）
export function createAdditionalDemoMessages(): Omit<
  InterviewMessageInsert,
  "id" | "created_at"
>[] {
  return [
    // work_related セッション用
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "user",
      content:
        "子どもの医療費負担が大きいので、この議案には賛成です。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "assistant",
      content:
        "子育て世帯としてのお立場からのご意見ですね。具体的にどのような影響がありますか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "user",
      content:
        "共働きで子ども2人を育てていますが、医療費の自己負担が家計を圧迫しています。助成拡充で少しでも負担が減れば助かります。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "assistant",
      content:
        "ありがとうございました。ご意見を承りました。",
    },
    // daily_life_affected セッション用
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "user",
      content:
        "子どもが小さいので、医療費の負担が軽くなるのは嬉しいです。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "assistant",
      content:
        "生活への影響が大きいとのことですね。どのような場面で医療費の負担を感じますか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "user",
      content:
        "風邪や怪我で小児科にかかることが多く、月に何回も通院することがあります。自己負担が積み重なると大変です。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "assistant",
      content:
        "ありがとうございました。ご意見を承りました。",
    },
    // general_citizen セッション用
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "user",
      content:
        "財源が気になりますが、子育て支援として医療費助成は必要だと思います。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "assistant",
      content:
        "財源と子育て支援のバランスを考えていらっしゃるのですね。どのような点が気になりますか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "user",
      content:
        "他の行政サービスとのバランスも考えつつ、子育て世帯への支援として医療費助成は拡充すべきだと思います。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "assistant",
      content:
        "ありがとうございました。ご意見を承りました。",
    },
  ];
}

// 追加のデモ用レポート（3種類のロール確認用）
export function createAdditionalDemoReports(): InterviewReportInsert[] {
  return [
    {
      id: DEMO_REPORT_ID_WORK,
      interview_session_id: DEMO_SESSION_ID_WORK,
      stance: "for",
      summary:
        "子育て世帯として医療費負担軽減のため賛成",
      role: "work_related",
      role_description:
        "大田区在住の共働き世帯\n子ども2人\n医療費の負担を日常的に感じている",
      opinions: [
        {
          title: "子どもの医療費負担が大きい",
          content:
            "共働きで子ども2人を育てているが、医療費の自己負担が家計を圧迫している。助成拡充で負担が減れば助かる。",
        },
      ],
      is_public_by_user: true,
    },
    {
      id: DEMO_REPORT_ID_DAILY,
      interview_session_id: DEMO_SESSION_ID_DAILY,
      stance: "for",
      summary:
        "子育て中の保護者として医療費負担軽減を期待",
      role: "daily_life_affected",
      role_description:
        "大田区在住の主婦\n小さい子ども2人の子育て中\n医療費の自己負担を日常的に感じている",
      opinions: [
        {
          title: "子どもの医療費負担が大きい",
          content:
            "風邪や怪我で小児科にかかることが多く、月に何回も通院する。自己負担が積み重なると家計に影響が大きい。",
        },
      ],
      is_public_by_user: true,
    },
    {
      id: DEMO_REPORT_ID_CITIZEN,
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      stance: "neutral",
      summary:
        "財源と子育て支援のバランスを考慮して判断",
      role: "general_citizen",
      role_description:
        "大田区在住の会社員\n子育て支援に関心あり\n市の財政にも関心がある",
      opinions: [
        {
          title: "財源と子育て支援のバランス",
          content:
            "他の行政サービスとのバランスも考えつつ、子育て世帯への支援として医療費助成は拡充すべきと考える。",
        },
      ],
      is_public_by_user: true,
    },
  ];
}
