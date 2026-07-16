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
  // 関連議案の注目タグ label。該当タグが無いテーマは省略（関連議案は空表示）。
  bill_tag_label?: string;
};

// theme_contents（本文）。7テーマ分の内容を入れる。
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
  {
    theme_slug: "fukushi",
    overview: `大田区には約73万人・約41万世帯（令和6年3月）が暮らしています。区は「だれもが住み慣れた地域で、健康で自分らしく安心して暮らせるまち」を目指し、高齢者福祉・介護、障がい者支援、健康づくり、医療・国民健康保険といった保健・福祉の分野に取り組んでいます。

高齢化が進むなか、区内23か所の地域包括支援センター（さわやかサポート）を中心に、相談から介護予防・見守りまでを地域で支える「地域包括ケア」を進めています。障がいのある方には手帳の交付や福祉サービス、就労支援などを行い、「障がい者総合サポートセンター さぽーとぴあ」で総合的に支えています。令和5年度からは、分野を超えた困りごとを受けとめる「重層的支援体制整備事業」も始めました。

これらは「おおた高齢者施策推進プラン」「おおた障がい施策推進プラン」「おおた健康プラン」「大田区地域福祉計画」などにもとづいて進めています。くわしくは下の関連する区の公式ページからご覧いただけます。`,
    policies: [
      {
        title: "地域包括ケアの推進（地域包括支援センター）",
        body: "区内23か所のセンターに専門職を配置し、高齢の方やその家族の介護・福祉の相談を身近な地域で受けとめます。介護予防や見守りも支えます。",
      },
      {
        title: "介護保険サービスの提供",
        body: "要介護・要支援の認定を受けた方が在宅・施設のサービスを利用できます。区は3年ごとに事業計画を定めて運営しています。",
      },
      {
        title: "障がい者の支援（手帳・サービス・就労）",
        body: "手帳の交付やホームヘルプ・グループホーム・就労支援などを行います。さぽーとぴあが相談から支援までを担います。",
      },
      {
        title: "健康づくりと健康寿命の延伸",
        body: "生活習慣の改善や健康診査で病気を予防し、健康寿命を延ばすことを目指します。「おおた健康プラン」にもとづいて取り組みます。",
      },
      {
        title: "分野を越えた包括的な相談支援",
        body: "令和5年度から、高齢・子育て・生活困窮など複雑な困りごとを複数の機関が連携して受けとめる体制を整えています。",
      },
    ],
    numbers: [
      { label: "区の人口", value: "約73万人", note: "令和6年3月・住民基本台帳（約41万世帯）" },
      { label: "地域包括支援センター", value: "区内23か所", note: "高齢者の相談窓口（さわやかサポート）" },
      { label: "重層的支援体制整備事業", value: "令和5年度〜", note: "分野を越えた包括的な支援体制" },
    ],
    plans: [
      {
        name: "熱中症に気をつけましょう",
        url: "https://www.city.ota.tokyo.jp/seikatsu/hoken/kenko_dukuri/other_joho/nettyuusyou.html",
        description: "暑さを避ける・こまめな水分補給など、熱中症を防ぐポイントをまとめた区のお知らせ。",
      },
      {
        name: "高齢者の支援（総合案内）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/fukushi/kourei/index.html",
        description: "高齢者向けの相談・福祉サービス・介護予防などの総合案内。",
      },
      {
        name: "地域包括支援センター（さわやかサポート）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/fukushi/kourei/sodan/sawayaka-support.html",
        description: "区内23か所の高齢者の相談窓口。介護・福祉の相談を身近な地域で。",
      },
      {
        name: "介護保険（制度・保険料）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/fukushi/kaigo/kaigohoken.html",
        description: "介護保険のしくみ・保険料、要介護認定やサービス利用の案内。",
      },
      {
        name: "障がい者福祉のあらまし",
        url: "https://www.city.ota.tokyo.jp/seikatsu/fukushi/shougai/aramashi.html",
        description: "手帳・手当・福祉サービスなど、障がいのある方が使える制度の案内。",
      },
      {
        name: "障がい者総合サポートセンター さぽーとぴあ",
        url: "https://www.city.ota.tokyo.jp/shisetsu/fukushi/shougai/support-pia.html",
        description: "相談・就労・短期入所・児童発達などを総合的に支える拠点。",
      },
      {
        name: "健康づくり",
        url: "https://www.city.ota.tokyo.jp/seikatsu/hoken/kenko_dukuri/index.html",
        description: "運動・食事・こころの健康など、健康寿命を延ばすための情報の入口。",
      },
      {
        name: "おおた高齢者施策推進プラン（第9期）",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/fukushi/koreih_kaigoh/shisaku-suishin-plan_9.html",
        description: "高齢者福祉と介護保険を一体で定める区の計画（令和6〜8年度）。",
      },
      {
        name: "おおた障がい施策推進プラン",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/fukushi/syougaisyahukushi/index.html",
        description: "障がいのある方が地域で自分らしく暮らせるまちづくりの計画。",
      },
      {
        name: "大田区地域福祉計画",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/fukushi/chiiki-f-keikaku/index.html",
        description: "地域で支え合い、必要な福祉サービスが届くまちを目指す計画。",
      },
    ],
  },
  {
    theme_slug: "machizukuri",
    overview: `大田区は、羽田空港をかかえ、蒲田・大森などのにぎわいの拠点と、川と海にかこまれた住みよいまちをあわせもつ区です。だれもが安全・便利・快適に暮らせるまちを目指し、駅前のまちづくり、道路や公園・みどりの整備、住まいの支援、バリアフリー、交通の便の向上に取り組んでいます。

これらの取り組みは、まちの将来像をしめす「大田区都市計画マスタープラン」（令和4年3月改定）や、住まいの方針をまとめた「大田区住宅マスタープラン」などの計画にもとづいて進めています。くわしくは下の関連する区の公式ページからご覧いただけます。`,
    policies: [
      {
        title: "駅を中心としたまちづくり",
        body: "蒲田駅・大森駅の周辺を、にぎわいと安全のある拠点として整えます。「グランドデザイン」にもとづき、駅前広場や歩きやすい道の整備を進めています。",
      },
      {
        title: "新空港線（蒲蒲線）で移動を便利に",
        body: "東急線とJR・京急の蒲田駅、羽田空港をつなぐ新しい鉄道の整備を進めています。東西方向の移動や空港アクセスがよくなり、地域の活性化が期待されます。",
      },
      {
        title: "住まいの支援と安全な住宅",
        body: "住宅リフォームや木造住宅の耐震診断・改修などに助成を行い、区民が安心して暮らせる住まいづくりを支えます。",
      },
      {
        title: "みどりと公園を守り育てる",
        body: "「緑の基本計画（グリーンプランおおた）」にもとづき、公園や街路のみどりを整え、うるおいのあるまちなみをつくります。",
      },
      {
        title: "だれもが移動しやすいまちへ",
        body: "バリアフリーやユニバーサルデザインのまちづくりを進めるほか、交通が不便な地域ではコミュニティバス「たまちゃんバス」を運行しています。",
      },
    ],
    numbers: [
      {
        label: "新空港線（蒲蒲線）の総事業費",
        value: "約1,248億円",
        note: "第一期整備（矢口渡〜京急蒲田）",
      },
      { label: "都市計画マスタープランの改定", value: "令和4年3月", note: "まちづくりの基本方針" },
      {
        label: "たまちゃんバス（コミュニティバス）",
        value: "令和元年7月 本格運行",
        note: "令和6年5月からEVバスで運行",
      },
    ],
    plans: [
      {
        name: "大田区都市計画マスタープラン（令和4年3月改定）",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/sumai_machinami/toshikeikaku-master-plan_r04-03.html",
        description: "まちの将来像と都市づくりの方針をしめす、まちづくりの基本となる計画。",
      },
      {
        name: "大田区住宅マスタープラン",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/sumai_machinami/jutaku_masterplan/index.html",
        description: "区の住まい・住環境の将来像と住宅施策の方向性をまとめた計画。",
      },
      {
        name: "蒲田・大森駅周辺グランドデザイン",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/sumai_machinami/grand_design/index.html",
        description: "区の中心拠点である蒲田・大森の駅周辺の将来像と整備方針。",
      },
      {
        name: "緑の基本計画「グリーンプランおおた」",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/green/greenplanota/midori/index.html",
        description: "公園やみどりの保全・整備・緑化の方針をまとめた計画。",
      },
      {
        name: "大田区交通政策基本計画",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/koutsu/koutsu-seisaku/index.html",
        description: "区の交通の課題解決と使いやすさ向上を目指す計画。",
      },
      {
        name: "住宅リフォーム助成事業",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/sumai/r_josei/jyutaku_reform_jyosei.html",
        description: "区内事業者による住宅リフォーム工事の費用の一部を助成する制度。",
      },
      {
        name: "木造住宅の耐震診断・改修の助成",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/bousai_machidukuri/mokudou.html",
        description: "地震に備え、木造住宅の耐震化にかかる費用を助成する制度。",
      },
      {
        name: "HANEDA GLOBAL WINGS（羽田空港跡地）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/haneda_airport/kukoatochi/index.html",
        description: "羽田空港に近い跡地で進む、新しい産業・交流の拠点づくりの紹介。",
      },
      {
        name: "新空港線（蒲蒲線）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/koutsu/kamakamasen/shinkukosen-main.html",
        description: "蒲田と羽田空港方面をつなぐ新しい鉄道の目的・区間・進捗の紹介。",
      },
      {
        name: "VRで見る蒲田駅周辺のまちづくり",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/machizukuri/ekishuuhen/kamata/kamata_VR.html",
        description: "蒲田駅周辺の将来像をVR・動画で体感できる注目ページ。",
      },
    ],
  },
  {
    theme_slug: "kankyo",
    overview: `大田区は、2050年に温室効果ガス排出量を実質ゼロにする「ゼロカーボンシティ」を令和4年（2022年）2月に表明し、「環境ビジョン2050」で温室効果ガス・プラスチックごみ・食品ロスの「3つのゼロ」を目標にかかげています。2030年度までに温室効果ガスを2013年度比で46%減らすことを目指し、「大田区脱炭素戦略」や「大田区環境基本計画」にもとづいて取り組みを進めています。

くらしに身近なごみの分野では、令和7年4月から区内全域でプラスチックの分別回収が始まり、集めたプラスチックはガス化して再び製品によみがえらせる「ケミカルリサイクル」を中心に活用しています。あわせて、まだ食べられる食品を持ち寄って届ける「フードドライブ」など、食品ロスを減らす取り組みも広げています。分別・出し方は、ごみ分別アプリや「ごみ分別辞典」で手軽に調べられます。

このほか、みどりを守り育てる「グリーンプランおおた」や、大気・騒音などの公害対策も進めています。くわしくは下の関連する区の公式ページからご確認ください。`,
    policies: [
      {
        title: "ゼロカーボンシティの実現",
        body: "2050年に温室効果ガス排出量を実質ゼロにすることを表明しています。2030年度までに2013年度比で46%の削減を目指します。",
      },
      {
        title: "プラスチックの分別・リサイクル",
        body: "令和7年4月から区内全域でプラスチックの分別回収を始めました。集めたプラスチックはケミカルリサイクルを中心に再資源化しています。",
      },
      {
        title: "食品ロスの削減",
        body: "家庭で余った食品を集めるフードドライブや、外食での食べきりを呼びかける取り組みを進めています。10月の食品ロス削減月間にも取り組みます。",
      },
      {
        title: "家庭・事業者の省エネ推進",
        body: "「省エネ行動のススメ」として、かしこくエネルギーを使う工夫を呼びかけています。省エネ・再エネ設備の補助制度も用意しています。",
      },
      {
        title: "みどりの保全と公害対策",
        body: "「グリーンプランおおた」にもとづき公園や緑地を守り育てるとともに、大気・騒音などの公害対策や相談も行っています。",
      },
    ],
    numbers: [
      {
        label: "温室効果ガス削減目標（2030年度）",
        value: "2013年度比46%削減",
        note: "大田区脱炭素戦略",
      },
      {
        label: "温室効果ガス削減目標（2050年度）",
        value: "実質ゼロ",
        note: "ゼロカーボンシティ表明・環境ビジョン2050",
      },
      {
        label: "ごみ・資源の総量",
        value: "接続予定",
        note: "一般廃棄物処理基本計画（令和8〜17年度）に目標を掲載",
      },
    ],
    plans: [
      {
        name: "「省エネ行動」のススメ",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/kankyou/topics/syouene_R8.html",
        description: "家庭や事業者ができる省エネ行動と、省エネハンドブックを紹介する注目ページ。",
      },
      {
        name: "家庭から出る資源とごみ（分け方・出し方）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/gomi/shigentogomi/index.html",
        description: "プラスチック・資源・可燃・不燃ごみの分け方や出し方をまとめた案内。",
      },
      {
        name: "資源とごみの収集日",
        url: "https://www.city.ota.tokyo.jp/seikatsu/gomi/shigentogomi/gomishigen.html",
        description: "お住まいの地域ごとの資源・ごみの収集日を確認できるページ。",
      },
      {
        name: "ごみ分別辞典Webサイト",
        url: "https://www.city.ota.tokyo.jp/seikatsu/gomi/topics/gomisaku.html",
        description: "品目を検索すると、正しい分別区分や出し方がわかる便利なサイト。",
      },
      {
        name: "ごみ分別アプリ",
        url: "https://www.city.ota.tokyo.jp/seikatsu/gomi/topics/gomi-bunbetsu-apli.html",
        description: "収集日や分別方法をスマートフォンで確認できる無料アプリの案内。",
      },
      {
        name: "食品ロス削減の取り組み",
        url: "https://www.city.ota.tokyo.jp/seikatsu/gomi/foodloss/index.html",
        description: "フードドライブなど、食品ロスを減らす取り組みをまとめたページ。",
      },
      {
        name: "大田区脱炭素戦略",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/kankyou/plan/otadecarbonization.html",
        description: "2030年度までの削減目標や、脱炭素社会に向けた取組の方向性。",
      },
      {
        name: "大田区環境基本計画",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/kankyou/plan/ota_kankyou_action_plan/index.html",
        description: "区の環境施策の全体を示す計画（温暖化対策・生物多様性など）。",
      },
      {
        name: "大田区一般廃棄物処理基本計画",
        url: "https://www.city.ota.tokyo.jp/seikatsu/gomi/keikaku_jisseki/kihonkeikaku_23.html",
        description: "ごみ減量・リサイクル推進の基本方針と目標を定めた計画。",
      },
      {
        name: "補助金（省エネ・再エネ・創エネ設備）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/kankyou/kumin/assi_pay/index.html",
        description: "太陽光発電やエネファームなど、省エネ・再エネ設備の補助制度。",
      },
    ],
  },
  {
    theme_slug: "bousai",
    overview: `大田区は、首都直下地震や多摩川の氾濫・高潮などの風水害から区民の命と暮らしを守るため、「自助・共助・公助」を柱に防災・減災対策を進めています。区立の小・中学校などを避難所に指定し、ハザードマップの配布、家庭内備蓄や家具転倒防止・感震ブレーカーの普及、地域の防災訓練の支援などに取り組んでいます。

あわせて、防犯カメラの設置助成や住まいの防犯対策、自転車の安全利用の呼びかけなど、地域の安全・安心づくりも進めています。これらの取り組みは「大田区地域防災計画」や「大田区国土強靱化地域計画」にもとづいて計画的に行われています。くわしくは下の関連する区の公式ページからご確認ください。`,
    policies: [
      {
        title: "地震・水害への備えの周知",
        body: "防災ハザードマップで、地震の揺れや火災、多摩川の氾濫・高潮・土砂災害などのリスクを地域ごとに確認できます。一人ひとりの備えを後押しします。",
      },
      {
        title: "避難所・避難場所の確保と運営",
        body: "区立の小・中学校などを避難所に指定し、自治会・町会単位で割り当てています。震災時と風水害時で開設する場所が異なるため、事前の確認を呼びかけています。",
      },
      {
        title: "家庭での防災対策の支援",
        body: "感震ブレーカーの無料支給や家具転倒防止器具の支給、防災用品のあっせんなど、家庭でできる備えを後押しします。",
      },
      {
        title: "地域防災力の向上",
        body: "起震車や煙体験などの防災訓練・講話を通じて、自治会・町会や事業所の防災活動を支援し、共助の力を高めます。",
      },
      {
        title: "地域の安全（防犯・交通安全）",
        body: "防犯カメラの設置・維持の助成や住まいの防犯対策への補助を行います。あわせて自転車のヘルメット着用など交通安全の取り組みも進めます。",
      },
    ],
    numbers: [
      {
        label: "指定避難所（震災時）",
        value: "91か所",
        note: "区立小・中学校等。自治会・町会単位で割り当て",
      },
      {
        label: "風水害時の避難対象者（想定）",
        value: "最大 約50万人",
        note: "水害時緊急避難場所を89か所開設",
      },
      { label: "防災アプリの対応言語", value: "10言語", note: "避難所チェックイン機能も搭載" },
    ],
    plans: [
      {
        name: "防災・防犯（総合案内）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/index.html",
        description: "地震・風水害対策や避難所、防犯などをまとめた防災・防犯の入口ページ。",
      },
      {
        name: "大田区防災ハザードマップ",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/suigai/hazardmap.html",
        description: "地震・火災・浸水・土砂災害などのリスクと避難所を地図で確認できます。",
      },
      {
        name: "避難所・避難場所",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/hinanjyo/index.html",
        description: "震災時・風水害時の避難所や避難場所の一覧・場所を確認できます。",
      },
      {
        name: "大田区防災アプリ",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/topics/bosaiapp.html",
        description: "災害情報の通知や避難所の地図表示、チェックインができる無料アプリ。",
      },
      {
        name: "風水害対策",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/suigai/index.html",
        description: "台風や大雨に備えるための情報や、早めの避難行動の準備の案内。",
      },
      {
        name: "助成・あっせん（感震ブレーカー等）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/jyosei/index.html",
        description: "感震ブレーカーや家具転倒防止器具の支給、防災用品のあっせんの案内。",
      },
      {
        name: "訓練・講話（起震車・煙体験など）",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/kunren/kunren.html",
        description: "地域や事業所で行う防災訓練の申込みや、体験型の訓練メニューの案内。",
      },
      {
        name: "防犯対策",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/bouhan/index.html",
        description: "防犯カメラの設置助成や住まいの防犯対策など、地域の安全の情報。",
      },
      {
        name: "大田区地域防災計画［令和6年修正］",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/jishintaisaku/chiiki_bousaikeikaku/index.html",
        description: "区の地震・風水害への予防・応急・復旧対策を定めた基本計画。",
      },
      {
        name: "大田区国土強靱化地域計画",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/sougou_keikaku/kokudo_kyoujinka.html",
        description: "「強くしなやかなまち」を目指し、防災・減災を計画的に進める計画。",
      },
    ],
  },
  {
    theme_slug: "sangyo",
    overview: `大田区は、日本を代表する「ものづくりのまち」です。金属加工や精密加工などの高い技術を持つ町工場が集まり、製造業の事業所数は全国で7位、東京23区の中では最も多くなっています。羽田空港に近いという特徴を活かし、産業・観光・空港臨海部のまちづくりに力を入れ、「稼ぐ力を創出し、豊かな地域経済が未来に引き継がれるまち」を目指しています。

この目標は、令和6年3月に定められた「大田区産業振興ビジョン」（計画期間は令和6年〜令和15年）にまとめられ、「変革・集積・連携」の3つの柱で産業を応援します。あわせて、創業支援や商店街のにぎわいづくり、観光や羽田空港跡地のまちづくりも進めています。くわしくは下の関連する区の公式ページからご覧ください。`,
    policies: [
      {
        title: "ものづくり産業の集積を守り育てる",
        body: "町工場が集まる大田区の強みを次の世代につなぐため、工場の区内立地を続ける取り組みを支援します。産業振興協会が受発注のあっせん相談も行います。",
      },
      {
        title: "創業・ベンチャーの応援",
        body: "新しく事業を始める人を、創業支援施設「六郷BASE」や相談窓口で支えます。ものづくりの技術で社会課題の解決を目指す起業を後押しします。",
      },
      {
        title: "商店街のにぎわいづくり",
        body: "地域の暮らしを支える商店街に対し、イベントやPR、施設整備などの補助金を用意しています。商店街の魅力を広く伝える取り組みも応援します。",
      },
      {
        title: "観光の振興と情報発信",
        body: "町工場見学や温泉・銭湯、池上本門寺など大田区ならではの魅力を、パンフレットや観光情報コーナーで発信します。PRキャラクター「はねぴょん」も活躍しています。",
      },
      {
        title: "羽田空港跡地・臨海部のまちづくり",
        body: "羽田空港に近い立地を活かし、「羽田イノベーションシティ」など新産業の創造・発信拠点づくりを公民連携で進めます。",
      },
    ],
    numbers: [
      {
        label: "製造業の事業所数",
        value: "全国7位",
        note: "東京23区で最多（出所: ものづくりのまち大田区）",
      },
      {
        label: "産業別売上高に占める製造業の割合",
        value: "約43%",
        note: "区内で最も大きい割合",
      },
      {
        label: "区内の工場数",
        value: "接続予定",
        note: "確定値は区のものづくり産業等実態調査に掲載",
      },
    ],
    plans: [
      {
        name: "大田区産業振興ビジョン（令和6年3月策定）",
        url: "https://www.city.ota.tokyo.jp/sangyo/sangyou_suuji_jittai/vision/20240401_vision_kohyo.html",
        description: "令和6年から令和15年までの産業振興の目指す姿と方向性を示す計画。",
      },
      {
        name: "産業振興（トップページ）",
        url: "https://www.city.ota.tokyo.jp/sangyo/index.html",
        description: "工業・商業・創業など、区の産業の情報の入口ページ。",
      },
      {
        name: "ものづくりのまち大田区",
        url: "https://www.city.ota.tokyo.jp/sangyo/kogyo/monodukurinomachi.html",
        description: "大田区の町工場の強みや支援施設を紹介するページ。",
      },
      {
        name: "創業・ベンチャー支援",
        url: "https://www.city.ota.tokyo.jp/sangyo/sogyoshien/index.html",
        description: "起業を考える人向けの相談や支援施設の情報をまとめたページ。",
      },
      {
        name: "創業支援施設「六郷BASE」",
        url: "https://www.city.ota.tokyo.jp/sangyo/kogyo/sangyou_sien_shisetsu/rokugobase.html",
        description: "区が運営する創業支援のインキュベーション施設の案内。",
      },
      {
        name: "商店街支援事業のご案内",
        url: "https://www.city.ota.tokyo.jp/sangyo/syogyo_sangyo/minasamahe/ootanoakinaisienjigyounogoannai.html",
        description: "商店街のイベントやPR、施設整備を支える補助金などの案内。",
      },
      {
        name: "産業支援策（補助金・相談窓口）",
        url: "https://www.city.ota.tokyo.jp/sangyo/kuni_tokyo.html",
        description: "国・東京都・区の補助金や相談窓口を探せるページ。",
      },
      {
        name: "羽田イノベーションシティ",
        url: "https://www.city.ota.tokyo.jp/sangyo/hicity/index.html",
        description: "羽田空港跡地にできた新産業の創造・発信拠点を紹介します。",
      },
      {
        name: "観光振興（トップページ）",
        url: "https://www.city.ota.tokyo.jp/kanko/",
        description: "大田区の観光に関する情報や見どころの入口ページ。",
      },
      {
        name: "観光パンフレット",
        url: "https://www.city.ota.tokyo.jp/kanko/syoukai/travel-guide.html",
        description: "大田区を楽しむための観光パンフレットをまとめたページ。",
      },
    ],
  },
  {
    theme_slug: "chiiki",
    overview: `大田区は、住民どうしのつながりを大切にし、だれもが安心して暮らせる地域社会をめざしています。区内には218の自治会・町会があり、防災・防犯や見守り、地域のお祭りなどを通じてまちを支えています。区はこうした地域活動を「地域力」と位置づけ、区民・団体・事業者と区が力を合わせる「区民協働」を進めています。

多くの外国人が暮らすまちとして「国際都市おおた」をかかげ、やさしい日本語や多言語での案内、日本語教室などで多文化共生に取り組んでいます。あわせて、情報公開やオープンデータ、パブリックコメントなど区政の透明性を高め、区民が参画できるしくみも整えています。これらは令和6年3月に策定した「大田区基本構想」や基本計画にもとづいています。くわしくは下の関連する区の公式ページからご確認ください。`,
    policies: [
      {
        title: "自治会・町会と地域力",
        body: "区内218の自治会・町会が防災・防犯や見守り、地域行事を担っています。区は加入促進や活動支援を行い、地域のつながりを応援します。",
      },
      {
        title: "区民協働と地域力応援基金",
        body: "区民・団体・事業者と区が連携して地域課題に取り組む「協働」を進めています。寄付を原資とする地域力応援基金で公益的な区民活動を助成します。",
      },
      {
        title: "多文化共生（国際都市おおた）",
        body: "外国人区民と日本人区民が地域の一員として共に暮らせるまちをめざします。多言語の生活情報や通訳サービス、日本語教室などで支援します。",
      },
      {
        title: "情報公開とオープンデータ",
        body: "情報公開・個人情報保護の制度を整え、区政の透明性を高めています。統計や地図などのデータをオープンデータとして公開しています。",
      },
      {
        title: "区民参画と行政のデジタル化",
        body: "パブリックコメントや「区民の声」で区政に意見を届けられます。DX推進計画のもと、来庁しなくても手続きしやすいオンライン化を進めます。",
      },
    ],
    numbers: [
      { label: "自治会・町会の数", value: "218団体", note: "区内18地区に連合組織" },
      { label: "地区連合会（連合組織）", value: "区内18地区", note: "地域ごとのまとまり" },
      {
        label: "外国人住民",
        value: "接続予定",
        note: "最新の人数は区の統計・多文化共生の資料で確認予定",
      },
    ],
    plans: [
      {
        name: "大田区制80周年",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/80syunen/index.html",
        description: "令和9年（2027年）に区制80周年を迎える記念事業の紹介ページ。",
      },
      {
        name: "各種手続きのご案内",
        url: "https://www.city.ota.tokyo.jp/seikatsu/koseki_j/topics/guide.html",
        description: "引越しや戸籍などライフイベントの手続きをわかりやすく案内するページ。",
      },
      {
        name: "自治会・町会案内",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/jichikai/index.html",
        description: "区内218の自治会・町会の役割や活動、地区の連合組織を紹介。",
      },
      {
        name: "区民協働・地域力応援基金",
        url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/katsudou/index.html",
        description: "区民・団体・事業者と区が協働する取り組みや助成のしくみの案内。",
      },
      {
        name: "「国際都市おおた」多文化共生推進プラン",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kobetsu_plan/chiiki/tabunkaplan.html",
        description: "外国人区民と日本人区民が共に暮らせるまちづくりの方針を示す計画。",
      },
      {
        name: "情報公開・個人情報保護制度",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/joho/zyohokoukai_kozinzyohoseido.html",
        description: "区政の情報公開と個人情報保護のしくみや請求方法の案内。",
      },
      {
        name: "大田区オープンデータ",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/opendata/index.html",
        description: "区が保有するデータを公開し、二次利用や新サービスを促す取り組み。",
      },
      {
        name: "区民意見公募（パブリックコメント）",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/publiccomment/index.html",
        description: "計画などの案について区民が意見を届けられる、区民参画のしくみ。",
      },
      {
        name: "大田区基本構想（令和6年3月策定）",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/kihonkousou/shin_kihonkousou/ota-kihonkousou_r6.html",
        description: "将来像「心やすらぎ 未来へはばたく 笑顔のまち 大田区」を示す最上位の指針。",
      },
      {
        name: "大田区DX推進計画",
        url: "https://www.city.ota.tokyo.jp/kuseijoho/ota_plan/sougou_keikaku/joho-plan.html",
        description: "行政のデジタル化を進め、オンライン手続きを広げるための計画。",
      },
    ],
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

// theme_initiatives（具体的な取り組み）。7テーマ分。
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
  // === 福祉・健康 ===
  {
    theme_slug: "fukushi",
    title: "重層的支援体制整備事業",
    date_label: "令和5年度〜",
    body: "高齢・子育て・生活困窮などの複雑な困りごとを、複数の相談機関が連携して受けとめ、必要な支援につなぐ体制を整えています。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/fukushi/chiikikyoseisyakai.html",
    sort_order: 0,
  },
  {
    theme_slug: "fukushi",
    title: "健康診査・特定健康診査の実施",
    date_label: "令和8年度",
    body: "40歳以上の国保加入者などを対象に健診を行い、生活習慣病の早期発見と重症化予防につなげます。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/hoken/otona/080430.html",
    sort_order: 1,
  },
  // === まちづくり・住まい ===
  {
    theme_slug: "machizukuri",
    title: "新空港線（蒲蒲線）の整備",
    date_label: "整備中",
    body: "矢口渡から京急蒲田をつなぐ第一期区間の整備が進んでいます。整備主体は羽田エアポートライン、営業主体は東急電鉄で、令和20年代前半の開業を目指しています。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/koutsu/kamakamasen/shinkukosen-main.html",
    sort_order: 0,
  },
  {
    theme_slug: "machizukuri",
    title: "蒲田駅周辺のまちづくり（VRで将来像を公開）",
    date_label: "令和8年1月",
    body: "新空港線を見すえた蒲田駅周辺のプロジェクトを改定し、駅前の将来イメージをVR・動画で公開しました。だれでも将来のまちの姿を確かめられます。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/machizukuri/ekishuuhen/kamata/kamata_VR.html",
    sort_order: 1,
  },
  {
    theme_slug: "machizukuri",
    title: "たまちゃんバスのEV化",
    date_label: "令和6年5月〜",
    body: "矢口地区の交通不便を解消するコミュニティバス「たまちゃんバス」が、電動（EV）バスでの運行を始めました。環境にやさしい移動手段として運行を続けています。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/koutsu/communitybusdounyu/communitybus_shikou.html",
    sort_order: 2,
  },
  // === 環境・ごみ ===
  {
    theme_slug: "kankyo",
    title: "「省エネ行動」のススメ（省エネハンドブック2026）",
    date_label: "令和8年度",
    body: "我慢ではなく、かしこくエネルギーを使う省エネ行動を家庭・事業者に呼びかけています。家庭向けの省エネハンドブック2026版を公開しています。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/kankyou/topics/syouene_R8.html",
    sort_order: 0,
  },
  {
    theme_slug: "kankyo",
    title: "プラスチックの分別回収を区内全域で開始",
    date_label: "令和7年4月〜",
    body: "区内全域でプラスチックの分別回収を始めました。集めたプラスチックはケミカルリサイクルを中心に再資源化しています。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/gomi/shigentogomi/purasuhcikunodashikata.html",
    sort_order: 1,
  },
  {
    theme_slug: "kankyo",
    title: "フードドライブの実施",
    date_label: "実施中",
    body: "家庭で余っているまだ食べられる食品を集め、区内のこども食堂などへ届けるフードドライブを実施しています。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/gomi/foodloss/torikumi-1_foods-drive.html",
    sort_order: 2,
  },
  // === 防災・安全 ===
  {
    theme_slug: "bousai",
    title: "防災アプリに避難所チェックイン機能を搭載",
    date_label: "令和8年4月〜",
    body: "避難所受付のデジタル化として、アプリで避難所にチェックインできる機能が加わりました。災害情報の通知や避難所の地図表示も利用できます。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/topics/bosaiapp.html",
    sort_order: 0,
  },
  {
    theme_slug: "bousai",
    title: "住まいの防犯対策緊急補助金",
    date_label: "令和8年度",
    body: "防犯カメラやカメラ付きインターホンなどの購入・設置費用を補助します（費用の4分の3・上限3万円）。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/bouhan/bouhankikitouhojo.html",
    sort_order: 1,
  },
  {
    theme_slug: "bousai",
    title: "感震ブレーカー（簡易タイプ）の無料支給",
    date_label: "実施中",
    body: "大地震の揺れを感知して電気を止め、電気が原因の火災を防ぐ感震ブレーカーを無料で支給しています。",
    url: "https://www.city.ota.tokyo.jp/seikatsu/chiiki/bousai/jyosei/kannsinn.html",
    sort_order: 2,
  },
  // === 産業・観光 ===
  {
    theme_slug: "sangyo",
    title: "ものづくり産業等実態調査報告書を公表",
    date_label: "令和6年度",
    body: "区内ものづくり企業の受発注の状況や、人材不足・脱炭素などの変化を把握する調査の報告書を公表しました。",
    url: "https://www.city.ota.tokyo.jp/sangyo/sangyou_suuji_jittai/chousa_houkoku/monodukurisangyo.html",
    sort_order: 0,
  },
  {
    theme_slug: "sangyo",
    title: "創業支援施設「六郷BASE」の入居者募集",
    date_label: "令和7年度",
    body: "新しく事業を始める人向けの創業支援施設「六郷BASE」で、入居者の募集を行っています。",
    url: "https://www.city.ota.tokyo.jp/sangyo/kogyo/sangyou_sien_shisetsu/nyukyobosyu/rokugobase.html",
    sort_order: 1,
  },
  // === 地域・コミュニティ ===
  {
    theme_slug: "chiiki",
    title: "大田区制80周年に向けた記念事業",
    date_label: "令和9年（2027年）",
    body: "昭和22年の大森区・蒲田区の合併から数えて、令和9年3月15日に区制80周年を迎えます。令和8年度にさまざまな記念事業を予定しています。",
    url: "https://www.city.ota.tokyo.jp/kuseijoho/80syunen/index.html",
    sort_order: 0,
  },
  {
    theme_slug: "chiiki",
    title: "オンライン手続きの拡大",
    date_label: "令和7年度〜",
    body: "電子申請などオンラインでできる手続きを広げています。スマホやパソコンから、来庁せずに手続きしやすくしています。",
    url: "https://www.city.ota.tokyo.jp/denshishinsei/1_itiran.html",
    sort_order: 1,
  },
  {
    theme_slug: "chiiki",
    title: "多文化共生の推進（多言語対応・日本語教室）",
    date_label: "実施中",
    body: "多言語での生活情報や通訳サービス、日本語教室などにより、外国人区民の暮らしを支えています。",
    url: "https://www.city.ota.tokyo.jp/kokusaitoshi/kyousei/index.html",
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
