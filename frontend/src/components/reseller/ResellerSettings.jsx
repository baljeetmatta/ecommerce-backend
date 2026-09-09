import { useState } from "react";
import { showToast } from "../../utils/toast.js";
import Lead from "./Lead.jsx";
export default function ResellerSettings({ account, navigate }) {
  const storageKey=`reseller:${account._id}:wishlist`;
  const [notice,setNotice]=useState("");
  return <><Lead title="Settings">Manage your reseller account and preferences.</Lead><section className="resellerPanel rsSection"><h3>Account</h3><p>{account.fullName} · {account.resellerId}</p><p>{account.email}</p><button className="resellerPrimary" onClick={()=>navigate("profile")}>Manage bank details</button><h3>Local preferences</h3><p>Wishlist and read notifications are saved in this browser.</p><button className="rsTextButton" onClick={()=>{try{localStorage.removeItem(storageKey);localStorage.removeItem(`reseller:${account._id}:read`);setNotice("Wishlist and notification preferences cleared.");showToast("Wishlist and notification preferences cleared.")}catch{setNotice("Could not clear browser preferences.")}}}>Clear local wishlist and read status</button>{notice&&<p role="status">{notice}</p>}</section></>;
}
