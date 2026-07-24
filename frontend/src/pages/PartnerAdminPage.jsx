import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Search, X } from "lucide-react";
import { api } from "../services/api.js";
import TablePagination from "../components/TablePagination.jsx";
import DocumentPreviewModal from "../components/DocumentPreviewModal.jsx";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
const emptyPackage = { title: "", price: "", sharePercentage: "", features: "", benefits: "", isActive: true };

export default function PartnerAdminPage({ activeTab = "partners", onTabChange, onViewDetails, detailOnly = false, detailId, onBack, onDelete }) {
  const [data, setData] = useState({ partners: [], packages: [], withdrawals: [] });
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [form, setForm] = useState(emptyPackage);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [message, setMessage] = useState("");
  const [resetPasswords, setResetPasswords] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerSort, setPartnerSort] = useState("name-asc");
  const [detailsId, setDetailsIdState] = useState(detailId || null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const setDetailsId = (id) => onViewDetails ? onViewDetails(id) : setDetailsIdState(id);
  const [partnerPage, setPartnerPage] = useState(1);
  const partnerPageSize = 10;
  const [partnerTotal, setPartnerTotal] = useState(0);
  const load = async () => {
    setLoadingPartners(true);
    try {
      if (detailOnly && detailId) {
        const [partner, packages] = await Promise.all([api.adminPartner(detailId), api.adminPartnerPackages()]);
        setData((current) => ({ ...current, partners: [partner], packages }));
      } else if (activeTab === "partners") {
        const result = await api.adminPartners({ page: partnerPage, limit: partnerPageSize, q: partnerSearch });
        setData((current) => ({ ...current, partners: result.items }));
        setPartnerTotal(result.pagination.total);
      } else if (activeTab === "packages") {
        const packages = await api.adminPartnerPackages();
        setData((current) => ({ ...current, packages }));
      } else if (activeTab === "withdrawals") {
        const withdrawals = await api.adminWithdrawals();
        setData((current) => ({ ...current, withdrawals }));
      }
    } finally { setLoadingPartners(false); }
  };
  useEffect(() => { const timer = window.setTimeout(() => load().catch((error) => setMessage(error.message)), activeTab === "partners" && !detailOnly ? 250 : 0); return () => window.clearTimeout(timer); }, [activeTab, detailOnly, detailId, partnerPage, partnerPageSize, partnerSearch]);
  const act = async (action) => { try { await action(); await load(); } catch (error) { setMessage(error.message); } };
  const resetPackageForm = () => { setForm(emptyPackage); setEditingPackageId(null); };
  const editPackage = (item) => {
    setEditingPackageId(item._id);
    setForm({ ...item, features: item.features?.join("\n") || "", benefits: item.benefits?.join("\n") || "" });
  };
  const resetPassword = async (partner) => { try { const result = await api.resetPartnerPassword(partner._id); setResetPasswords((current) => ({ ...current, [partner._id]: result.password })); setVisiblePasswords((current) => ({ ...current, [partner._id]: result.password })); setMessage(`Password reset for ${partner.name}. Click the password to show or hide it.`); } catch (error) { setMessage(error.message); } };
  const togglePassword = async (partner) => { if (visiblePasswords[partner._id]) { setVisiblePasswords((current) => ({ ...current, [partner._id]: "" })); return; } try { const result = resetPasswords[partner._id] ? { password: resetPasswords[partner._id] } : await api.revealPartnerPassword(partner._id); setVisiblePasswords((current) => ({ ...current, [partner._id]: result.password })); } catch (error) { setMessage(error.message); } };
  const filteredPartners = useMemo(() => {
    const [field, direction] = partnerSort.split("-");
    const values = { id: (item) => item.registrationNumber, name: (item) => item.name, wallet: (item) => Number(item.walletBalance || 0), status: (item) => item.status };
    return data.partners.filter((partner) => `${partner.registrationNumber} ${partner.name}`.toLowerCase().includes(partnerSearch.trim().toLowerCase())).sort((a, b) => {
      const left = values[field](a); const right = values[field](b);
      const result = typeof left === "number" ? left - right : String(left || "").localeCompare(String(right || ""), undefined, { numeric: true });
      return direction === "asc" ? result : -result;
    });
  }, [data.partners, partnerSearch, partnerSort]);
  const detailsPartner = data.partners.find((partner) => partner._id === detailsId);
  const partnerPageCount = Math.max(1, Math.ceil(partnerTotal / partnerPageSize));
  const visiblePartners = filteredPartners;
  useEffect(() => { setPartnerPage(1); }, [partnerSearch, partnerSort]);
  useEffect(() => { if (partnerPage > partnerPageCount) setPartnerPage(partnerPageCount); }, [partnerPage, partnerPageCount]);

  if (detailOnly) {
    if (!detailsPartner) return <section className="panel">Loading partner details…</section>;
    const paymentComplete = ["paid", "approved"].includes(detailsPartner.registrationPayment?.status);
    return <section className="contentStack"><div className="panelHeader"><div><h2>Partner Details</h2><p className="mutedText">Review registration, payment, and KYC information.</p></div><div className="tableActions"><button className="inlineButton" type="button" onClick={onBack}>Back to partners</button>{!paymentComplete && <button className="dangerButton" type="button" onClick={() => setDeleteTarget(detailsPartner)}>Delete partner</button>}</div></div><PartnerDetails partner={detailsPartner} packages={data.packages} onClose={onBack} review={(type, payload) => act(() => api.reviewPartnerKyc(detailsPartner._id, type, payload))} approvePayment={(payload) => act(() => api.approvePartnerPayment(detailsPartner._id, payload))} changePackage={(packageId) => act(() => api.adminChangePartnerPackage(detailsPartner._id, packageId))} />{deleteTarget && <ConfirmDialog title="Delete partner?" message={`Delete ${deleteTarget.name}? This cannot be undone.`} confirmLabel="Delete partner" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await onDelete(deleteTarget._id); setDeleteTarget(null); }} />}</section>;
  }

  return <section>
    <div className="sectionTabs">{["partners", "packages", "withdrawals"].map((item) => <button key={item} className={activeTab === item ? "active" : ""} onClick={() => onTabChange?.(item)}>{item}</button>)}</div>
    {message && <div className="notice">{message}</div>}
    {activeTab === "packages" && <>
      <form className="panel formGrid twoColumn" onSubmit={(event) => { event.preventDefault(); const payload = { title: form.title, price: Number(form.price), sharePercentage: Number(form.sharePercentage), features: form.features.split("\n").map((value) => value.trim()).filter(Boolean), benefits: form.benefits.split("\n").map((value) => value.trim()).filter(Boolean), isActive: form.isActive }; act(() => editingPackageId ? api.updatePartnerPackage(editingPackageId, payload) : api.createPartnerPackage(payload)); resetPackageForm(); }}>
        <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Registration price<input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
        <label>Share percentage<input required type="number" min="0" max="100" step="0.01" value={form.sharePercentage} onChange={(e) => setForm({ ...form, sharePercentage: e.target.value })} /></label>
        <label>Features (one per line)<textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></label>
        <label>Benefits (one per line)<textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} /></label>
        <div className="packageFormActions full"><button className="primaryButton">{editingPackageId ? "Save package" : "Create package"}</button>{editingPackageId && <button className="secondaryButton" type="button" onClick={resetPackageForm}>Cancel</button>}</div>
      </form>
      <div className="panel tableWrap"><table><thead><tr><th>Package</th><th>Registration price</th><th>Share</th><th>Features</th><th>Benefits</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.packages.map((item) => <tr key={item._id}><td><strong>{item.title}</strong></td><td>{money(item.price)}</td><td>{item.sharePercentage}%</td><td>{item.features?.join(" · ") || "—"}</td><td>{item.benefits?.join(" · ") || "—"}</td><td>{item.isActive ? "Active" : "Inactive"}</td><td><div className="packageTableActions"><button type="button" onClick={() => editPackage(item)}>Edit</button><button type="button" onClick={() => act(() => api.updatePartnerPackage(item._id, { isActive: !item.isActive }))}>{item.isActive ? "Deactivate" : "Activate"}</button><button className="dangerButton" type="button" onClick={() => { if (window.confirm(`Delete ${item.title}?`)) act(() => api.deletePartnerPackage(item._id)); }}>Delete</button></div></td></tr>)}</tbody></table></div>
    </>}
    {activeTab === "partners" && <><div className="partnerTableToolbar"><label className="searchBox"><Search size={16} /><input placeholder="Search partner by ID or name" value={partnerSearch} onChange={(event) => setPartnerSearch(event.target.value)} /></label><label>Sort by <select value={partnerSort} onChange={(event) => setPartnerSort(event.target.value)}><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="id-asc">ID ascending</option><option value="id-desc">ID descending</option><option value="wallet-desc">Wallet highest</option><option value="wallet-asc">Wallet lowest</option><option value="status-asc">Status A–Z</option></select></label><span>{loadingPartners ? "Loading partners…" : `${partnerTotal} partner${partnerTotal === 1 ? "" : "s"}`}</span></div><div className="panel tableWrap"><table><thead><tr><th>ID</th><th>Partner</th><th>Package</th><th>Referred by</th><th>Wallet</th><th>Password</th><th>Status</th><th>Details</th></tr></thead><tbody>{loadingPartners ? <tr><td colSpan="8"><div className="tableLoadingState"><span className="storefrontLoadingSpinner" aria-hidden="true" />Loading partners…</div></td></tr> : <>{visiblePartners.map((partner) => <tr key={partner._id}><td>{partner.registrationNumber}</td><td><strong>{partner.name}</strong><br />{partner.email}<br />{partner.mobile}</td><td>{partner.package?.title || "—"}<br />{partner.package?.sharePercentage || 0}% share</td><td>{partner.referredBy ? <>{partner.referredBy.name}<br />ID {partner.referredBy.registrationNumber}</> : "Admin"}</td><td>{money(partner.walletBalance)}</td><td><button className="passwordReveal" type="button" onClick={() => togglePassword(partner)}>{visiblePasswords[partner._id] ? <><strong className="temporaryPassword">{visiblePasswords[partner._id]}</strong><EyeOff size={15} /></> : <><span>Protected</span><Eye size={15} /></>}</button><br /><button type="button" onClick={() => resetPassword(partner)}>Reset password</button></td><td>{partner.status}</td><td><button className="detailsButton" type="button" title="View partner details" onClick={() => setDetailsId(partner._id)}><Eye size={18} /></button></td></tr>)}{!filteredPartners.length && <tr><td colSpan="8">No partners match this search.</td></tr>}</>}</tbody></table>{!loadingPartners && <TablePagination total={partnerTotal} page={partnerPage} pageSize={partnerPageSize} pageSizes={[10]} onPageChange={setPartnerPage} onPageSizeChange={() => {}} />}</div></>}
    {activeTab === "withdrawals" && <div className="panel tableWrap"><table><thead><tr><th>Partner</th><th>Bank</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.withdrawals.map((item) => <tr key={item._id}><td>{item.partner?.name}<br />{item.partner?.email}</td><td>{item.bankSnapshot?.bankName}<br />{item.bankSnapshot?.accountNumber} · {item.bankSnapshot?.ifsc}</td><td>{money(item.amount)}</td><td>{item.status}</td><td>{item.status === "pending" && <><button onClick={() => act(() => api.processWithdrawal(item._id, { status: "approved" }))}>Approve</button><button onClick={() => act(() => api.processWithdrawal(item._id, { status: "rejected", adminNote: "Rejected by administrator" }))}>Reject & refund</button></>}{item.status === "approved" && <button onClick={() => act(() => api.processWithdrawal(item._id, { status: "paid" }))}>Mark paid</button>}</td></tr>)}</tbody></table></div>}
    {detailsPartner && <PartnerDetails partner={detailsPartner} packages={data.packages} onClose={() => setDetailsId(null)} review={(type, payload) => act(() => api.reviewPartnerKyc(detailsPartner._id, type, payload))} approvePayment={(payload) => act(() => api.approvePartnerPayment(detailsPartner._id, payload))} changePackage={(packageId) => act(() => api.adminChangePartnerPackage(detailsPartner._id, packageId))} />}
  </section>;
}

