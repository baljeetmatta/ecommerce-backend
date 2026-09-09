import { useState } from "react";
import { readSaved, money, date } from "./utils.js";
import { showToast } from "../../utils/toast.js";
import { Bell, ChevronRight } from "lucide-react";
import Lead from "./Lead.jsx";
import Empty from "./Empty.jsx";
export default function ResellerNotifications({ account, orders, withdrawals, navigate }) {
  const [notice,setNotice]=useState("");
  const [read,setRead]=useState(()=>readSaved(`reseller:${account._id}:read`,[]));
    const rows=[...orders.map(row=>({id:`order-${row._id}-${row.status}`,title:`${row.orderNumber} · ${row.status}`,description:`Order value ${money(row.grandTotal)}`,date:row.updatedAt||row.createdAt,target:"orders"})),...withdrawals.map(row=>({id:`withdrawal-${row._id}-${row.status}`,title:`Withdrawal ${row.status}`,description:money(row.amount),date:row.updatedAt||row.createdAt,target:"payouts"}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
    return <><Lead title="Notifications">Order and payment activity from your account.</Lead><button className="resellerPrimary" onClick={()=>{const ids=rows.map(row=>row.id);setRead(ids);try{localStorage.setItem(`reseller:${account._id}:read`,JSON.stringify(ids));showToast("Notifications marked as read.")}catch{setNotice("Read status could not be saved in this browser.")}}}>Mark all as read</button>{notice&&<p role="status">{notice}</p>}<section className="resellerPanel rsSection">{rows.map(row=><button className={`rsNotification ${Array.isArray(read)&&read.includes(row.id)?"read":""}`} key={row.id} onClick={()=>navigate(row.target)}><Bell/><span><strong>{row.title}</strong><small>{row.description} · {date(row.date)}</small></span><ChevronRight/></button>)}{!rows.length&&<Empty>You’re all caught up. Order and withdrawal updates will appear here.</Empty>}</section></>;
}
