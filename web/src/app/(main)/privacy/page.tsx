import type { Metadata } from "next";
import { Container } from "@/components/layouts/container";
import {
  LegalList,
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";

export const metadata: Metadata = {
  title: "プライバシーポリシー | みらい議会＠大田区",
  description: "みらい議会＠大田区のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      className="bg-transparent pt-24 md:pt-12"
      title="プライバシーポリシー"
      description="本サイト「みらい議会＠大田区」の運営者 masao-kunii（以下「運営者」といいます）における個人情報の取り扱いについてご説明します。本サイトはチームみらいが運営する公式サービスではなく、有志個人による非公式プロジェクトです。"
    >
      <Container className="space-y-8">
        <p className="text-sm text-mirai-text-muted">
          最終更新日：2026年6月18日
        </p>

        <section className="space-y-4">
          <LegalSectionTitle>1. 個人情報の定義</LegalSectionTitle>
          <LegalParagraph>
            個人情報とは、以下のような情報であって、特定の個人を識別することができるものを指します。
          </LegalParagraph>
          <LegalList
            items={[
              "氏名、年齢、性別、住所、電話番号、職業、メールアドレス",
              "個人ごとに割り当てられたIDやパスワード、その他識別可能な記号",
              "運営者の提供する本サービスであるみらい議会＠大田区におけるAIインタビュー機能（以下「AIインタビュー機能」といいます。）を通じて取得される対話ログ、音声データ、および行動履歴",
              "他の情報と容易に照合することができ、それにより特定の個人を識別できることとなるもの",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>2. 個人情報の収集方法と使用範囲</LegalSectionTitle>
          <LegalParagraph>
            個人情報をご提供いただく際には、ユーザーの同意に基づいて行うことを原則とします。また、運営者は、以下に定める目的での利用を除き、個人情報を無断で利用することはありません。
          </LegalParagraph>
          <LegalList
            items={[
              "ユーザーが利用する運営者のサービス（以下「本サービス」といいます。）の運営およびそれに伴うユーザーとのやりとり・情報提供",
              "本サービスの安全な運営に必要な不正対策",
              "本サービスの改善・新規開発",
              "区議会の議論に関する情報整理および本サイト上での発信",
              "本サービスに係る情報提供・広告配信",
              "上記の各利用目的に必要な各種調査・分析",
              "「3. 第三者への情報提供について」に定める場合における第三者への開示・提供",
            ]}
          />
          <LegalParagraph>
            なお、AIインタビュー機能を通じて運営者が取得した回答内容については、運営者は、以下の通り取り扱います。
          </LegalParagraph>
          <LegalList
            items={[
              "ユーザーが回答した内容は、本人が明示的に拒否した場合を除き、当ウェブサイトや報告書等で公開される可能性があります。",
              "統計的利用：取得したデータは、個人を特定できない統計情報に加工した上で、第三者へ公表する場合があります。",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>3. 第三者への情報提供について</LegalSectionTitle>
          <LegalParagraph>
            以下のいずれかに該当する場合を除き、個人情報を第三者に開示・提供することはありません。
          </LegalParagraph>
          <LegalList
            items={[
              "「2. 個人情報の収集方法と使用範囲」に定めるAIインタビュー機能を通じて運営者が取得した回答内容の公開",
              "利用者本人の同意がある場合",
              "統計的なデータなど、個人を特定できない状態で提供する場合",
              "法令に基づく開示請求（裁判所・警察等）があった場合",
              "不正アクセスや規約違反など、緊急の対応が必要と判断された場合",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>4. 安全管理措置</LegalSectionTitle>
          <LegalParagraph>
            個人情報の適切な管理を行うために、責任者を定め、厳正な管理体制を構築しています。AI処理に伴うデータ保管についても、最新のセキュリティ対策を講じます。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>
            5. Cookie（クッキー）・アクセス解析について
          </LegalSectionTitle>
          <LegalParagraph>
            当ウェブサイトでは、サービスの利便性向上とアクセス状況の把握のため、Google
            LLC が提供する Google アナリティクス（GA4）を利用しています。Google
            アナリティクスは Cookie
            を用いて、閲覧ページ・滞在時間・参照元・デバイス情報などの利用状況を収集します。これらは匿名で収集され、それ単体で特定の個人を識別するものではありません。
          </LegalParagraph>
          <LegalParagraph>
            収集された情報は Google
            のプライバシーポリシーに基づいて管理されます。詳細は{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Google のプライバシーポリシー
            </a>
            をご確認ください。収集を望まない場合は、ブラウザの Cookie
            設定での無効化、または{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Google アナリティクス オプトアウト アドオン
            </a>
            の利用により、計測を停止できます。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>6. 保管期間と廃棄</LegalSectionTitle>
          <LegalParagraph>
            取得した個人情報および対話ログは、本サービス運営に必要な期間に限り保管した後、適切な方法で廃棄・削除します。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>7. 改訂と通知</LegalSectionTitle>
          <LegalParagraph>
            本ポリシーは必要に応じて改訂されます。改訂内容はウェブサイトへの掲載をもって効力を生じるものとし、個別の通知は行いません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>8. お問い合わせ窓口</LegalSectionTitle>
          <LegalParagraph>
            個人情報の確認・修正・削除、またはAIインタビュー機能の回答公開に関する取り消し等のご相談は、下記までご連絡ください。
          </LegalParagraph>
          <LegalParagraph>
            お問い合わせ先は本サイトの GitHub リポジトリ（
            <a
              href="https://github.com/masao-kunii/mirai-gikai-ota"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              masao-kunii/mirai-gikai-ota
            </a>
            ）の Issues よりご連絡ください。
          </LegalParagraph>
        </section>
      </Container>
    </LegalPageLayout>
  );
}
