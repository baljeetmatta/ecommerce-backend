const cache = new Map();
export async function lookupPincode(pinCode, request = fetch) {
  if (!/^[1-9]\d{5}$/.test(pinCode)) throw Object.assign(new Error("Enter a valid 6-digit PIN code"), { status: 400 });
  const cached = cache.get(pinCode);
  if (cached && cached.expires > Date.now()) return cached.result;
  let response;
  try {
    response = await request(`https://api.postalpincode.in/pincode/${pinCode}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Postal service unavailable");
    const data = await response.json();
    const offices = data?.[0]?.PostOffice;
    if (data?.[0]?.Status !== "Success" || !Array.isArray(offices) || !offices.length) throw Object.assign(new Error("No location found for this PIN code. Check the PIN or enter city and state manually."), { status: 404 });
    const office = offices.find((entry) => entry.BranchType === "Head Post Office") || offices.find((entry) => entry.BranchType === "Sub Post Office") || offices[0];
    if (!office.State || !office.District) throw new Error("Incomplete postal response");
    const result = { pinCode, city: office.District, state: office.State, localities: [...new Set(offices.map((entry) => entry.Name).filter(Boolean))] };
    if (cache.size >= 1000) cache.delete(cache.keys().next().value);
    cache.set(pinCode, { result, expires: Date.now() + 86400000 });
    return result;
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error("PIN lookup is unavailable. Enter city and state manually."), { status: 502 });
  }
}
