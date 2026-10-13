export const footerDefaults = {
  description: 'Shop everyday essentials and discover products from our marketplace.',
  backgroundColor: '#2b211d', accentColor: '#883c26',
  showTrustStrip: true, trustLabels: ['Secure payments', 'Easy returns', 'Delivery across India', 'Marketplace sellers', 'Customer support'],
  showNewsletter: false, newsletterTitle: 'Stay in the loop', newsletterDescription: 'Get new arrivals and offers straight to your inbox.', newsletterButton: 'Subscribe',
  socialLinks: [], appLinks: [], legalLinks: [], paymentLabels: ['UPI', 'Cards', 'COD']
};
export const defaultFooterColumns = [
  { title: 'About us', type: 'brand', text: '', links: [], pageIds: [], sortOrder: 0 },
  { title: 'Customer Care', type: 'links', sortOrder: 1, links: [
    { label: 'Contact Us', url: '/contact' },
    { label: 'Support', url: '/account?tab=support' }
  ] },
  { title: 'Sell with us', type: 'links', sortOrder: 2, links: [
    { label: 'Become a Seller', url: '/seller/register' },
    { label: 'Become a Reseller', url: '/reseller/register' },
    { label: 'Seller Login', url: '/seller' },
    { label: 'Reseller Login', url: '/reseller' },
    { label: 'Support', url: '/contact' }
  ] },
  { title: 'Account', type: 'links', sortOrder: 3, links: [
    { label: 'My Orders', url: '/account?tab=orders' },
    { label: 'Wishlist', url: '/wishlist' },
    { label: 'Account Settings', url: '/account?tab=profile' },
    { label: 'Login', url: '/account?login=1' },
    { label: 'Register', url: '/account?register=1' }
  ] },
  { title: 'Policies', type: 'links', sortOrder: 4, links: [
    { label: 'Shipping Policy', url: '/page/shipping-policy' },
    { label: 'Return Policy', url: '/page/return-policy' },
    { label: 'Privacy Policy', url: '/page/privacy-policy' },
    { label: 'Terms and Conditions', url: '/page/terms-and-conditions' }
  ] }
];

// Preserve the marketplace preset for legacy menus, including saved policy URLs.
export const resolveFooterColumns = (columns = [], settings = {}) => {
  const email = String(settings.contactDetails?.email || settings.email || '').trim();
  const phone = String(settings.contactDetails?.phone || settings.contactDetails?.mobile || settings.phone || '').trim();
  const policyColumn = columns.find(column => column.title?.trim().toLowerCase() === 'policies') || defaultFooterColumns.at(-1);
  const source = columns.some(column => column.type === 'brand') ? [...columns] : [...defaultFooterColumns.slice(0, -1), policyColumn];
  if (!source.some(column => column.title?.trim().toLowerCase() === 'policies')) source.push(policyColumn);
  const resolved = source.map(column => {
    if (column.title?.trim().toLowerCase() !== 'customer care') return column;
    const links = (column.links || []).filter(link => {
      const label = String(link.label || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
      return !['trackorder', 'returnsandrefunds', 'returnandrefunds'].includes(label) && !/^(mailto:|tel:)/i.test(link.url || '');
    });
    if (email) links.push({ label: email, url: `mailto:${email}` });
    if (phone) links.push({ label: phone, url: `tel:${phone.replace(/[^\d+]/g, '')}` });
    return { ...column, type: 'links', links };
  });
  return [...resolved].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(column => ({
    ...column, links: (column.links || []).map(link => ({ ...link })), pageIds: [...(column.pageIds || [])]
  }));
};

// Replace the previous marketplace preset while preserving custom admin colors.
export const resolveFooterDesign = (value = {}) => {
  const design = { ...footerDefaults, ...value };
  if (design.backgroundColor?.toLowerCase() === '#1c2b24') design.backgroundColor = footerDefaults.backgroundColor;
  if (design.accentColor?.toLowerCase() === '#25d366') design.accentColor = footerDefaults.accentColor;
  return design;
};
