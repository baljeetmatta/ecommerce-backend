const apiBase = "https://apiv2.shiprocket.in/v1/external";

export const shiprocketToken = async (settings) => {
  const response = await fetch(`${apiBase}/auth/login`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ email: settings.email, password: settings.password }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) throw new Error(response.status === 403 ? "Shiprocket rejected these credentials. Configure credentials generated under Shiprocket Settings → API, not the normal account login." : data.message || "Shiprocket authentication failed");
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
