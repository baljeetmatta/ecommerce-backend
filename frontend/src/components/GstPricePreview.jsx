const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

export default function GstPricePreview({ price, offerPrice, taxCategory, priceIncludesTax = true }) {
  const entered = Math.max(0, Number(offerPrice === "" || offerPrice === undefined || offerPrice === null ? price : offerPrice) || 0);
  const rate = Math.max(0, Number(taxCategory?.rate) || 0);
  const effectivePrice = Math.floor(priceIncludesTax || !rate ? entered : entered * (1 + rate / 100));
  const excludingGst = !rate ? effectivePrice : priceIncludesTax ? effectivePrice / (1 + rate / 100) : entered;
  const gstAmount = Math.max(0, effectivePrice - excludingGst);
  return <div className="gstPricePreview"><span>GST pricing preview {rate > 0 ? `(${rate}%)` : "(no GST)"}</span><div><small>Customer price including GST</small><strong>{money(effectivePrice)}</strong></div><div><small>Product value excluding GST</small><strong>{money(excludingGst)}</strong></div><div><small>GST collected</small><strong>{money(gstAmount)}</strong></div><p>Customer price is rounded down to the nearest rupee.</p></div>;
}
