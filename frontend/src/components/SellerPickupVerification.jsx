import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const pickupValues = (seller) => seller.pickupSameAsBusiness !== false
  ? [seller.address, seller.city, seller.state, seller.pinCode, seller.mobile]
  : [seller.pickupAddress, seller.pickupCity, seller.pickupState, seller.pickupPinCode, seller.mobile];
const signature = (seller) => JSON.stringify(pickupValues(seller).map((value) => String(value || '').trim()));

export default function SellerPickupVerification({ seller, draft }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const approved = seller.approvalStatus === 'approved';
  const isShiprocketSeller = seller.shippingMode === 'shiprocket';
  const savedAddress = signature(seller);
  const changed = draft && signature(draft) !== savedAddress;
  useEffect(() => {
    let current = true;
    setResult(null);
    setError('');
    if (!approved || !isShiprocketSeller) return undefined;
    setBusy(true);
    api.sellerPickupVerification().then((value) => { if (current) setResult(value); }).catch((failure) => { if (current) setError(failure.message); }).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [approved, isShiprocketSeller, savedAddress, seller.id, seller._id]);
  const check = async () => {
    setBusy(true); setError('');
    try { setResult(await api.sellerPickupVerification(result?.registered === false)); }
    catch (failure) { setResult(null); setError(failure.message); }
    finally { setBusy(false); }
  };
  const verified = !changed && result?.status === 'verified';
  if (!isShiprocketSeller || !approved || verified) return null;
  return <section className="panel sellerPickupVerification" aria-label="Pickup address verification">
    <div className="panelHeader"><h3>Shiprocket pickup verification</h3><span className={`status ${verified ? 'approved' : 'pending'}`}>{verified ? 'Verified' : 'Unverified'}</span></div>
    <p>{pickupValues(seller).slice(0, 4).filter(Boolean).join(', ')}</p>
    <p>{changed ? 'Save your address changes before checking verification.' : !approved ? 'Pickup verification becomes available after seller account approval.' : result?.message || 'Check the saved pickup address’s verification status with Shiprocket.'}</p>
    {error && <p className="errorText" role="alert">{error}</p>}
    <button className="secondaryButton" type="button" disabled={busy || changed || !approved} onClick={check}>{busy ? 'Checking Shiprocket…' : result?.registered === false ? 'Register & verify pickup address' : 'Verify pickup address'}</button>
    {result?.checkedAt && !changed && <p><small>Last checked: {new Date(result.checkedAt).toLocaleString('en-IN')}</small></p>}
  </section>;
}
