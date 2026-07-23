import { createFileRoute } from "@tanstack/react-router";
import { BillContentsPage } from "../features/bills/bill-contents-page";

export const Route = createFileRoute("/bill-contents/$billId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { billId } = Route.useParams();
  return <BillContentsPage billId={billId} />;
}
