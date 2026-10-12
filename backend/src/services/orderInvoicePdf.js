import PDFDocument from 'pdfkit';
import { deliveryAddress, orderTotals } from './orderEmailContent.js';

// Use the explicit INR currency code so the PDF's built-in fonts remain portable.
const money = value => `INR ${new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)}`;
export function orderInvoicePdf(order) {
  return new Promise((resolve,reject)=>{
    const doc = new PDFDocument({size:'A4',margin:44,bufferPages:true,info:{Title:`Invoice ${order.invoiceNumber || order.orderNumber}`,Author:'HRSBasket'}});
    const chunks=[];
    doc.on('data',chunk=>chunks.push(chunk));
    doc.on('error',reject);
    doc.on('end',()=>resolve(Buffer.concat(chunks)));
    const left=44, right=551, width=507;
    const text=(value,x,y,w,size=10,bold=false,align='left')=>doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor('#172b22').text(String(value??''),x,y,{width:w,align});
    const height=(value,w,size=10,bold=false)=>doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).heightOfString(String(value??''),{width:w});
    doc.rect(0,0,595,92).fill('#15803d');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('HRSBasket',left,30);
    doc.fontSize(14).text('INVOICE',420,36,{width:131,align:'right'});
    let y=116;
    const meta=[['Invoice number',order.invoiceNumber || order.orderNumber],['Order number',order.orderNumber],['Date of issue',new Date(order.invoiceGeneratedAt || order.createdAt || Date.now()).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'long',year:'numeric'})],['Payment',`${order.payment?.methodName || order.payment?.provider || 'Not specified'} - ${order.paymentStatus || 'Pending'}`]];
    for(const [label,value] of meta){const h=Math.max(18,height(value,350));text(label,left,y,130,10,true);text(value,190,y,350);y+=h+4;}
    y+=16;
    const store=order.invoiceStore || {};
    const seller=[store.sellerName || store.shopName || 'HRSBasket',store.sellerAddress || store.address,store.email,store.sellerGstNumber ? `GSTIN: ${store.sellerGstNumber}` : null].filter(Boolean).join('\n');
    const bill=[order.customer?.name || order.address?.name,order.address?.billingAddress || order.address?.shippingAddress,[order.address?.city,order.address?.state,order.address?.postalCode].filter(Boolean).join(', '),order.customer?.email || order.address?.email].filter(Boolean).join('\n');
    text('Seller address',left,y,235,11,true);text('Bill to',316,y,235,11,true);y+=21;
    text(seller,left,y,235);text(bill,316,y,235);y+=Math.max(height(seller,235),height(bill,235))+24;
    const header=()=>{doc.rect(left,y,width,28).fill('#eef6f0');text('Description',left+8,y+9,252,9,true);text('Qty',312,y+9,30,9,true,'right');text('Unit price',351,y+9,91,9,true,'right');text('Amount',452,y+9,91,9,true,'right');y+=38;};
    const page=()=>{doc.addPage();y=48;};
    if(y>650)page();
    header();
    for(const item of order.items || []){
      const name=String(item.name || 'Product');
      const sku=item.sku ? `SKU: ${item.sku}` : '';
      const nameHeight=height(name,250,10,true);
      const rowHeight=Math.max(28,nameHeight+(sku ? height(sku,250,8)+7 : 0))+18;
      if(y+rowHeight>760){page();header();}
      text(name,left+8,y,250,10,true);
      if(sku)text(sku,left+8,y+nameHeight+5,250,8);
      text(item.quantity,312,y,30,10,false,'right');text(money(item.price),351,y,91,10,false,'right');text(money(Number(item.price)*Number(item.quantity)),452,y,91,10,false,'right');
      y+=rowHeight;doc.moveTo(left,y-8).lineTo(right,y-8).strokeColor('#e2e8e4').stroke();
    }
    const totals=orderTotals(order);
    if(y+totals.length*26+90>760)page();
    y+=12;
    for(const [label,value] of totals){const bold=label==='Grand total';text(label,310,y,132,11,bold);text(money(value),442,y,109,11,bold,'right');y+=26;}
    y+=16;
    const address=deliveryAddress(order);
    if(y+height(address,width)+35>760)page();
    text('Delivery address',left,y,width,11,true);y+=20;text(address,left,y,width);
    const range=doc.bufferedPageRange();
    for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(`Invoice ${order.invoiceNumber || order.orderNumber} | Page ${i+1} of ${range.count}`,left,780,{width,align:'right',lineBreak:false});}
    doc.end();
  });
}
