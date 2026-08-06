export type Category = { _id: string; name: string; slug?: string; imageUrl?: string; parent?: string | null; children?: Category[] };
export type Variant = { sku?: string; name?: string; price?: number; stock?: number; attributes?: Record<string,string> };
export type Product = {
  _id: string; name: string; sku?: string; description?: string; shortDescription?: string;
  price: number; offerPrice?: number; mainImage?: string; imageVariants?: Record<string,string>;
  media?: { type: "image"|"video"; url: string; isMain?: boolean }[]; category?: Category|string;
  manufacturerBrand?: string; stock?: number; rating?: number; reviewCount?: number; variants?: Variant[];
};
export type CartItem = { key: string; product: Product; variant?: Variant; quantity: number };
export type Customer = { id?: string; _id?: string; name: string; email: string; phone?: string; gender?: string; addresses?: Address[]; storeCredit?: number };
export type Address = { _id?: string; label?: string; name?: string; phone?: string; address?: string; city?: string; state?: string; postalCode?: string; shippingAddress?: string; isDefault?: boolean };
export type Order = { _id: string; orderNumber: string; status: string; createdAt: string; grandTotal: number; items: Array<{ product?: Product|string; name: string; quantity: number; price: number; imageUrl?: string }>; tracking?: Record<string,unknown> };
export type Storefront = { products: Product[]; featuredProducts: Product[]; categories: Category[]; heroItems: any[]; banner?: any; contentSections?: any[]; productBanners?: any[]; blogPosts?: any[]; paymentMethods?: any[]; shippingRules?: any[]; settings: Record<string,any>; firstOrderDiscount?: any };

