export const openPayuModal = (checkout, pendingContext = null) => {
  if (pendingContext) sessionStorage.setItem("hrbasket_payu_pending", JSON.stringify({ ...pendingContext, txnid: checkout.fields.txnid }));
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.action;
  form.target = "_self";
  Object.entries(checkout.fields || {}).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
  return new Promise(() => {});
};

export const readPayuReturn = () => {
  const url = new URL(window.location.href);
  const txnid = url.searchParams.get("payu_txnid");
  const status = url.searchParams.get("payu_status");
  if (!txnid) return null;
  let stored = null;
  try { stored = JSON.parse(sessionStorage.getItem("hrbasket_payu_pending") || "null"); } catch { /* Keep the transaction reference available for support. */ }
  return stored?.txnid === txnid ? { ...stored, txnid, status } : { txnid, status };
};

export const clearPayuReturn = () => {
  sessionStorage.removeItem("hrbasket_payu_pending");
  const url = new URL(window.location.href);
  url.searchParams.delete("payu_txnid");
  url.searchParams.delete("payu_status");
  window.history.replaceState(window.history.state, "", url.toString());
};
