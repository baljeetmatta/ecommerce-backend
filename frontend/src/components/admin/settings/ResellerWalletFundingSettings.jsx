import { Save } from "lucide-react";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
export default function ResellerWalletFundingSettings({ runSettingAction, onSaveStorefront, storeForm, setStoreForm, savingSettings }) {
  const rules = { minimum: 100, increment: 50, ...storeForm.walletFunding?.reseller };
  const valid = [rules.minimum, rules.increment].every((value) => Number.isSafeInteger(value) && value >= 1 && value <= 1000000);
  const update = (field, value) => setStoreForm((current) => ({ ...current, walletFunding: { ...current.walletFunding, reseller: { ...rules, [field]: value === "" ? "" : Number(value) } } }));
  const examples = valid ? Array.from({ length: 3 }, (_, index) => rules.minimum + index * rules.increment).filter((amount) => amount <= 1000000).map(money).join(", ") : "";
  return <form className="panel contentStack" onSubmit={(event) => {
    event.preventDefault();
    if (!valid) return;
    runSettingAction(() => onSaveStorefront({ walletFunding: { ...storeForm.walletFunding, reseller: rules } }), "Reseller wallet funding settings saved successfully.");
  }}>
    <div><h2>Reseller wallet funding option</h2><p className="mutedText">Set the minimum top-up and the multiples resellers can add above that minimum.</p></div>
    <div className="formGrid twoColumn">
      <label><span>Minimum amount to add (₹)</span><input type="number" required min="1" max="1000000" step="1" disabled={savingSettings} value={rules.minimum} onChange={(event) => update("minimum", event.target.value)} /><small>The smallest amount a reseller can add to their wallet.</small></label>
      <label><span>Amount multiple above minimum (₹)</span><input type="number" required min="1" max="1000000" step="1" disabled={savingSettings} value={rules.increment} onChange={(event) => update("increment", event.target.value)} /><small>Each higher top-up increases by this amount.</small></label>
    </div>
    {valid && <div className="notice"><strong>Allowed top-up amounts: </strong>{examples}{rules.minimum + 3 * rules.increment <= 1000000 ? ", and so on" : ""}. Maximum top-up: {money(1000000)}.</div>}
    <button className="primaryButton" type="submit" disabled={savingSettings || !valid}><Save size={18} />{savingSettings ? "Saving…" : "Save reseller wallet funding"}</button>
  </form>;
}
