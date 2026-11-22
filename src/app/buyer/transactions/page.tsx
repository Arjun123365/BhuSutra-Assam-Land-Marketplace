import { AssistanceList } from "../../../components/assistance/request-list";
import { requireAssistanceActor } from "../../../lib/assistance-session";
import { listAssistance } from "../../../lib/assistance-store";

export default async function BuyerTransactionsPage() {
  const actor = await requireAssistanceActor("Buyer");
  return (
    <>
      <div className="seller-heading"><div><h1>Buyer transaction assistance</h1><p>Track demonstration coordination for approved marketplace listings.</p></div></div>
      <AssistanceList role="Buyer" requests={listAssistance(actor)} />
    </>
  );
}
