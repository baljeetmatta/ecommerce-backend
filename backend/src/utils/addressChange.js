export const addressFields = ['houseNumber', 'roadArea', 'address', 'city', 'state', 'pinCode', 'pickupSameAsBusiness', 'pickupAddress', 'pickupCity', 'pickupState', 'pickupPinCode'];
export const addressSnapshot = account => Object.fromEntries(addressFields.map(field => [field, account[field]]).filter(([, value]) => value !== undefined));
export function validateAddress(body, role) {
  const result = {};
  for (const field of ['houseNumber', 'roadArea', 'city', 'state', 'pinCode']) {
    if (typeof body?.[field] !== 'string' || !body[field].trim() || body[field].length > (field === 'roadArea' ? 500 : 100)) throw new Error('Complete house/building/flat, road/area/colony, city, state and PIN code');
    result[field] = body[field].trim();
  }
  if (!/^[1-9]\d{5}$/.test(result.pinCode)) throw new Error('Enter a valid 6-digit PIN code');
  result.address = `${result.houseNumber}, ${result.roadArea}`;
  if (role === 'seller') {
    if (body.pickupSameAsBusiness !== undefined && typeof body.pickupSameAsBusiness !== 'boolean') throw new Error('Select whether pickup is the same as business address');
    result.pickupSameAsBusiness = body.pickupSameAsBusiness !== false;
    for (const [pickup, business] of [['pickupAddress', 'address'], ['pickupCity', 'city'], ['pickupState', 'state'], ['pickupPinCode', 'pinCode']]) {
      result[pickup] = result.pickupSameAsBusiness ? result[business] : String(body[pickup] || '').trim();
      if (!result[pickup] || result[pickup].length > 1000) throw new Error('Complete the separate pickup address');
    }
    if (!/^[1-9]\d{5}$/.test(result.pickupPinCode)) throw new Error('Enter a valid pickup PIN code');
  }
  return result;
}
export const escapedSearch = value => String(value || '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
