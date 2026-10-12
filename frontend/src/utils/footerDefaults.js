export const footerDefaults = {
  description: 'Shop everyday essentials and discover products from our marketplace.',
  backgroundColor: '#2b211d', accentColor: '#883c26',
  showTrustStrip: true, trustLabels: ['Secure payments', 'Easy returns', 'Delivery across India', 'Marketplace sellers', 'Customer support'],
  showNewsletter: true, newsletterTitle: 'Stay in the loop', newsletterDescription: 'Get new arrivals and offers straight to your inbox.', newsletterButton: 'Subscribe',
  socialLinks: [], appLinks: [], legalLinks: [], paymentLabels: ['UPI', 'Cards', 'COD']
};
export const defaultFooterColumns = [
  {title:'Customer Support',type:'links',links:[{label:'Contact Us',url:'/contact'},{label:'Track Order',url:'/account'},{label:'Returns & Refunds',url:'/account'}]},
  {title:'Policies',type:'pages',pageIds:[]},
  {title:'My Account',type:'links',links:[{label:'My Orders',url:'/account'},{label:'Wishlist',url:'/wishlist'},{label:'Login / Signup',url:'/account'}]},
  {title:'Sell with us',type:'links',links:[{label:'Become a Seller',url:'/seller/register'},{label:'Seller Dashboard',url:'/seller'},{label:'Become a Reseller',url:'/reseller/register'}]}
];

// Replace the previous marketplace preset while preserving custom admin colors.
export const resolveFooterDesign = (value = {}) => {
  const design = { ...footerDefaults, ...value };
  if (design.backgroundColor?.toLowerCase() === '#1c2b24') design.backgroundColor = footerDefaults.backgroundColor;
  if (design.accentColor?.toLowerCase() === '#25d366') design.accentColor = footerDefaults.accentColor;
  return design;
};
