import { AssistanceDetail } from "../../../../components/assistance/request-detail";

export default async function BuyerAssistancePage({ params, searchParams }: PageProps<"/buyer/transactions/[reference]">) {
  const { reference } = await params;
  const { notice } = await searchParams;
  return <AssistanceDetail role="Buyer" reference={reference} notice={notice} />;
}
