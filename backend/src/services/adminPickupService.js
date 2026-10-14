import { shiprocketRequest } from './shiprocketTrackingService.js';

const enabled = value => value === true || value === 1 || ['1', 'true'].includes(String(value).trim().toLowerCase());
const disabled = value => value === false || value === 0 || ['0', 'false'].includes(String(value).trim().toLowerCase());

export async function resolveAdminPickup(_settings, token) {
  const result = await shiprocketRequest(token, 'settings/company/pickup');
  const locations = (result.data?.shipping_address || result.shipping_address || []).filter(location =>
    location.pickup_location && !disabled(location.is_active));
  const primaryLocations = locations.filter(entry => enabled(entry.is_primary_location) || enabled(entry.is_primary) || enabled(entry.is_default));
  if (!primaryLocations.length) throw new Error('Shiprocket did not return an active primary/default pickup address for the configured API account. Check that the API credentials belong to the account where your primary address is configured; phone verification alone does not identify the primary address.');
  const location = primaryLocations.find(entry => enabled(entry.phone_verified));
  if (!location) throw new Error('Shiprocket reports the active primary/default pickup address phone as unverified or did not return its verification status. Complete phone verification in the account used by the configured API credentials, then retry.');
  return {alias:location.pickup_location,pickup:{address:location.address,city:location.city,state:location.state,pinCode:String(location.pin_code)}};
}
