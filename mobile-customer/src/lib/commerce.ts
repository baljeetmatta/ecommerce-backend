import type { Product, Variant } from '@/types';
export const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const productPrice = (product: Product, variant?: Variant) => variant?.price !== undefined ? Math.floor(Number(variant.price) * (product.priceIncludesTax === false ? 1 + Number(product.gstRate || 0) / 100 : 1)) : Number(product.offerPrice ?? product.price);
export const availableStock = (product: Product, variant?: Variant) => variant?.backOrderAllowed || (!variant && product.isStockManageable === false) ? Infinity : Math.max(0, Number(variant?.stock ?? product.stock ?? 0));
export const matchesCategory = (product: Product, id: string) => id === 'all' || (typeof product.category === 'string' ? product.category === id : product.category?._id === id || (typeof product.category?.parent === 'string' ? product.category.parent : product.category?.parent?._id) === id);
export const orderItems = (items: import('@/types').CartItem[]) => items.map(i => ({ productId: i.product._id, variantSku: i.variant?.sku, quantity: i.quantity }));
export function firstDiscount(promotion: any, total: number) {
 if (!promotion || total < Number(promotion.minimumOrderValue || 0)) return 0;
 const amount = promotion.type === 'percentage' ? total * Number(promotion.value || 0) / 100 : promotion.type === 'fixed' ? Number(promotion.value || 0) : 0;
 return Math.max(0, Math.min(total, promotion.maxDiscountAmount > 0 ? Math.min(amount, promotion.maxDiscountAmount) : amount));
}

// On sign-in, merge a guest cart without doubling quantities already saved by
// a previous retry. The account cart wins for current product metadata.
export function mergeCarts(account: import('@/types').CartItem[], guest: import('@/types').CartItem[]) {
 const merged=account.map(i=>({...i}));
 for(const item of guest){const existing=merged.find(i=>i.key===item.key);if(existing)existing.quantity=Math.max(existing.quantity,item.quantity);else merged.push({...item});}
 return merged;
}
