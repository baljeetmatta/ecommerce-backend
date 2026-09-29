const labels = { email: 'Email', mobile: 'Mobile number', gstNumber: 'GSTIN', sellerNumber: 'Seller ID' };
export const sellerDuplicateMessage = (fields) => {
  const names = [...new Set(fields)].map((field) => labels[field]).filter(Boolean);
  return names.length ? `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} already registered` : 'Seller registration conflicts with an existing account';
};
export const sellerDuplicateKeyMessage = (error) => sellerDuplicateMessage(Object.keys(error.keyPattern || error.keyValue || {}));
