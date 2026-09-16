import { lazy, useState } from "react";
import { Eye, KeyRound } from "lucide-react";
import { money } from "../../../utils/currency.js";
import { api } from "../../../services/api.js";

const DataTable = lazy(() => import("../../DataTable.jsx"));
const TablePagination = lazy(() => import("../../TablePagination.jsx"));

const date = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

function CustomerDetailsModal({ details, loading, message, onClose, onReload }) {
  const [tab, setTab] = useState("details");
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const customer = details?.customer;
  const orders = details?.orders || [];
  const returns = details?.returns || [];
  const payments = details?.payments || [];
  const summary = details?.summary || {};
  const tabs = [["details", "Customer detail"], ["orders", "Order history"], ["returns", "Returns"], ["payments", "Payment history"]];
  const submitPassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    if (!/^\d{4}$/.test(password)) {
      setPasswordMessage("Enter exactly 4 digits.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.setCustomerTempPassword(customer._id, password);
      setPassword("");
      setPasswordMessage("Temporary password updated.");
      onReload();
    } catch (error) {
      setPasswordMessage(error.message || "Unable to update password.");
    } finally {
      setSavingPassword(false);
    }
  };
  return <div className="modalOverlay" role="dialog" aria-modal="true"><section className="orderDetailModal customerDetailDialog">
    <div className="panelHeader"><div><span className="eyebrow">Customer CRM</span><h2>{customer?.name || "Customer details"}</h2><p>{customer?.email || message || "Loading customer profile..."}</p></div><button className="inlineButton" type="button" onClick={onClose}>Close</button></div>
    {loading ? <p className="mutedText">Loading customer details...</p> : !customer ? <p className="mutedText">{message || "Customer details could not be loaded."}</p> : <>
      <nav>{tabs.map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>
      {tab === "details" && <div className="customerDetailTab">
        <div className="resellerDetailCounts">
          <div><small>Status</small><strong>{customer.status}</strong></div>
          <div><small>Store Credit</small><strong>{money(customer.storeCredit)}</strong></div>
          <div><small>Orders</small><strong>{summary.orderCount || 0}</strong></div>
          <div><small>Returns</small><strong>{summary.returnCount || 0}</strong></div>
        </div>
        <div className="resellerAdminDetailsGrid">
          <div><small>Email</small><strong>{customer.email}</strong></div>
          <div><small>Phone</small><strong>{customer.phone || "—"}</strong></div>
          <div><small>Gender</small><strong>{customer.gender || "—"}</strong></div>
          <div><small>Joined</small><strong>{date(customer.createdAt)}</strong></div>
        </div>
        <form className="customerPasswordForm" onSubmit={submitPassword}>
          <label><span>Temporary 4-digit password</span><input inputMode="numeric" pattern="\d{4}" maxLength={4} value={password} onChange={(event) => setPassword(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" /></label>
          <button className="primaryButton" type="submit" disabled={savingPassword || password.length !== 4}><KeyRound size={16} /> {savingPassword ? "Saving..." : "Set temp password"}</button>
          {passwordMessage && <small>{passwordMessage}</small>}
        </form>
        <section className="customerAddressList"><h3>Addresses</h3>{customer.addresses?.length ? customer.addresses.map((address, index) => <article key={address._id || index}><strong>{address.label || `Address ${index + 1}`}</strong><p>{[address.line1, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(", ") || "—"}</p></article>) : <p className="mutedText">No saved addresses.</p>}</section>
      </div>}
      {tab === "orders" && <div className="tableWrap"><table><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th></tr></thead><tbody>{orders.length ? orders.map((order) => <tr key={order._id}><td><strong>{order.orderNumber}</strong><br /><small>{order.items?.length || 0} item(s)</small></td><td>{date(order.createdAt)}</td><td>{order.status}</td><td>{order.paymentStatus}</td><td>{money(order.grandTotal)}</td></tr>) : <tr><td colSpan={5}>No orders found.</td></tr>}</tbody></table></div>}
      {tab === "returns" && <div className="tableWrap"><table><thead><tr><th>Order</th><th>Product</th><th>Status</th><th>Reason</th><th>Amount</th></tr></thead><tbody>{returns.length ? returns.map((item) => <tr key={item._id}><td><strong>{item.order.orderNumber}</strong><br /><small>{date(item.requestedAt)}</small></td><td>{item.product}<br /><small>{item.sku}</small></td><td>{item.status}</td><td>{item.reason || "—"}</td><td>{money(item.amount)}</td></tr>) : <tr><td colSpan={5}>No returns found.</td></tr>}</tbody></table></div>}
      {tab === "payments" && <div className="tableWrap"><table><thead><tr><th>Order</th><th>Date</th><th>Method</th><th>Reference</th><th>Status</th><th>Amount</th></tr></thead><tbody>{payments.length ? payments.map((payment) => <tr key={payment._id}><td>{payment.orderNumber}</td><td>{date(payment.createdAt)}</td><td>{payment.methodName}</td><td>{payment.reference || "—"}</td><td>{payment.status}</td><td>{money(payment.amount)}</td></tr>) : <tr><td colSpan={6}>No payments found.</td></tr>}</tbody></table><div className="resellerDetailCounts"><div><small>Paid Value</small><strong>{money(summary.paidAmount)}</strong></div><div><small>Pending Value</small><strong>{money(summary.pendingAmount)}</strong></div></div></div>}
    </>}
  </section></div>;
}

export default function Customers({ customers, pagination, onPageChange, loading }) {
  const [details, setDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const openCustomer = async (customer) => {
    setDetails({ customer });
    setDetailMessage("");
    setDetailLoading(true);
    try {
      setDetails(await api.customer(customer._id));
    } catch (error) {
      setDetailMessage(error.message || "Customer details could not load.");
    } finally {
      setDetailLoading(false);
    }
  };
  const reloadDetails = () => details?.customer && openCustomer(details.customer);
  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>Customer Database</h2>
      </div>
      <DataTable
        rows={customers}
        loading={loading}
        loadingMessage="Loading customers..."
        paginated={false}
        columns={[
          { key: "name", label: "Name", render: (row) => <span className="adminCustomerIdentity">{row.profileImage ? <img src={row.profileImage} alt="" /> : <i>{row.name?.charAt(0)?.toUpperCase()}</i>}<strong>{row.name}</strong></span> },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> },
          { key: "storeCredit", label: "Credit", render: (row) => money(row.storeCredit) },
          { key: "actions", label: "Actions", render: (row) => <button type="button" className="inlineButton" onClick={() => openCustomer(row)}><Eye size={16} /> View</button> }
        ]}
      />
      {!loading && <TablePagination total={pagination.total} page={pagination.page} pageSize={pagination.limit} pageSizes={[10]} onPageChange={onPageChange} onPageSizeChange={() => {}} />}
      {details && <CustomerDetailsModal details={details} loading={detailLoading} message={detailMessage} onClose={() => setDetails(null)} onReload={reloadDetails} />}
    </section>
  );
}
