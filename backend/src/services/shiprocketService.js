const apiBase = "https://apiv2.shiprocket.in/v1/external";

export const shiprocketToken = async (settings) => {
  const response = await fetch(`${apiBase}/auth/login`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ email: settings.email, password: settings.password }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) throw new Error([401, 403].includes(response.status) ? "ShipRocket rejected the API credentials. In ShipRocket, create or enable a dedicated API user under Settings → API, then save those credentials in Admin ShipRocket Settings." : data.message || "ShipRocket authentication failed");
  return data.token;
};

export const getShiprocketRate = async ({ settings, pickupPostcode, deliveryPostcode, weight, cod = false, authToken }) => {
  if (!/^\d{6}$/.test(String(pickupPostcode || ""))) throw new Error("The seller does not have a valid 6-digit pickup pincode");
  const token = authToken || await shiprocketToken(settings);
  const params = new URLSearchParams({ pickup_postcode: pickupPostcode, delivery_postcode: deliveryPostcode, weight: String(Math.max(0.01, weight)), cod: cod ? "1" : "0" });
  const response = await fetch(`${apiBase}/courier/serviceability/?${params}`, { headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 403 ? "Shiprocket API access is forbidden. Generate a dedicated API user in Shiprocket Settings → API and save those credentials in admin settings." : data.message || `Unable to calculate Shiprocket shipping (${response.status})`);
  const couriers = data.data?.available_courier_companies || [];
  const preferred = settings.preferredCourierId && couriers.find((item) => String(item.courier_company_id) === String(settings.preferredCourierId));
  const courier = preferred || [...couriers].sort((a, b) => Number(a.rate) - Number(b.rate))[0];
  if (!courier) throw new Error("No Shiprocket courier is available for this pincode");
  return { amount: Math.round(Number(courier.rate) * 100) / 100, pickupPostcode, courierId: courier.courier_company_id, courierName: courier.courier_name, estimatedDays: courier.estimated_delivery_days, etd: courier.etd };
};

export const generateShiprocketDocuments = async ({ token, shipmentId }) => {
  if (!shipmentId) throw new Error("ShipRocket did not return a shipment ID");
  const requestDocument = async (path, key) => {
    const response = await fetch(`${apiBase}/${path}`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shipment_id: [Number(shipmentId)] }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `ShipRocket could not generate the ${key}`);
    return data[key] || data.data?.[key] || "";
  };
  const labelUrl = await requestDocument("courier/generate/label", "label_url");
  if (!labelUrl) throw new Error("ShipRocket generated the shipment but did not return a packaging label");
  let manifestUrl = "";
  try { manifestUrl = await requestDocument("manifests/generate", "manifest_url"); } catch (_error) { /* A manifest may require pickup scheduling; the label remains printable. */ }
  return { labelUrl, manifestUrl };
};

export const createShiprocketReturnShipment = async ({ settings, order, item, seller }) => {
  const token = await shiprocketToken(settings);
  const address = order.address || {};
  const destination = seller || {};
  const response = await fetch(`${apiBase}/orders/create/return`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      order_id: `${order.orderNumber}-RETURN-${String(item.product?._id || item.product).slice(-6)}`,
      order_date: new Date().toISOString().slice(0, 10),
      pickup_customer_name: address.name || order.customer?.name || "Customer",
      pickup_address: address.shippingAddress || address.billingAddress,
      pickup_city: address.city || address.billingCity,
      pickup_state: address.state || address.billingState,
      pickup_pincode: address.postalCode || address.billingPostalCode,
      pickup_email: address.email || order.customer?.email,
      pickup_phone: address.phone,
      shipping_customer_name: destination.companyName || "Returns Department",
      shipping_address: destination.pickupSameAsBusiness === false ? destination.pickupAddress : destination.address,
      shipping_city: destination.pickupSameAsBusiness === false ? destination.pickupCity : destination.city,
      shipping_state: destination.pickupSameAsBusiness === false ? destination.pickupState : destination.state,
      shipping_pincode: destination.pickupSameAsBusiness === false ? destination.pickupPinCode : destination.pinCode,
      shipping_email: destination.email,
      shipping_phone: destination.mobile,
      order_items: [{ name: item.name, sku: item.sku, units: item.quantity, selling_price: item.price }],
      payment_method: "PREPAID",
      sub_total: Number(item.price) * Number(item.quantity),
      weight: Math.max(0.1, Number(order.shipping?.weightTotal || 0.5))
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "ShipRocket could not create the return shipment");
  const shipmentId = data.shipment_id || data.response?.shipment_id;
  let awbCode = data.awb_code || data.response?.awb_code || "";
  let courierName = data.courier_name || data.response?.courier_name || "";
  if (!awbCode && shipmentId) {
    const awbResponse = await fetch(`${apiBase}/courier/assign/awb`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shipment_id: Number(shipmentId), ...(settings.preferredCourierId ? { courier_id: Number(settings.preferredCourierId) } : {}) }) });
    const awbData = await awbResponse.json().catch(() => ({}));
    if (!awbResponse.ok) throw new Error(awbData.message || "ShipRocket could not assign a return AWB");
    awbCode = awbData.awb_code || awbData.response?.data?.awb_code || "";
    courierName = awbData.courier_name || awbData.response?.data?.courier_name || courierName;
  }
  if (!shipmentId || !awbCode) throw new Error("ShipRocket did not return a shipment ID and AWB for this return");
  const documents = await generateShiprocketDocuments({ token, shipmentId });
  return { shiprocketOrderId: String(data.order_id || data.response?.order_id || ""), shipmentId: String(shipmentId), awbCode, courierName, trackingUrl: `https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}`, labelUrl: documents.labelUrl, createdAt: new Date() };
};
