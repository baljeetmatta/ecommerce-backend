import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import StatCard from "../components/StatCard.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

export default function AnalyticsPage({ metrics }) {
  const statusData = Object.entries(metrics.statusCounts || {}).map(([name, count]) => ({ name, count }));
  return (
    <section className="contentGrid">
      <StatCard label="Revenue" value={money(metrics.revenue)} helper="Total sales in selected period" />
      <StatCard label="E-commerce Sales" value={money(metrics.ecommerceSales)} helper="Paid product sales, excluding shipping" />
      <StatCard label="Product Profit" value={money(metrics.ecommerceProfit)} helper="Sale price minus cost price" />
      <StatCard label="Registered Partners" value={metrics.partnersCount || 0} helper="Total partner accounts" />
      <StatCard label="AOV" value={money(metrics.averageOrderValue)} helper="Average order value" />
      <StatCard label="Conversion" value={`${metrics.conversionRate}%`} helper="Storefront conversion rate" />
      <StatCard label="Orders" value={metrics.orderCount} helper={`${metrics.customersCount} customers tracked`} />
      <div className="panel wide">
        <div className="panelHeader"><h2>Order Status</h2><CheckCircle2 size={18} /></div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#1f7a6d" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="panel">
        <div className="panelHeader"><h2>Top Products</h2></div>
        {metrics.topProducts.map((product) => <div className="listRow" key={product._id}><span>{product.name}</span><strong>{product.quantity} sold</strong></div>)}
      </div>
      <div className="panel">
        <div className="panelHeader"><h2>Low Stock</h2><AlertTriangle size={18} /></div>
        {metrics.lowStockProducts.map((product) => <div className="listRow" key={product._id}><span>{product.name}</span><strong>{product.stock} left</strong></div>)}
      </div>
    </section>
  );
}
