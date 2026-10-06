import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import AddressChangeHistory, { formatAddress } from './AddressChangeHistory.jsx';
export default function AddressChangePanel({ role, account }) {
  const [open, setOpen] = useState(false); const [refreshKey, setRefreshKey] = useState(0); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [proof, setProof] = useState(null); const [pinStatus, setPinStatus] = useState(''); const [changedPin, setChangedPin] = useState(false);
  const interactionRef = useRef(false);
  interactionRef.current = open || busy;
  const [pending, setPending] = useState(null);
  const [pendingError, setPendingError] = useState('');
  const pendingMessage = 'You already have an address change request awaiting admin review. You can submit another request after admin approves or rejects it.';
  const [form, setForm] = useState({ houseNumber: account.houseNumber || '', roadArea: account.roadArea || account.address || '', city: account.city || '', state: account.state || '', pinCode: account.pinCode || '', pickupSameAsBusiness: account.pickupSameAsBusiness !== false, pickupAddress: account.pickupAddress || '', pickupCity: account.pickupCity || '', pickupState: account.pickupState || '', pickupPinCode: account.pickupPinCode || '' });
  useEffect(() => {
    let active = true;
    const check = async () => {
      setPending(null); setPendingError('');
      try {
        const result = await api.addressChanges(role, { status: 'pending' });
        if (!active) return;
        const hasPending = result.total > 0;
        setPending(hasPending);
        if (hasPending) setOpen(false);
      } catch (error) { if (active) setPendingError(error.message); }
    };
    check();
    const onFocus = () => { if (!interactionRef.current) check(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.removeEventListener('focus', onFocus); };
  }, [role, account.id, account._id, refreshKey]);
  const toggleRequest = async () => {
    if (open) { setOpen(false); return; }
    setBusy(true); setMessage('');
    try {
      const result = await api.addressChanges(role, { status: 'pending' });
      const hasPending = result.total > 0;
      setPending(hasPending);
      setOpen(!hasPending);
    } catch (error) { setPending(null); setPendingError(error.message); }
    finally { setBusy(false); }
  };
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));
  useEffect(() => {
    if (!changedPin || !/^[1-9]\d{5}$/.test(form.pinCode)) return;
    let active = true;
    const timer = setTimeout(async () => { setPinStatus('Finding city and state…'); try { const location = await api.addressChangePincode(role, form.pinCode); if (active) { setForm(current => ({ ...current, city: location.city, state: location.state })); setPinStatus('City/district and state filled. Edit city for your locality if needed.'); } } catch (error) { if (active) setPinStatus(error.message); } }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [role, form.pinCode, changedPin]);
  const upload = async file => { if (!file || pending !== false) return; setBusy(true); setProof(null); setMessage(''); try { setProof(await api.uploadAddressProof(role, file)); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const submit = async event => { event.preventDefault(); if (pending !== false) { setMessage(pendingMessage); return; } if (!proof) { setMessage('Upload an address proof before submitting.'); return; } setBusy(true); setMessage(''); try { await api.requestAddressChange(role, { address: form, proofId: proof.id }); setPending(true); setMessage('Address change request submitted. Your current address stays in use until admin approves.'); setOpen(false); setProof(null); setRefreshKey(value => value + 1); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  return <section className="addressChangePanel contentStack"><div className="panel"><h3>Address change request</h3><p>Current business address: <strong>{formatAddress(account)}</strong></p><p>Submit your new address with proof for admin verification. Approved changes update your profile and are sent to Shiprocket.</p><button type="button" className="primaryButton" disabled={busy || pending !== false} onClick={toggleRequest}>{pending === true ? 'Request awaiting admin review' : pending === null ? 'Checking request status…' : open ? 'Cancel new request' : 'Request address change'}</button>{pending === true && <p className="notice" role="status">{pendingMessage}</p>}{pendingError && <p role="alert">Unable to check request status: {pendingError} <button type="button" className="inlineButton" onClick={() => setRefreshKey(value => value + 1)}>Retry</button></p>}{message && <p role="status">{message}</p>}
    {open && pending === false && <form className="contentStack" onSubmit={submit}><fieldset disabled={busy}><legend>New business address</legend><div className="formGrid twoColumn">{[['houseNumber', 'House no./Building/Flat'], ['roadArea', 'Road/Area/Colony'], ['city', 'City'], ['state', 'State'], ['pinCode', 'PIN code']].map(([field, label]) => <label key={field} className={['houseNumber', 'roadArea', 'pinCode'].includes(field) ? 'full' : ''}>{label}<input required value={form[field]} maxLength={field === 'pinCode' ? 6 : field === 'roadArea' ? 500 : 100} inputMode={field === 'pinCode' ? 'numeric' : undefined} pattern={field === 'pinCode' ? '[1-9][0-9]{5}' : undefined} onChange={event => { if (field === 'pinCode') { setChangedPin(true); update(field, event.target.value.replace(/\D/g, '').slice(0, 6)); } else update(field, event.target.value); }} /></label>)}{pinStatus && <small className="full" role="status">{pinStatus}</small>}</div>
    {role === 'seller' && <><label className="toggleRow"><input type="checkbox" checked={form.pickupSameAsBusiness} onChange={event => update('pickupSameAsBusiness', event.target.checked)} /><span>Pickup address is the same as new business address</span></label>{!form.pickupSameAsBusiness && <div className="formGrid twoColumn">{[['pickupAddress', 'Pickup house/building and road/area'], ['pickupCity', 'Pickup city'], ['pickupState', 'Pickup state'], ['pickupPinCode', 'Pickup PIN code']].map(([field, label]) => <label key={field}>{label}<input required value={form[field]} maxLength={field === 'pickupPinCode' ? 6 : 1000} pattern={field === 'pickupPinCode' ? '[1-9][0-9]{5}' : undefined} onChange={event => update(field, field === 'pickupPinCode' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value)} /></label>)}</div>}</>}
    <label>Address proof (PDF, JPG, PNG or WebP; up to 15 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => upload(event.target.files?.[0])} /></label>{proof && <p>Uploaded: <a href={proof.url} target="_blank" rel="noopener noreferrer">{proof.name}</a></p>}<p>The document must support the requested address{role === 'seller' && !form.pickupSameAsBusiness ? ' and separate pickup address' : ''}.</p></fieldset><button className="primaryButton" disabled={busy || !proof}>{busy ? 'Please wait…' : 'Submit for admin approval'}</button></form>}
    </div><AddressChangeHistory role={role} refreshKey={refreshKey} /></section>;
}
