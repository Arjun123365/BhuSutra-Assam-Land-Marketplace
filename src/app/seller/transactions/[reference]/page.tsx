import { AssistanceDetail } from "../../../../components/assistance/request-detail";

export default async function SellerAssistancePage({ params, searchParams }: PageProps<"/seller/transactions/[reference]">) {
  const { reference } = await params;
  const { notice } = await searchParams;
  return <AssistanceDetail role="Seller" reference={reference} notice={notice} />;
}
