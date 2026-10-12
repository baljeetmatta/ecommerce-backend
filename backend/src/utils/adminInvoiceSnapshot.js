// Legacy admin invoices can recover an omitted breakdown from their product's
// configured category. The paid line price and grand total remain unchanged.
export const adminInvoiceSnapshot = order => {
  const snapshot = order.toObject ? order.toObject() : {...order};
  let recovered = false;
  if (!snapshot.items) return snapshot;
  snapshot.items = snapshot.items.map(item => {
    if (item.seller || Number(item.gstRate)>0) return {...item};
    const rate = Number(item.product?.taxCategory?.rate || 0);
    if (!(rate>0)) return {...item};
    const price = Number(item.price || 0);
    const taxableValue = Math.round(price / (1+rate/100)*100)/100;
    recovered = true;
    return {...item,gstRate:rate,taxableValue,gstAmount:Math.round((price-taxableValue)*100)/100,priceIncludesTax:true};
  });
  if (recovered) {
    snapshot.taxTotal = Math.round(snapshot.items.reduce((sum,item)=>sum+Number(item.gstAmount || 0)*Number(item.quantity || 0),0)*100)/100;
    snapshot.subtotal = Math.round(snapshot.items.reduce((sum,item)=>sum+(Number(item.taxableValue)>0 ? Number(item.taxableValue) : Number(item.price || 0)-Number(item.gstAmount || 0))*Number(item.quantity || 0),0)*100)/100;
  }
  return snapshot;
};
