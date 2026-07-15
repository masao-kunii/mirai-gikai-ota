// 区政テーマ（themes / theme_contents / theme_initiatives）のシードデータ。
// 従来 apps/web の静的定義（lib/kusei-themes.ts）にあった内容を DB に投入する。
// 大田区の「個別分野のプラン(9分野)」を住民目線で7テーマに統合。
// 中身（theme_contents / theme_initiatives）は今回 子育て・教育 のみ。

type ThemeSeed = {
  slug: string;
  emoji: string;
  name: string;
  lead: string;
  sort_order: number;
};

export const themes: ThemeSeed[] = [
  {
    slug: "kosodate",
    emoji: "🧒",
    name: "子育て・教育",
    lead: "保育・学童、子どもの生活応援、若者支援、学びの環境づくり",
    sort_order: 0,
  },
  {
    slug: "fukushi",
    emoji: "🤝",
    name: "福祉・健康",
    lead: "高齢者・障がい者福祉、地域包括ケア、健康づくり、医療",
    sort_order: 1,
  },
  {
    slug: "machizukuri",
    emoji: "🏙️",
    name: "まちづくり・住まい",
    lead: "都市計画、住宅、道路・公園、バリアフリー、景観",
    sort_order: 2,
  },
  {
    slug: "kankyo",
    emoji: "🌱",
    name: "環境・ごみ",
    lead: "ごみ・リサイクル、脱炭素、みどり、公害対策",
    sort_order: 3,
  },
  {
    slug: "bousai",
    emoji: "🛟",
    name: "防災・安全",
    lead: "地震・水害への備え、国土強靱化、地域の安全",
    sort_order: 4,
  },
  {
    slug: "sangyo",
    emoji: "🏭",
    name: "産業・観光",
    lead: "ものづくり・中小企業、商店街、観光・空港臨海部",
    sort_order: 5,
  },
  {
    slug: "chiiki",
    emoji: "🏘️",
    name: "地域・コミュニティ",
    lead: "地域活動、多文化共生、区政運営・情報公開",
    sort_order: 6,
  },
];

type ThemeContentSeed = {
  theme_slug: string;
  overview: string;
  policies: { title: string; body: string }[];
  numbers: { label: string; value: string; note?: string }[];
  plans: { name: string; url: string }[];
  bill_tag_label: string;
};

// theme_contents（本文）。今回は 子育て・教育 のみ中身を入れる。
const themeContentsWithSlug: ThemeContentSeed[] = [
  {
    theme_slug: "kosodate",
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
      { label: "支援の対象", value: "0歳〜若者世代", note: "乳幼児から切れ目なく" },
      { label: "区の人口", value: "約74万人", note: "参考" },
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
    bill_tag_label: "子育て・教育",
  },
];

type ThemeInitiativeSeed = {
  theme_slug: string;
  title: string;
  body: string;
  date_label: string;
  url: string;
  sort_order: number;
};

// theme_initiatives（具体的な取り組み）。今回は 子育て・教育 のみ。
const themeInitiativesWithSlug: ThemeInitiativeSeed[] = [
  {
    theme_slug: "kosodate",
    title: "学校給食費の無償化",
    date_label: "令和7年度〜",
    body: "区立小中学校に通う子どもの給食費を、区が負担して無償化しています。物価上昇分も含めて支援しています。",
    url: "https://www.city.ota.tokyo.jp/kyouiku/gakukyou/kyusyoku.files/07musyouka1.pdf",
    sort_order: 0,
  },
  {
    theme_slug: "kosodate",
    title: "妊婦のための支援給付",
    date_label: "令和7年4月〜",
    body: "妊娠期からの切れ目ない支援として、妊娠時（1回目5万円）と出産後の2回に分けて給付金を支給します。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/kodomo/shussan/ninpunotamenosienkyuhu.html",
    sort_order: 1,
  },
  {
    theme_slug: "kosodate",
    title: "産後ケア事業",
    date_label: "実施中",
    body: "産後の体調回復や授乳・育児の相談を支援します。訪問型・宿泊型・グループケア型から選べます。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/kodomo/shussan/sango-care.html",
    sort_order: 2,
  },
];

/** slug → theme_id を解決して theme_contents の insert 行を作る。 */
export function createThemeContents(
  insertedThemes: { id: string; slug: string }[]
) {
  return themeContentsWithSlug.map((content) => {
    const theme = insertedThemes.find((t) => t.slug === content.theme_slug);
    if (!theme) {
      throw new Error(`Theme not found for content: ${content.theme_slug}`);
    }
    const { theme_slug, ...rest } = content;
    return { theme_id: theme.id, ...rest };
  });
}

/** slug → theme_id を解決して theme_initiatives の insert 行を作る。 */
export function createThemeInitiatives(
  insertedThemes: { id: string; slug: string }[]
) {
  return themeInitiativesWithSlug.map((initiative) => {
    const theme = insertedThemes.find((t) => t.slug === initiative.theme_slug);
    if (!theme) {
      throw new Error(
        `Theme not found for initiative: ${initiative.theme_slug}`
      );
    }
    const { theme_slug, ...rest } = initiative;
    return { theme_id: theme.id, ...rest };
  });
}
