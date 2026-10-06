import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
export const formatAddress = value => [value?.address, value?.city, value?.state, value?.pinCode].filter(Boolean).join(', ') || 'No address saved';
const date = value => value ? new Date(value).toLocaleString('en-IN') : '—';
export default function AddressChangeHistory({ role, refreshKey = 0 }) {
  const admin = role === 'admin';
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [accountRole, setAccountRole] = useState(''); const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 0 }); const [selected, setSelected] = useState(null); const [note, setNote] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true);
    const timer = setTimeout(() => { api.addressChanges(role, { search, status, role: accountRole, page }).then(result => { if (active) { setData(result); setMessage(''); } }).catch(error => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); }); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [role, search, status, accountRole, page, refreshKey, reload]);
  const action = async (decision) => {
    setBusy(true); setMessage('');
    try {
      const result = decision === 'sync' ? await api.retryAddressSync(selected._id) : await api.reviewAddressChange(selected._id, { status: decision, note });
      setSelected(result); setReload(value => value + 1);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <section className="panel addressChangeHistory">
    <h3>{admin ? 'Address change requests & history' : 'Your address change requests & history'}</h3>
    <div className="formGrid"><label>Search history<input type="search" value={search} placeholder={admin ? 'Seller/reseller ID, name, address or PIN' : 'Address, city, PIN or review note'} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All requests</option><option value="pending">Awaiting review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>{admin && <label>Account type<select value={accountRole} onChange={event => { setAccountRole(event.target.value); setPage(1); }}><option value="">Sellers & resellers</option><option value="seller">Seller</option><option value="reseller">Reseller</option></select></label>}</div>
    {message && <p role="alert">{message}</p>}
    <div className="tableWrap"><table><thead><tr>{admin && <th>Account</th>}<th>Requested</th><th>Previous address</th><th>Requested address</th><th>Review</th><th>Shiprocket</th><th>Details</th></tr></thead><tbody>{!loading && data.items.map(item => <tr key={item._id}>{admin && <td>{item.accountName}<br />{item.role} · {item.accountId}</td>}<td>{date(item.createdAt)}</td><td>{formatAddress(item.previous)}</td><td>{formatAddress(item.proposed)}</td><td>{item.status}</td><td>{item.status !== 'approved' ? 'After approval' : !item.profileAppliedAt ? 'Profile update needs attention' : item.syncStatus}</td><td><button className="inlineButton" type="button" onClick={() => { setSelected(item); setNote(''); setMessage(''); }}>View {admin && item.status === 'pending' ? '& review' : 'details'}</button></td></tr>)}{(loading || !data.items.length) && <tr><td colSpan={admin ? 7 : 6}>{loading ? 'Loading requests…' : 'No address change requests found.'}</td></tr>}</tbody></table></div>
    <div className="addressHistoryPagination"><button type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {Math.max(1, data.pages)} · {data.total} requests</span><button type="button" disabled={loading || page >= data.pages} onClick={() => setPage(value => value + 1)}>Next</button></div>
    {selected && <section className="addressChangeDetail" aria-label="Address change details"><header className="panelHeader"><h3>{selected.accountId} · {selected.status}</h3><button type="button" className="inlineButton" disabled={busy} onClick={() => setSelected(null)}>Close details</button></header>
      <div className="formGrid twoColumn"><div><strong>Previous business address</strong><p>{formatAddress(selected.previous)}</p>{selected.role === 'seller' && <p>Pickup: {selected.previous?.pickupSameAsBusiness !== false ? formatAddress(selected.previous) : [selected.previous?.pickupAddress, selected.previous?.pickupCity, selected.previous?.pickupState, selected.previous?.pickupPinCode].filter(Boolean).join(', ')}</p>}</div><div><strong>Proposed business address</strong><p>{formatAddress(selected.proposed)}</p>{selected.role === 'seller' && <p>Pickup: {selected.proposed?.pickupSameAsBusiness !== false ? formatAddress(selected.proposed) : [selected.proposed?.pickupAddress, selected.proposed?.pickupCity, selected.proposed?.pickupState, selected.proposed?.pickupPinCode].filter(Boolean).join(', ')}</p>}</div></div>
      <h4>Address proof: {selected.proof?.name}</h4><a href={selected.proof?.url} target="_blank" rel="noopener noreferrer">Open uploaded document</a>
      {selected.proof?.type === 'application/pdf' ? <iframe className="addressProofPreview" src={selected.proof.url} title="Uploaded address proof" /> : selected.proof?.url && <img className="addressProofPreview" src={selected.proof.url} alt="Uploaded address proof" />}
      <p>Requested: {date(selected.createdAt)} · Reviewed: {date(selected.reviewedAt)}{selected.reviewedBy?.name && ` by ${selected.reviewedBy.name}`}</p>{selected.reviewNote && <p>Review note: {selected.reviewNote}</p>}
      {selected.status === 'approved' && <p>Profile: {selected.profileAppliedAt ? `Updated ${date(selected.profileAppliedAt)}` : 'Update requires attention'} · Shiprocket: {selected.syncStatus}{selected.pickupAlias && ` (${selected.pickupAlias})`}</p>}{selected.syncError && <p role="alert">{selected.syncError}</p>}
      {admin && selected.status === 'pending' && <><label>Review note (required when rejecting)<textarea value={note} maxLength={1000} onChange={event => setNote(event.target.value)} /></label><p>Approval updates the profile and registers the approved pickup address in Shiprocket. Check the document and both addresses before approving.</p><div className="tableActions"><button className="primaryButton" type="button" disabled={busy} onClick={() => action('approved')}>{busy ? 'Processing…' : 'Approve address change'}</button><button className="secondaryButton" type="button" disabled={busy || !note.trim()} onClick={() => action('rejected')}>Reject request</button></div></>}
      {admin && selected.status === 'approved' && ['failed', 'not_started'].includes(selected.syncStatus) && <button type="button" className="primaryButton" disabled={busy} onClick={() => action('sync')}>{busy ? 'Retrying…' : 'Retry profile / Shiprocket sync'}</button>}
    </section>}
  </section>;
}
