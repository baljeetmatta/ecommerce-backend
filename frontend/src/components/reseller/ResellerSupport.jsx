
import Lead from "./Lead.jsx";
import SupportTickets from "../SupportTickets.jsx";
export default function ResellerSupport() {
  return <><Lead title="Help & Support">Get help with orders, returns, earnings or your account.</Lead><SupportTickets accountType="Customer" preserveRoute/><article className="resellerPanel rsSection"><h3>Help Center</h3>{[["When are earnings available?","Margins are credited after delivery and the order return window closes."],["How do I withdraw?","Save your bank details in My Profile, then submit a request from Wallet / Withdraw."],["How do I share a product?","Choose Set Margin, select a product, set your margin and create your selling link."],["Need help with a return?","Open Returns / RTO to find the order. Select the return category in your support ticket and include the order number in your message."]].map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</article></>;
}
