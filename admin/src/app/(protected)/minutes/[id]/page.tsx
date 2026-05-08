import { MinuteDetailPage } from "@/features/minutes/server/components/minute-detail-page";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <MinuteDetailPage id={id} />;
}
