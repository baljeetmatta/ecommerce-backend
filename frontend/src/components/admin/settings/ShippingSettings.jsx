import { Truck } from "lucide-react";
import { money } from "../../../utils/currency.js";
import { FileText } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Save } from "lucide-react";
import { lazy } from "react";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function ShippingSettings({ shippingRules, setShippingForm, runSettingAction, onDeleteShipping, onSaveShipping, shippingForm, updateShipping, savingSettings }) {
  return (
<div className="twoColumn">
        <div className="panel widePanel">
          <div className="panelHeader"><h2>Shipping Rules</h2><Truck size={18} /></div>
          <DataTable
            rows={shippingRules}
            columns={[
              { key: "name", label: "Rule" },
              { key: "type", label: "Type" },
              { key: "flatRate", label: "Rate", render: (row) => money(row.flatRate) },
              { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
              { key: "shiprocketEnabled", label: "ShipRocket", render: (row) => (row.shiprocketEnabled ? "Yes" : "No") },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="tableActions">
                    <button type="button" title="Edit shipping rule" onClick={() => setShippingForm(row)}><FileText size={16} /></button>
                    <button type="button" title="Delete shipping rule" onClick={() => runSettingAction(() => onDeleteShipping(row), `${row.name} shipping rule deleted successfully.`)}><Trash2 size={16} /></button>
                  </div>
                )
              }
            ]}
          />
        </div>
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveShipping(shippingForm), `${shippingForm.name} shipping rule saved successfully.`); }}>
          <div className="panelHeader"><h2>Shipping Setup</h2><Save size={18} /></div>
          <label><span>Name</span><input value={shippingForm.name || ""} onChange={(event) => updateShipping("name", event.target.value)} required /></label>
          <select value={shippingForm.type || "flat_rate"} onChange={(event) => updateShipping("type", event.target.value)}>
            <option value="flat_rate">Flat Rate</option>
            <option value="weight_based">Weight Based</option>
          </select>
          <label><span>Flat rate</span><input type="number" value={shippingForm.flatRate || 0} onChange={(event) => updateShipping("flatRate", Number(event.target.value))} /></label>
          <label><span>Free shipping above</span><input type="number" value={shippingForm.freeShippingAbove || 0} onChange={(event) => updateShipping("freeShippingAbove", Number(event.target.value))} /></label>
          <label><span>Weight bands (min-max-rate, comma separated)</span><input value={(shippingForm.weightBands || []).map((band) => `${band.minWeight}-${band.maxWeight}-${band.rate}`).join(", ")} onChange={(event) => updateShipping("weightBands", event.target.value.split(",").map((part) => { const [minWeight, maxWeight, rate] = part.trim().split("-").map(Number); return { minWeight, maxWeight, rate }; }).filter((band) => Number.isFinite(band.maxWeight) && Number.isFinite(band.rate)))} /></label>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(shippingForm.isActive)} onChange={(event) => updateShipping("isActive", event.target.checked)} /><span>Active</span></label>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(shippingForm.shiprocketEnabled)} onChange={(event) => updateShipping("shiprocketEnabled", event.target.checked)} /><span>Use ShipRocket</span></label>
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Shipping"}</button>
          <button className="inlineButton" type="button" onClick={() => setShippingForm({ name: "", type: "flat_rate", isActive: true, flatRate: 0, freeShippingAbove: 0, weightBands: [] })}>New Shipping Rule</button>
        </form>
      </div>
  );
}
