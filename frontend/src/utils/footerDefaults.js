export const footerDefaults = {
  description: 'Shop everyday essentials and discover products from our marketplace.',
  backgroundColor: '#2b211d', accentColor: '#883c26',
  showTrustStrip: true, trustLabels: ['Secure payments', 'Easy returns', 'Delivery across India', 'Marketplace sellers', 'Customer support'],
  showNewsletter: true, newsletterTitle: 'Stay in the loop', newsletterDescription: 'Get new arrivals and offers straight to your inbox.', newsletterButton: 'Subscribe',
  socialLinks: [], appLinks: [], legalLinks: [], paymentLabels: ['UPI', 'Cards', 'COD']
};
export const defaultFooterColumns = [
  { title: 'About us', type: 'brand', text: '', links: [], pageIds: [], sortOrder: 0 },
  { title: 'Customer Care', type: 'links', sortOrder: 1, links: [
    { label: 'Contact Us', url: '/contact' },
    { label: 'Support', url: '/account?tab=support' },
    { label: 'Track Order', url: '/account?tab=orders' },
    { label: 'Returns & Refunds', url: '/account?tab=orders' }
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
  ] }
];

// Older menus had a separate brand column. Use the four-column layout until
// the admin saves an updated configuration that includes the brand column.
export const resolveFooterColumns = (columns = []) => {
  const source = columns.some(column => column.type === 'brand') ? columns : defaultFooterColumns;
  return [...source].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(column => ({
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
