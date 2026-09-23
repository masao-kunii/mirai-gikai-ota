import { createFileRoute } from "@tanstack/react-router";
import { SessionDetailPage } from "../features/interview-sessions/session-detail-page";

export const Route = createFileRoute("/interview-session/$sessionId")({
  component: InterviewSessionDetail,
});

function InterviewSessionDetail() {
  const { sessionId } = Route.useParams();
  return <SessionDetailPage sessionId={sessionId} />;
}
