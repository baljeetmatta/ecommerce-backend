import ShipRocketSetting from "../models/ShipRocketSetting.js";
import { sellerPickupDetails, shiprocketPhone, shiprocketToken } from "./shiprocketService.js";
import { shiprocketRequest } from "./shiprocketTrackingService.js";

const pickupRequest = async (token, path, body) => {
  try { return await shiprocketRequest(token, path, body); }
  catch (error) {
    if ([401, 403].includes(error.statusCode) || /unauthori[sz]ed|permission/i.test(error.message)) {
      const denied = new Error("ShipRocket denied pickup-address access. In ShipRocket Settings → API, enable the pickup-address modules for the configured API user, then retry. Pickup registration was not completed.");
      denied.statusCode = error.statusCode || 403;
      throw denied;
    }
    throw error;
  }
};

const normalize = value => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
export const pickupMatches = (location, pickup) => Boolean(location.pickup_location) && location.is_active !== 0 && location.is_active !== false && location.is_active !== "0" &&
  [["address", "address"], ["city", "city"], ["state", "state"], ["pin_code", "pinCode"]].every(([remote, local]) => normalize(location[remote]) === normalize(pickup[local]));

const buildPickupRegistrationBody = (seller, pickup, alias) => ({
  pickup_location: alias,
  name: seller.name || seller.companyName,
  email: seller.email,
  phone: shiprocketPhone(seller.mobile),
  address: pickup.address,
  city: pickup.city,
  state: pickup.state,
  country: "India",
  pin_code: String(pickup.pinCode),
  phone_verified: 1
});

export const ensureSellerPickup = async (seller, token) => {
  const { pickup, alias } = sellerPickupDetails(seller);
  if (![pickup.address, pickup.city, pickup.state].every(value => String(value || "").trim()) || !/^\d{6}$/.test(String(pickup.pinCode || "")) || !/^\d{10}$/.test(shiprocketPhone(seller.mobile))) throw new Error("Complete the seller pickup address, 6-digit PIN code and mobile number before verification");
  const findExisting = async () => {
    const locations = await pickupRequest(token, "settings/company/pickup");
    return (locations.data?.shipping_address || locations.shipping_address || []).find(location => pickupMatches(location, pickup));
  };
  const existing = await findExisting();
  if (existing) {
    const samePhone = Boolean(shiprocketPhone(seller.mobile)) && shiprocketPhone(existing.phone) === shiprocketPhone(seller.mobile);
    if (samePhone && [true, 1, "1"].includes(existing.phone_verified)) return { pickup, alias: existing.pickup_location, existing: true, verified: true };
    try {
      const result = await pickupRequest(token, "settings/company/updatepickup", buildPickupRegistrationBody(seller, pickup, existing.pickup_location || alias));
      if (result.success === false || result.status === false) throw new Error(result.message || "ShipRocket could not update the pickup address");
      return { pickup, alias: existing.pickup_location || alias, existing: true, verified: true };
    } catch (error) {
      if ([401, 403].includes(error.statusCode)) throw error;
      // Another approval/dispatch may have registered this address concurrently.
      const concurrent = await findExisting();
      if (concurrent) return { pickup, alias: concurrent.pickup_location, existing: true, verified: [true, 1, "1"].includes(concurrent.phone_verified) };
      throw error;
    }
  }
  try {
    const result = await pickupRequest(token, "settings/company/addpickup", buildPickupRegistrationBody(seller, pickup, alias));
    if (result.success === false || result.status === false) throw new Error(result.message || "ShipRocket could not register the pickup address");
  } catch (error) {
    if ([401, 403].includes(error.statusCode)) throw error;
    // Another approval/dispatch may have registered this address concurrently.
    const concurrent = await findExisting();
    if (concurrent) return { pickup, alias: concurrent.pickup_location, existing: true, verified: [true, 1, "1"].includes(concurrent.phone_verified) };
    throw error;
  }
  return { pickup, alias, existing: false, verified: true };
};

export const registerVerifiedSellerPickup = async seller => {
  if (seller.approvalStatus !== "approved") return;
  const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true });
  if (!settings) return;
  await ensureSellerPickup(seller, await shiprocketToken(settings));
};

// ShipRocket exposes the pickup verification state on the registered location.
export const getSellerPickupVerification = async (seller, token) => {
  const { pickup, alias } = sellerPickupDetails(seller);
  const result = await pickupRequest(token, 'settings/company/pickup');
  const matches = (result.data?.shipping_address || result.shipping_address || []).filter((location) => pickupMatches(location, pickup));
  const samePhone = (location) => Boolean(shiprocketPhone(seller.mobile)) && shiprocketPhone(location.phone) === shiprocketPhone(seller.mobile);
  const location = matches.find((entry) => entry.pickup_location === alias && samePhone(entry)) || matches.find(samePhone) || matches[0];
  const phoneMatches = Boolean(location && samePhone(location));
  const verified = phoneMatches && [true, 1, '1'].includes(location.phone_verified);
  return {
    status: verified ? 'verified' : 'unverified',
    registered: Boolean(location),
    pickupAlias: location?.pickup_location || '',
    checkedAt: new Date().toISOString(),
    verificationMethod: 'shiprocket_pickup_phone',
    requiresShiprocketPanel: Boolean(location && !verified),
    message: verified
      ? 'Shiprocket confirms that the phone number for this pickup address is verified.'
      : !location
        ? 'This saved pickup address is not registered with Shiprocket yet. Register it to check verification.'
        : !phoneMatches
          ? 'The pickup location uses a different contact number. Ask admin to update and verify the pickup contact in Shiprocket, then check again.'
          : 'Registered with Shiprocket, but the pickup phone is unverified. Ask admin to complete verification in Shiprocket, then check again.'
  };
};