function PartnerDetails({ partner, packages, onClose, review, approvePayment, changePackage }) {
  const [previewDocument, setPreviewDocument] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ reference: "", note: "" });
  const [selectedPackage, setSelectedPackage] = useState(partner.package?._id || "");
  const [busyAction, setBusyAction] = useState("");
  const [rejectType, setRejectType] = useState("");
  const documents = [["aadhar", "Aadhar Card"], ["pan", "PAN Card"], ["cancelledCheque", "Cancelled Cheque"]];
  const payment = partner.registrationPayment || {};
  const paid = ["paid", "approved"].includes(payment.status);
  const run = async (key, action) => { setBusyAction(key); try { await action(); } finally { setBusyAction(""); } };
  return <section className="panel partnerDetailPage"><header><div><h2>{partner.name}</h2><p>Partner ID {partner.registrationNumber}</p></div><button className="detailsButton" type="button" onClick={onClose}><X size={20} /> Close details</button></header><div className="partnerDetailColumns"><dl className="partnerDetailsGrid"><dt>Father name</dt><dd>{partner.fatherName}</dd><dt>Gender</dt><dd>{partner.gender}</dd><dt>Email</dt><dd>{partner.email}</dd><dt>Mobile</dt><dd>{partner.mobile}</dd><dt>Address</dt><dd>{[partner.address?.line, partner.address?.city, partner.address?.state, partner.address?.postalCode].filter(Boolean).join(", ") || "—"}</dd><dt>Package</dt><dd>{partner.package?.title || "—"}</dd><dt>Wallet</dt><dd>{money(partner.walletBalance)}</dd></dl><section className={`partnerAdminPayment ${paid ? "paid" : "pending"}`}><h3>{paid ? "Payment received" : "Pending partner payment"}</h3>{paid ? <dl><dt>Payment method</dt><dd>{payment.provider === "admin" ? "Admin-approved offline payment" : payment.provider === "payu" ? "PayU" : "Razorpay"}</dd><dt>Package</dt><dd>{partner.package?.title || "—"}</dd><dt>Amount</dt><dd>{money(payment.amount)}</dd><dt>{payment.provider === "admin" ? "Offline payment reference" : payment.provider === "payu" ? "PayU transaction" : "Razorpay receipt"}</dt><dd>{payment.adminReference || payment.paymentId || "—"}</dd><dt>Date</dt><dd>{payment.paidAt ? new Date(payment.paidAt).toLocaleString("en-IN") : "—"}</dd>{payment.adminNote && <><dt>Note</dt><dd>{payment.adminNote}</dd></>}</dl> : <form onSubmit={(event) => { event.preventDefault(); run("payment", () => approvePayment(paymentForm)); }}><label>Selected package<select value={selectedPackage} onChange={(event) => setSelectedPackage(event.target.value)}>{packages.filter((item) => item.isActive || item._id === partner.package?._id).map((item) => <option key={item._id} value={item._id}>{item.title} · {money(item.price)}</option>)}</select></label><button className="secondaryButton" type="button" disabled={busyAction || selectedPackage === partner.package?._id} onClick={() => run("package", () => changePackage(selectedPackage))}>{busyAction === "package" ? "Changing…" : "Change package"}</button><p>Current package: <strong>{partner.package?.title}</strong> · {money(partner.package?.price)}</p><label>Offline payment reference<input required value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} /></label><label>Note<textarea value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} /></label><button className="primaryButton" disabled={Boolean(busyAction)}>{busyAction === "payment" ? "Waiting…" : "Approve payment"}</button></form>}</section></div><h3>KYC documents</h3><div className="kycDetailsList">{documents.map(([type, label]) => { const doc = partner.kyc?.[type] || {}; const files = Object.entries(doc).filter(([key, value]) => ["front", "back", "file"].includes(key) && value); return <article key={type}><div><strong>{label}</strong><span className={`status ${doc.status || "not_submitted"}`}>{(doc.status || "not submitted").replace("_", " ")}</span></div>{files.length ? <div className="adminDocumentPreviews">{files.map(([key, value]) => { const pdf = String(value).startsWith("data:application/pdf") || /\.pdf(?:$|\?)/i.test(String(value)); return <button type="button" key={key} onClick={() => setPreviewDocument({ url: value, title: `${label} — ${key}` })}>{pdf ? <span>PDF</span> : <img src={value} alt={`${label} ${key}`} />}<small>View {key}</small></button>; })}</div> : <p>No document submitted.</p>}{doc.rejectionReason && <p className="errorText">Rejection reason: {doc.rejectionReason}</p>}{doc.reviewHistory?.length > 0 && <div className="kycReviewHistory"><strong>Review history</strong>{[...doc.reviewHistory].reverse().map((entry, index) => <p key={`${entry.reviewedAt}-${index}`}><span className={`status ${entry.status}`}>{entry.status}</span> {entry.reason || "Document approved"} · {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString("en-IN") : "—"}</p>)}</div>}{doc.status === "pending" && <div className="kycActions"><button className="primaryButton" type="button" disabled={Boolean(busyAction)} onClick={() => run(`approve-${type}`, () => review(type, { status: "approved" }))}>{busyAction === `approve-${type}` ? "Waiting…" : "Approve"}</button><button className="secondaryButton" type="button" disabled={Boolean(busyAction)} onClick={() => setRejectType(type)}>Reject with reason</button></div>}</article>; })}</div>{previewDocument && <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />}{rejectType && <RejectDialog title={`Reject ${documents.find(([type]) => type === rejectType)?.[1]}`} onCancel={() => setRejectType("")} onConfirm={(reason) => run(`reject-${rejectType}`, async () => { await review(rejectType, { status: "rejected", rejectionReason: reason }); setRejectType(""); })} busy={busyAction === `reject-${rejectType}`} />}</section>;
}

function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }) { const [busy, setBusy] = useState(false); return <div className="partnerDetailsOverlay"><section className="partnerDetailsDialog compactDialog" role="dialog" aria-modal="true"><h2>{title}</h2><p>{message}</p><div className="kycActions"><button className="secondaryButton" type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="dangerButton" type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{busy ? "Deleting…" : confirmLabel}</button></div></section></div>; }
function RejectDialog({ title, onCancel, onConfirm, busy }) { const [reason, setReason] = useState(""); return <div className="partnerDetailsOverlay"><form className="partnerDetailsDialog compactDialog" role="dialog" aria-modal="true" onSubmit={(event) => { event.preventDefault(); onConfirm(reason.trim()); }}><h2>{title}</h2><p>The rejection date is recorded automatically and the partner will see this reason in their document history.</p><label>Rejection reason<textarea autoFocus required rows="4" value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="kycActions"><button className="secondaryButton" type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="dangerButton" disabled={busy || !reason.trim()}>{busy ? "Waiting…" : "Reject document"}</button></div></form></div>; }
