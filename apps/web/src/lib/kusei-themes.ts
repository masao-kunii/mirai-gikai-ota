/**
 * 区政をテーマ（政策領域）で見せるための定義（プロトタイプ）。
 *
 * ここは現状「静的サンプル」。本番では新規テーブル（themes / theme_contents）＋
 * 区の計画(PDF等)を AI でやさしく要約するパイプラインに置き換える想定。
 * まず子育て・教育だけ中身を入れて、ページ設計を確認するためのもの。
 *
 * テーマは大田区の「個別分野のプラン(9分野)」を住民目線で7つに統合。
 */
export type KuseiThemeDetail = {
  /** 区の方針・計画のやさしい要約（Markdown） */
  overview: string;
  /** 主な施策・取り組み */
  policies: { title: string; body: string }[];
  /** 数字（区の数字・オープンデータから接続予定。プロトタイプは参考値） */
  numbers?: { label: string; value: string; note?: string }[];
  /** 出典（区の計画ページ） */
  plans: { name: string; url: string }[];
  /** 関連議案の紐付けに使う注目タグの label（既存タグに接続） */
  billTagLabel?: string;
};

export type KuseiTheme = {
  slug: string;
  emoji: string;
  name: string;
  lead: string;
  detail?: KuseiThemeDetail;
};

export const KUSEI_THEMES: KuseiTheme[] = [
  {
    slug: "kosodate",
    emoji: "🧒",
    name: "子育て・教育",
    lead: "保育・学童、子どもの生活応援、若者支援、学びの環境づくり",
    detail: {
      overview: `大田区は「子どもがのびのび育ち、子育て家庭が安心して暮らせるまち」を目指しています。保育や学童保育を増やして働きながら子育てできる環境をつくること、経済的に厳しい家庭の子どもを支える「子どもの生活応援」、若者の相談・自立の支援、身近な居場所である児童館の充実などに取り組んでいます。

区はいくつかの計画（子ども・子育て支援事業計画、子ども・若者計画、子どもの生活応援プランなど）にもとづき、乳幼児期から若者世代まで**切れ目のない支援**を目指しています。`,
      policies: [
        {
          title: "保育・学童の整備（待機児童対策）",
          body: "保育園や学童保育を増やし、働きながら安心して子育てできる環境をつくります。",
        },
        {
          title: "子どもの生活応援（貧困対策）",
          body: "経済的に厳しい家庭の子どもへ、学習・食・居場所などの支援を届けます。",
        },
        {
          title: "若者の支援",
          body: "悩みの相談や自立に向けたサポート。ひきこもり等にも寄り添います。",
        },
        {
          title: "児童館の充実",
          body: "子どもが安心して過ごせる身近な居場所づくりと、機能の見直し・構想づくりを進めます。",
        },
        {
          title: "子どもを守る",
          body: "児童虐待の防止や、相談・見守り体制の強化に取り組みます。",
        },
      ],
      numbers: [
        {
          label: "支援の対象",
          value: "0歳〜若者世代",
          note: "乳幼児から切れ目なく",
        },
        {
          label: "区の人口",
          value: "約74万人",
          note: "参考",
        },
        {
          label: "子育て関連の主要指標",
          value: "接続予定",
          note: "区の数字・オープンデータから",
        },
      ],
      plans: [
        {
          name: "子ども・子育て支援事業計画（かがやきプラン）",
          url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/kodomo/kagayakiplan/index.html",
        },
        {
          name: "大田区子ども・若者計画",
          url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/kodomo/kodomowakamonoplan.html",
        },
        {
          name: "おおた子どもの生活応援プラン",
          url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/kodomo/kodomo_seikatsu_plan/index.html",
        },
        {
          name: "大田区児童館構想",
          url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/kodomo/jidoukankoso.html",
        },
      ],
      billTagLabel: "子育て・教育",
    },
  },
  {
    slug: "fukushi",
    emoji: "🤝",
    name: "福祉・健康",
    lead: "高齢者・障がい者福祉、地域包括ケア、健康づくり、医療",
  },
  {
    slug: "machizukuri",
    emoji: "🏙️",
    name: "まちづくり・住まい",
    lead: "都市計画、住宅、道路・公園、バリアフリー、景観",
  },
  {
    slug: "kankyo",
    emoji: "🌱",
    name: "環境・ごみ",
    lead: "ごみ・リサイクル、脱炭素、みどり、公害対策",
  },
  {
    slug: "bousai",
    emoji: "🛟",
    name: "防災・安全",
    lead: "地震・水害への備え、国土強靱化、地域の安全",
  },
  {
    slug: "sangyo",
    emoji: "🏭",
    name: "産業・観光",
    lead: "ものづくり・中小企業、商店街、観光・空港臨海部",
  },
  {
    slug: "chiiki",
    emoji: "🏘️",
    name: "地域・コミュニティ",
    lead: "地域活動、多文化共生、区政運営・情報公開",
  },
];

export function findKuseiTheme(slug: string): KuseiTheme | undefined {
  return KUSEI_THEMES.find((t) => t.slug === slug);
}
