const apiBase = "https://apiv2.shiprocket.in/v1/external";

export const shiprocketErrorMessage = (data, fallback) => {
  const details = Object.entries(data?.errors || {}).flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).map((message) => `${field}: ${message}`));
  return details.join(" · ") || data?.message || data?.error?.message || data?.error || fallback;
};

export const shiprocketPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const dimensionCm = (product, field) => Math.max(1, (Number(product?.[field]) || 0) * (product?.dimensionUnit === "in" ? 2.54 : 1));
const weightKg = (product) => Math.max(0.1, product?.weightUnit === "g" ? Number(product.actualWeight) / 1000 : Number(product?.actualWeight) || 0);

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
  const amount = Math.round(Number(courier.rate) * 100) / 100;
  const codCharge = cod ? Math.round(Number(courier.cod_charges || courier.cod_charge || 0) * 100) / 100 : 0;
  return { amount, shippingAmount: Math.max(0, Math.round((amount - codCharge) * 100) / 100), codCharge, pickupPostcode, courierId: courier.courier_company_id, courierName: courier.courier_name, estimatedDays: courier.estimated_delivery_days, etd: courier.etd };
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
  const product = item.product || {};
  const pickupPhone = shiprocketPhone(address.phone);
  const shippingPhone = shiprocketPhone(destination.mobile);
  const pickupPincode = String(address.postalCode || address.billingPostalCode || "");
  const shippingPincode = String(destination.pickupSameAsBusiness === false ? destination.pickupPinCode : destination.pinCode || "");
  if (!/^\d{10}$/.test(pickupPhone) || !/^\d{10}$/.test(shippingPhone)) throw new Error("Customer and seller phone numbers must contain 10 digits");
  if (!/^\d{6}$/.test(pickupPincode) || !/^\d{6}$/.test(shippingPincode)) throw new Error("Customer and seller pincodes must contain 6 digits");
  if (!(Number(product.length) > 0 && Number(product.breadth) > 0 && Number(product.height) > 0 && Number(product.actualWeight) > 0)) throw new Error("The returned product is missing package dimensions or actual weight");
  const response = await fetch(`${apiBase}/orders/create/return`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      order_id: `${Date.now()}${String(product?._id || "").replace(/\D/g, "").slice(-4)}`,
      order_date: new Date().toISOString().slice(0, 10),
      pickup_customer_name: address.name || order.customer?.name || "Customer",
      pickup_address: address.shippingAddress || address.billingAddress,
      pickup_city: address.city || address.billingCity,
      pickup_state: address.state || address.billingState,
      pickup_country: "India",
      pickup_pincode: pickupPincode,
      pickup_email: address.email || order.customer?.email,
      pickup_phone: pickupPhone,
      pickup_isd_code: "91",
      shipping_customer_name: destination.companyName || "Returns Department",
      shipping_address: destination.pickupSameAsBusiness === false ? destination.pickupAddress : destination.address,
      shipping_city: destination.pickupSameAsBusiness === false ? destination.pickupCity : destination.city,
      shipping_state: destination.pickupSameAsBusiness === false ? destination.pickupState : destination.state,
      shipping_country: "India",
      shipping_pincode: shippingPincode,
      shipping_email: destination.email,
      shipping_phone: shippingPhone,
      shipping_isd_code: "91",
      order_items: [{ name: item.name, sku: item.sku, units: item.quantity, selling_price: item.price, discount: 0 }],
      payment_method: "Prepaid",
      total_discount: 0,
      sub_total: Number(item.price) * Number(item.quantity),
      length: dimensionCm(product, "length"),
      breadth: dimensionCm(product, "breadth"),
      height: dimensionCm(product, "height"),
      weight: weightKg(product) * Number(item.quantity || 1)
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(shiprocketErrorMessage(data, "ShipRocket could not create the return shipment"));
  const shipmentId = data.shipment_id || data.response?.shipment_id;
  let awbCode = data.awb_code || data.response?.awb_code || "";
  let courierName = data.courier_name || data.response?.courier_name || "";
  if (!awbCode && shipmentId) {
    const awbResponse = await fetch(`${apiBase}/courier/assign/awb`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shipment_id: Number(shipmentId), ...(settings.preferredCourierId ? { courier_id: Number(settings.preferredCourierId) } : {}) }) });
    const awbData = await awbResponse.json().catch(() => ({}));
    if (!awbResponse.ok) throw new Error(shiprocketErrorMessage(awbData, "ShipRocket could not assign a return AWB"));
    awbCode = awbData.awb_code || awbData.response?.data?.awb_code || "";
    courierName = awbData.courier_name || awbData.response?.data?.courier_name || courierName;
  }
  if (!shipmentId || !awbCode) throw new Error("ShipRocket did not return a shipment ID and AWB for this return");
  let documents = { labelUrl: "" };
  try { documents = await generateShiprocketDocuments({ token, shipmentId }); } catch (_error) { /* Return labels may not be immediately available. */ }
  return { shiprocketOrderId: String(data.order_id || data.response?.order_id || ""), shipmentId: String(shipmentId), awbCode, courierName, trackingUrl: `https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}`, labelUrl: documents.labelUrl, createdAt: new Date() };
};
