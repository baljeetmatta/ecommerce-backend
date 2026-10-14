import { shiprocketRequest } from './shiprocketTrackingService.js';

export async function resolveAdminPickup(_settings, token) {
  const result = await shiprocketRequest(token, 'settings/company/pickup');
  const locations = (result.data?.shipping_address || result.shipping_address || []).filter(location =>
    location.pickup_location && ![0,'0',false].includes(location.is_active));
  const location = locations.find(entry => [true,1,'1'].includes(entry.is_default) && [true,1,'1'].includes(entry.phone_verified));
  if (!location) throw new Error('Set an active primary/default pickup address in Shiprocket and complete its phone verification before shipping admin orders.');
  return {alias:location.pickup_location,pickup:{address:location.address,city:location.city,state:location.state,pinCode:String(location.pin_code)}};
}
