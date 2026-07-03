/**
 * 全テーブルの公開境界分類（TARGET_ARCHITECTURE §2.1 / §10.1）。
 *
 * 「公開データ / 未公開データ / 住民の声」の3階級を、テーブルごとに宣言する。
 * 新テーブルを追加したら必ずここに分類を追加し、マイグレーションで
 * 対応する GRANT / RLS ポリシーを付与すること。
 * 分類漏れ・ポリシー付け忘れは completeness.test.ts が検出する。
 */

export type PublicRead =
  /** 無条件公開（マスタデータ） */
  | "all"
  /** 行条件付き公開（published 議案・公開レポート等） */
  | "conditional"
  /** 公開読み取りなし */
  | "none";

export type TableBoundary = {
  publicRead: PublicRead;
  /** public_reader の SELECT がカラム制限付きか（機微カラムの除外） */
  publicColumnsRestricted?: true;
  /** resident_writer が自分（app.anon_id）の行を読み書きできるか */
  residentWrite: boolean;
  note: string;
};

export const TABLE_BOUNDARIES: Record<string, TableBoundary> = {
  bill_contents: {
    publicRead: "conditional",
    residentWrite: false,
    note: "published な議案の AI 生成コンテンツのみ公開",
  },
  bills: {
    publicRead: "conditional",
    publicColumnsRestricted: true,
    residentWrite: false,
    note: "published/coming_soon のみ公開。knowledge_source はカラム除外",
  },
  bills_tags: {
    publicRead: "conditional",
    residentWrite: false,
    note: "公開議案（coming_soon 含む）のタグ紐付けのみ公開",
  },
  chat_usage_events: {
    publicRead: "none",
    residentWrite: false,
    note: "サーバが記録する AI 使用量・コスト",
  },
  chats: {
    publicRead: "none",
    residentWrite: true,
    note: "チャット履歴（本人のみ）",
  },
  committees: {
    publicRead: "all",
    residentWrite: false,
    note: "委員会マスタ",
  },
  council_session_minutes: {
    publicRead: "none",
    residentWrite: false,
    note: "議事録の取り込みデータ（管理用）",
  },
  council_sessions: {
    publicRead: "all",
    residentWrite: false,
    note: "会期マスタ",
  },
  expert_registrations: {
    publicRead: "none",
    residentWrite: false,
    note: "専門家登録（氏名・メール等の PII を含む）",
  },
  faction_stances: {
    publicRead: "conditional",
    residentWrite: false,
    note: "published な議案の会派見解のみ公開",
  },
  factions: {
    publicRead: "all",
    residentWrite: false,
    note: "会派マスタ",
  },
  interview_configs: {
    publicRead: "conditional",
    residentWrite: false,
    note: "published な議案のインタビュー設定（LP 表示用）",
  },
  interview_messages: {
    publicRead: "conditional",
    residentWrite: true,
    note: "公開レポートのチャットログとして公開 + 本人の読み書き",
  },
  interview_questions: {
    publicRead: "conditional",
    residentWrite: false,
    note: "published な議案のインタビュー質問",
  },
  interview_rating_feedbacks: {
    publicRead: "none",
    residentWrite: true,
    note: "インタビュー評価フィードバック（本人のみ）",
  },
  interview_report: {
    publicRead: "conditional",
    residentWrite: false,
    note: "is_public_by_user AND is_public_by_admin のみ公開。作成は管理系接続",
  },
  interview_sessions: {
    publicRead: "conditional",
    residentWrite: true,
    note: "公開レポートのセッションとして公開 + 本人の読み書き",
  },
  preview_tokens: {
    publicRead: "none",
    residentWrite: false,
    note: "draft プレビューの共有トークン（検証はサーバ側）",
  },
  rate_limit_counters: {
    publicRead: "none",
    residentWrite: false,
    note: "レート制限カウンタ（サーバが更新）",
  },
  report_reactions: {
    publicRead: "none",
    residentWrite: true,
    note: "レポートへのリアクション（集計値の公開はサーバ経由）",
  },
  tags: {
    publicRead: "all",
    residentWrite: false,
    note: "タグマスタ",
  },
  topic_analysis_classifications: {
    publicRead: "none",
    residentWrite: false,
    note: "論点集約（公開可視化の実装時に conditional 化する）",
  },
  topic_analysis_topics: {
    publicRead: "none",
    residentWrite: false,
    note: "論点集約（公開可視化の実装時に conditional 化する）",
  },
  topic_analysis_versions: {
    publicRead: "none",
    residentWrite: false,
    note: "論点集約（公開可視化の実装時に conditional 化する）",
  },
};
