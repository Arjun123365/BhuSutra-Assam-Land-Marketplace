import { EnquiryActionForm } from "./buyer-forms";
import { EnquiryList as View } from "./enquiry-list-view";
export function EnquiryList(props: Parameters<typeof View>[0]) { return <View {...props} ActionForm={EnquiryActionForm} />; }
