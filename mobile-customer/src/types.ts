export type Category = { _id: string; name: string; slug?: string; imageUrl?: string; parent?: string | { _id: string; name?: string } | null; children?: Category[] };
export type Variant = { sku?: string; name?: string; price?: number; stock?: number; backOrderAllowed?: boolean; attributes?: Record<string,string> };
export type Product = {
 _id: string; name: string; sku?: string; description?: string; detailedDescription?: string; shortDescription?: string;
 price: number; offerPrice?: number; gstRate?: number; priceIncludesTax?: boolean; mainImage?: string; imageVariants?: Record<string,string>;
 media?: { type: 'image'|'video'; url: string; isMain?: boolean }[]; category?: Category|string;
 manufacturerBrand?: string; stock?: number; isStockManageable?: boolean; averageRating?: number; rating?: number; reviewCount?: number; variants?: Variant[]; variationOptions?: any[];
 displayType?: string; videoUrl?: string; isFeatured?: boolean; createdAt?: string;
 seller?: { _id: string; companyName?: string; sellerNumber?: string }; codAvailable?: boolean; prepaidAvailable?: boolean;
 isReturnable?: boolean; returnDays?: number; shippingMode?: string;
};
export type CartItem = { key: string; product: Product; variant?: Variant; quantity: number };
export type Customer = { id?: string; _id?: string; name: string; email: string; phone?: string; gender?: string; addresses?: Address[]; storeCredit?: number };
export type Address = { _id?: string; label: string; line1: string; city: string; state: string; postalCode: string; country: string; isDefault?: boolean };
export type Order = { _id: string; orderNumber: string; status: string; createdAt: string; grandTotal: number; items: Array<{ product?: Product|string; name: string; quantity: number; price: number; imageUrl?: string; sellerStatus?: string; returnApplicable?: boolean; returnDays?: number; returnRequest?: any }>; tracking?: Record<string,unknown> };
export type Storefront = { products: Product[]; featuredProducts: Product[]; featuredProductIds?: string[]; categories: Category[]; heroItems: any[]; banner?: any; contentSections?: any[]; productBanners?: any[]; productBannerColumns?: number; blogPosts?: any[]; paymentMethods?: any[]; shippingRules?: any[]; settings: Record<string,any>; firstOrderDiscount?: any };
