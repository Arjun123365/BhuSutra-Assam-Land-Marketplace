import { AssistanceList } from "../../../components/assistance/request-list";
import { requireAssistanceActor } from "../../../lib/assistance-session";
import { listAssistance } from "../../../lib/assistance-store";

export default async function SellerTransactionsPage() {
  const actor = await requireAssistanceActor("Seller");
  return (
    <>
      <div className="seller-heading"><div><h1>Seller transaction assistance</h1><p>Review demonstration requests associated with your listings.</p></div></div>
      <AssistanceList role="Seller" requests={listAssistance(actor)} />
    </>
  );
}
