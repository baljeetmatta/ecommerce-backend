import { Gift } from "lucide-react";
import Lead from "./Lead.jsx";
export default function ResellerReferrals({ copy }) {
  return <><Lead title="Referral & Rewards">Invite your network to discover reselling.</Lead><section className="resellerPanel rsSection"><Gift size={36}/><h3>Grow together with HRSBasket</h3><p>Reseller referral tracking and reward payouts are not currently enabled. You can share the registration page with friends.</p><label className="rsLinkLabel">Registration link<input readOnly value={`${window.location.origin}/#/reseller/register`}/></label><button className="resellerPrimary" onClick={()=>copy(`${window.location.origin}/#/reseller/register`)}>Copy invitation link</button></section></>;
}
