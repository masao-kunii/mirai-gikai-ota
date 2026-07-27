import { createFileRoute } from "@tanstack/react-router";
import { MinuteEditPage } from "../features/minutes/minute-edit-page";

export const Route = createFileRoute("/minute-edit/$minuteId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { minuteId } = Route.useParams();
  return <MinuteEditPage minuteId={minuteId} />;
}
