import ShipRocketSetting from "../models/ShipRocketSetting.js";
import { sellerPickupDetails, shiprocketPhone, shiprocketToken } from "./shiprocketService.js";
import { shiprocketRequest } from "./shiprocketTrackingService.js";

const normalize = value => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
export const pickupMatches = (location, pickup) => Boolean(location.pickup_location) && location.is_active !== 0 && location.is_active !== false && location.is_active !== "0" &&
  [["address", "address"], ["city", "city"], ["state", "state"], ["pin_code", "pinCode"]].every(([remote, local]) => normalize(location[remote]) === normalize(pickup[local]));

export const ensureSellerPickup = async (seller, token) => {
  const { pickup, alias } = sellerPickupDetails(seller);
  if (![pickup.address, pickup.city, pickup.state].every(value => String(value || "").trim()) || !/^\d{6}$/.test(String(pickup.pinCode || "")) || !/^\d{10}$/.test(shiprocketPhone(seller.mobile))) throw new Error("Complete the seller pickup address, 6-digit PIN code and mobile number before verification");
  const findExisting = async () => {
    const locations = await shiprocketRequest(token, "settings/company/pickup");
    return (locations.data?.shipping_address || locations.shipping_address || []).find(location => pickupMatches(location, pickup));
  };
  const existing = await findExisting();
  if (existing) return { pickup, alias: existing.pickup_location };
  try {
    const result = await shiprocketRequest(token, "settings/company/addpickup", { pickup_location: alias, name: seller.name || seller.companyName, email: seller.email, phone: shiprocketPhone(seller.mobile), address: pickup.address, city: pickup.city, state: pickup.state, country: "India", pin_code: String(pickup.pinCode) });
    if (result.success === false || result.status === false) throw new Error(result.message || "ShipRocket could not register the pickup address");
  } catch (error) {
    // Another approval/dispatch may have registered this address concurrently.
    const concurrent = await findExisting();
    if (concurrent) return { pickup, alias: concurrent.pickup_location };
    throw error;
  }
  return { pickup, alias };
};

export const registerVerifiedSellerPickup = async seller => {
  if (seller.approvalStatus !== "approved") return;
  const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true });
  if (!settings) return;
  await ensureSellerPickup(seller, await shiprocketToken(settings));
};
