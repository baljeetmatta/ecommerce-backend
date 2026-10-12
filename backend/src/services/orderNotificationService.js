import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Reseller from '../models/Reseller.js';
import Customer from '../models/Customer.js';
import { sendEmail } from '../utils/email.js';
import { orderEmailContent } from './orderEmailContent.js';
import { orderInvoicePdf } from './orderInvoicePdf.js';

const id = value => String(value?._id || value || '');

// Email failures must not turn a successfully placed order into a checkout error.
export async function notifyNewOrder(order) {
  try {
    const [admins, sellers, reseller, customer] = await Promise.all([
      User.find({ role: 'Super Admin', isActive: true }).select('email').lean(),
      Seller.find({ _id: { $in: order.items.map(item => item.seller?._id || item.seller).filter(Boolean) } }).select('email').lean(),
      order.resellerAttribution?.reseller ? Reseller.findById(order.resellerAttribution.reseller).select('email').lean() : null,
      order.customer?.email ? order.customer : order.customer ? Customer.findById(order.customer?._id || order.customer).select('name email').lean() : null
    ]);
    const snapshot = { ...(order.toObject ? order.toObject() : order), customer: customer || order.customer };
    const recipients = new Map();
    const add = (account, customerEmail = false, items = snapshot.items) => {
      const email = account?.email?.trim().toLowerCase();
      if (email && !recipients.has(email)) recipients.set(email, {customer:customerEmail,items});
    };
    add({email:customer?.email || snapshot.address?.email},true);
    sellers.forEach(seller=>add(seller,false,snapshot.items.filter(item=>id(item.seller)===id(seller))));
    admins.forEach(account=>add(account));
    add(reseller);
    if(!recipients.size)return;
    const invoice = await orderInvoicePdf(snapshot);
    const filename = `${String(snapshot.invoiceNumber || snapshot.orderNumber).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`;
    const results = await Promise.allSettled([...recipients].map(async ([to,options]) => {
      const content = orderEmailContent(snapshot,options);
      // Storefront checkout creates a separate invoice/order for each seller.
      // Mixed staff-created orders use the complete customer invoice as well.
      await sendEmail({to,subject:`${options.customer ? 'Your HRSBasket order' : 'New HRSBasket order'} ${snapshot.orderNumber}`, ...content,attachments:[{filename,content:invoice,contentType:'application/pdf'}]});
    }));
    results.forEach(result => { if (result.status === 'rejected') console.error(`New-order email failed for ${order.orderNumber}:`, result.reason?.message); });
  } catch (error) { console.error(`New-order notification failed for ${order.orderNumber}:`, error.message); }
}
