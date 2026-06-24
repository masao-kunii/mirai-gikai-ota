import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { ComingSoonSection } from "@/components/top/coming-soon-section";
import { Hero } from "@/components/top/hero";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { BillsByTagSection } from "@/features/bills/server/components/bills-by-tag-section";
import { FeaturedBillSection } from "@/features/bills/server/components/featured-bill-section";
import { PreviousSessionSection } from "@/features/bills/server/components/previous-session-section";
import { ProposalTypeSection } from "@/features/bills/server/components/proposal-type-section";
import { getBillsByProposalType } from "@/features/bills/server/loaders/get-bills-by-proposal-type";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import type { BillWithContent } from "@/features/bills/shared/types";
import { HomeChatClient } from "@/features/chat/client/components/home-chat-client";
import { CurrentCouncilSession } from "@/features/council-sessions/client/components/current-council-session";
import { getCurrentCouncilSession } from "@/features/council-sessions/server/loaders/get-current-council-session";
import { getUpcomingCouncilSession } from "@/features/council-sessions/server/loaders/get-upcoming-council-session";
import { getJapanTime } from "@/lib/utils/date";

export default async function Home() {
  const { billsByTag, featuredBills, comingSoonBills, previousSessionData } =
    await loadHomeData();

  // ゆくゆくタグ機能がマージされたらBFFに統合する
  const now = getJapanTime();
  const [
    currentSession,
    upcomingSession,
    currentDifficulty,
    mayorBills,
    committeeBills,
    memberBills,
    reportBills,
    petitionBills,
    otherBills,
  ] = await Promise.all([
    getCurrentCouncilSession(now),
    getUpcomingCouncilSession(now),
    getDifficultyLevel(),
    getBillsByProposalType("mayor_bill"),
    getBillsByProposalType("committee_bill"),
    getBillsByProposalType("member_bill"),
    getBillsByProposalType("report"),
    getBillsByProposalType("petition"),
    getBillsByProposalType("other"),
  ]);

  const toBillChatContext = (bill: BillWithContent) => {
    return {
      name: `${bill.bill_content?.title}（${bill.name}）`,
      summary: bill.bill_content?.summary,
      tags: bill.tags?.map((tag) => tag.label) || [],
      isFeatured: featuredBills.some((b) => b.id === bill.id),
    };
  };

  return (
    <>
      <Hero />

      {/* 本日の議会セクション */}
      <CurrentCouncilSession
        session={currentSession}
        upcomingSession={upcomingSession}
      />

      {/* 議案一覧セクション */}
      <Container className="">
        <div className="py-10">
          <main className="flex flex-col gap-16">
            {/* 注目の議案セクション */}
            <FeaturedBillSection bills={featuredBills} />

            {/* タグ別議案一覧セクション */}
            <BillsByTagSection billsByTag={billsByTag} />

            {/* 区長提出議案セクション */}
            <ProposalTypeSection proposalType="mayor_bill" bills={mayorBills} />

            {/* 委員会提出議案セクション */}
            <ProposalTypeSection
              proposalType="committee_bill"
              bills={committeeBills}
            />

            {/* 議員提出議案セクション */}
            <ProposalTypeSection
              proposalType="member_bill"
              bills={memberBills}
            />

            {/* 報告セクション */}
            <ProposalTypeSection proposalType="report" bills={reportBills} />

            {/* 請願・陳情セクション */}
            <ProposalTypeSection
              proposalType="petition"
              bills={petitionBills}
            />

            {/* その他セクション */}
            <ProposalTypeSection proposalType="other" bills={otherBills} />

            {/* Coming soonセクション */}
            <ComingSoonSection bills={comingSoonBills} />
          </main>
        </div>
      </Container>

      {/* 前回の議会セクション（Archive） */}
      {previousSessionData && (
        <div className="bg-mirai-surface-muted py-10">
          <Container>
            <PreviousSessionSection
              session={previousSessionData.session}
              bills={previousSessionData.bills}
              totalBillCount={previousSessionData.totalBillCount}
            />
          </Container>
        </div>
      )}

      <Container>
        {/* みらい議会＠大田区とは セクション */}
        <About />

        {/* 免責事項 */}
        <BillDisclaimer />
      </Container>

      {/* チャット機能 */}
      <HomeChatClient
        currentDifficulty={currentDifficulty}
        bills={billsByTag
          .flatMap((x) => x.bills)
          .concat(featuredBills)
          .map(toBillChatContext)}
      />
    </>
  );
}
