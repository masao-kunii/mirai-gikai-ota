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
  // 関連する区の公式ページ（情報・サービス・注目ページ・計画）。1行説明つき。
  plans: { name: string; url: string; description?: string }[];
  bill_tag_label: string;
};

// theme_contents（本文）。今回は 子育て・教育 のみ中身を入れる。
const themeContentsWithSlug: ThemeContentSeed[] = [
  {
    theme_slug: "kosodate",
    overview: `大田区には約74万人が暮らし、たくさんの子どもたちが育っています。区は「子どもがのびのび育ち、子育て家庭が安心して暮らせるまち」を目標に、妊娠・出産から乳幼児期、学齢期、そして若者世代まで**切れ目のない支援**を進めています。

たとえば、働きながら子育てできるよう保育園や学童保育を増やすこと、経済的に厳しい家庭の子どもを支える「子どもの生活応援」、妊娠・出産期の相談や産後ケア、身近な居場所である児童館の充実、そして子どもを虐待から守る見守り体制づくりなどに取り組んでいます。あわせて、学校給食費の無償化や医療費の助成など、家庭の負担を軽くする支援も広げています。

これらの取り組みは、「子ども・子育て支援事業計画（かがやきプラン）」や「子ども・若者計画」「子どもの生活応援プラン」といった区の計画にもとづいて進められています。くわしくは、下の「関連する区の公式ページ」からご覧いただけます。`,
    policies: [
      {
        title: "保育・学童の整備（待機児童対策）",
        body: "保育園や学童保育の定員を増やし、働きながら安心して子育てできる環境を整えます。多様な保育サービスで、家庭の状況に合った預け先を選べるようにします。",
      },
      {
        title: "子どもの生活応援（貧困対策）",
        body: "経済的に厳しい家庭の子どもへ、学習・食・居場所などの支援を届けます。児童手当や子ども医療費助成、就学援助といった経済的な支えもあわせて行います。",
      },
      {
        title: "妊娠・出産期の支援",
        body: "妊娠期からの相談や、産後の体調回復・育児をささえる産後ケア、家事・育児のヘルパー派遣など、出産前後の不安に寄り添う支援を用意しています。",
      },
      {
        title: "若者の支援",
        body: "悩みの相談や自立に向けたサポートを行います。ひきこもりなど、生きづらさを抱える若者にも寄り添います。",
      },
      {
        title: "児童館の充実と子どもを守る取り組み",
        body: "子どもが安心して過ごせる身近な居場所づくりを進めるとともに、児童虐待の防止や、相談・見守り体制の強化に取り組みます。",
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
        name: "「安心」「わくわく」大田区の子育てのページ",
        url: "https://www.city.ota.tokyo.jp/seikatsu/kodomo/topics/kosodateprbrochure.html",
        description: "区の子育て支援の全体像がわかる入口ページ。",
      },
      {
        name: "妊娠・出産・子育て（区の総合案内）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/kodomo/index.html",
        description: "妊娠から子育てまでの手続き・サービスの総合案内。",
      },
      {
        name: "子育て・こどもに関する支援",
        url: "https://www.city.ota.tokyo.jp/seikatsu/kodomo/shien/index.html",
        description: "産後ケアや家事・育児援助など、支援制度の一覧。",
      },
      {
        name: "児童に関する手当",
        url: "https://www.city.ota.tokyo.jp/seikatsu/kodomo/teate/jidouteate/index.html",
        description: "児童手当・子ども医療費助成などの経済的支援。",
      },
      {
        name: "子ども家庭支援センター",
        url: "https://www.city.ota.tokyo.jp/seikatsu/kodomo/shien/kodomo_katei_shien_c/index.html",
        description: "子育ての相談・交流ができる身近な窓口。",
      },
      {
        name: "就学援助",
        url: "https://www.city.ota.tokyo.jp/kyouiku/gakukyou/syugaku_enjo/index.html",
        description: "学用品費など、就学にかかる費用の援助。",
      },
      {
        name: "子ども・子育て支援事業計画（かがやきプラン）",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/kodomo/kagayakiplan/index.html",
        description: "区の子育て支援の基本となる計画。",
      },
      {
        name: "大田区子ども・若者計画",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/kodomo/kodomowakamonoplan.html",
        description: "若者の自立・社会参加をささえる計画。",
      },
      {
        name: "おおた子どもの生活応援プラン",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/kodomo/kodomo_seikatsu_plan/index.html",
        description: "子どもの貧困対策を進める計画。",
      },
      {
        name: "大田区児童館構想",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/kodomo/jidoukankoso.html",
        description: "児童館のあり方・機能を見直す構想。",
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
    url: "https://www.city.ota.tokyo.jp/kyouiku/gakukyou/kyusyoku.html",
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
