import { Truck } from "lucide-react";
import { Save } from "lucide-react";

export default function ShipRocketSettings({ runSettingAction, onSaveShipRocket, shipForm, setShipForm, savingSettings }) {
  return (
<div className="twoColumn">
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveShipRocket(shipForm), "ShipRocket settings saved successfully."); }}>
          <div className="panelHeader"><h2>ShipRocket</h2><Truck size={18} /></div>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(shipForm.isActive)} onChange={(event) => setShipForm({ ...shipForm, isActive: event.target.checked })} /><span>Active</span></label>
          <label><span>Shiprocket API user email</span><input type="email" required value={shipForm.email || ""} onChange={(event) => setShipForm({ ...shipForm, email: event.target.value })} /><small>Use the dedicated user generated under Shiprocket Settings → API, not your normal login.</small></label>
          <label><span>Shiprocket API user password</span><input type="password" required value={shipForm.password || ""} onChange={(event) => setShipForm({ ...shipForm, password: event.target.value })} /></label>
          <label><span>Channel ID (optional)</span><input value={shipForm.channelId || ""} onChange={(event) => setShipForm({ ...shipForm, channelId: event.target.value })} /></label>
          <label><span>Preferred courier ID (optional)</span><input value={shipForm.preferredCourierId || ""} onChange={(event) => setShipForm({ ...shipForm, preferredCourierId: event.target.value })} /></label>
          <p className="mutedText">Shipping is calculated separately for each seller using the seller registration pincode as pickup and the customer delivery pincode as destination.</p>
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save ShipRocket"}</button>
        </form>
      </div>
  );
}
