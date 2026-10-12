import StorefrontSetting from '../models/StorefrontSetting.js';
import { shiprocketRequest } from './shiprocketTrackingService.js';
import { pickupMatches } from './sellerPickupService.js';

export async function resolveAdminPickup(settings, token) {
  const result = await shiprocketRequest(token, 'settings/company/pickup');
  const locations = (result.data?.shipping_address || result.shipping_address || []).filter(location =>
    location.pickup_location && ![0,'0',false].includes(location.is_active));
  let location;
  if (settings.pickupLocation) location = locations.find(entry => entry.pickup_location === settings.pickupLocation);
  else {
    const store = await StorefrontSetting.findOne({singleton:'storefront'}).select('contactDetails address');
    const details = store?.contactDetails || {};
    const pickup = {address:details.address || store?.address,city:details.city,state:details.state,pinCode:details.pincode};
    if (pickup.address && pickup.city && pickup.state && pickup.pinCode) location = locations.find(entry => pickupMatches(entry,pickup) && [true,1,'1'].includes(entry.phone_verified));
    else location = locations.find(entry => [true,1,'1'].includes(entry.is_default) && [true,1,'1'].includes(entry.phone_verified));
  }
  if (!location) throw new Error('Select the verified admin pickup location in Admin ShipRocket Settings. The location must match your registered Shiprocket warehouse.');
  if (![true,1,'1'].includes(location.phone_verified)) throw new Error('The selected admin pickup location is not verified in Shiprocket. Select the verified warehouse.');
  return {alias:location.pickup_location,pickup:{address:location.address,city:location.city,state:location.state,pinCode:String(location.pin_code)}};
}
