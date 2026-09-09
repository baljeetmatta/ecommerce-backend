import { ShoppingCart, IndianRupee, PackageCheck, FileText, WalletCards, Check, X, RotateCcw, ChevronRight, Share2, Heart, Gift, Bell } from "lucide-react";
import { money, sum, isReturn, topProducts, date } from "./utils.js";
import Lead from "./Lead.jsx";
import SalesChart from "./SalesChart.jsx";
import EarningsChart from "./EarningsChart.jsx";
import Empty from "./Empty.jsx";
export default function DashboardOverview({ dashboard, orders, wallet, withdrawals, products, links, navigate }) {
  const cards = [
    ["Total Orders", orders.length, ShoppingCart, "blue", "orders"],
    ["Total Sales", money(sum(orders.filter(row=>!/cancel|return|rto/i.test(row.status)), row=>row.grandTotal)), IndianRupee, "green", "performance"],
    ["My Earnings", money(dashboard?.totalEarnings), PackageCheck, "orange", "earnings"],
    ["Pending Earnings", money(dashboard?.pendingEarnings), FileText, "purple", "earnings"],
    ["Available Balance", money(wallet.balance), WalletCards, "blue", "payouts"],
    ["Delivered Orders", orders.filter(row=>row.status === "Delivered").length, Check, "green", "orders"],
    ["Cancelled Orders", orders.filter(row=>row.status === "Cancelled").length, X, "red", "orders"],
    ["Return / RTO Orders", orders.filter(isReturn).length, RotateCcw, "orange", "returns"]
  ];
  const top=topProducts(orders).slice(0,3);
  return <section className="rsOverview"><Lead title="Dashboard Overview">Your business at a glance</Lead><section className="resellerDashboardStats">{cards.map(([label,value,Icon,color,view],index)=><article className={color} key={label}><i><Icon/></i><span>{label}</span><strong>{value}</strong><button onClick={()=>navigate(view)}>{index < 4 ? "View Details" : "View"}<ChevronRight size={15}/></button></article>)}</section><div className="rsTwoColumns"><SalesChart orders={orders}/><EarningsChart wallet={wallet} dashboard={dashboard} withdrawals={withdrawals}/><article className="resellerPanel resellerRecentOrders"><header><h3>Recent Orders</h3><button onClick={()=>navigate("orders")}>View All</button></header>{orders.slice(0,3).map(order=><div key={order._id}><span className="rsOrderIcon"><ShoppingCart size={20}/></span><span><strong>{order.orderNumber}</strong><small>{date(order.createdAt)}</small></span><b className={`resellerStatus ${String(order.status).toLowerCase()}`}>{order.status}</b><em>{money(order.grandTotal)}</em></div>)}{!orders.length&&<Empty>Orders from your shared links will appear here.</Empty>}</article><article className="resellerPanel resellerTopProducts"><header><h3>Top Selling Products</h3><button onClick={()=>navigate("performance")}>View All</button></header>{top.map((row,index)=>{const product=products.find(p=>p.name===row.name);return <div key={row.name}>{product?.mainImage ? <img src={product.mainImage} alt=""/> : <span className="rsOrderIcon"><PackageCheck/></span>}<span><strong>{index+1}. {row.name}</strong><small>Sold: {row.quantity}</small></span></div>})}{!top.length&&<Empty>Your best selling products will appear after your first sale.</Empty>}</article></div><article className="resellerPanel rsQuickActions"><h3>Quick Actions</h3><div>{[["Share Product",Share2,"links"],["Add to Wishlist",Heart,"wishlist"],["My Orders",FileText,"orders"],["Withdraw Money",WalletCards,"payouts"],["Referral & Rewards",Gift,"referrals"],["Offers",Bell,"offers"]].map(([label,Icon,view])=><button key={view} onClick={()=>navigate(view)}><i><Icon/></i><span>{label}</span></button>)}</div></article><div className="resellerReferralBanner"><Gift/><div><h3>Discover your next bestseller</h3><p>Explore products and available margins to grow your earnings.</p></div><button onClick={()=>navigate("offers")}>View Offers</button></div></section>;
}
