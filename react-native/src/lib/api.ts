import Constants from "expo-constants";
import { Platform } from "react-native";
import type { CartItem } from "@/types";

const configured = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
export const API_URL = String(configured || (Platform.OS === "android" ? "http://10.0.2.2:5001/api" : "http://localhost:5001/api")).replace(/\/+$/, "");
let authToken: string | null = null;
export const setApiToken = (token: string | null) => { authToken = token; };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}
const body = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });

export const api = {
  bootstrap: () => request<any>("/storefront?bootstrap=1&v=2"),
  catalog: () => request<any>("/storefront/catalog?v=2"),
  product: (id: string) => request<any>(`/storefront/catalog/${encodeURIComponent(id)}?v=2`),
  login: (payload: { email:string; password:string }) => request<any>("/auth/customer/login", body(payload)),
  register: (payload: { name:string; email:string; password:string; phone?:string }) => request<any>("/auth/customer/register", body(payload)),
  me: () => request<any>("/auth/customer/me"),
  account: () => request<any>("/auth/customer/account"),
  updateProfile: (payload: unknown) => request<any>("/auth/customer/account/profile", { method:"PATCH", body:JSON.stringify(payload) }),
  orders: (page = 1) => request<any>(`/auth/customer/account/orders?page=${page}&limit=20`),
  tracking: (id:string) => request<any>(`/auth/customer/account/orders/${id}/tracking`),
  cart: () => request<any>("/auth/customer/cart"),
  saveCart: (items: CartItem[]) => request<any>("/auth/customer/cart", { method:"PUT", body:JSON.stringify({ items:items.map(i => ({ productId:i.product._id, variantSku:i.variant?.sku, quantity:i.quantity })) }) }),
  shippingQuote: (postalCode:string, items:CartItem[], cod=false) => request<any>("/storefront/shipping-quote", body({ pincode:postalCode, cod, items:items.map(i => ({ productId:i.product._id, quantity:i.quantity })) })),
  orderOtp: (payload:unknown) => request<any>("/storefront/orders/otp", body(payload)),
  createOrder: (payload:unknown) => request<any>("/storefront/orders", body(payload)),
  reviews: (id:string) => request<any>(`/storefront/products/${id}/reviews`),
  newsletter: (email:string) => request<any>("/storefront/newsletter", body({ email })),
  contact: (payload:unknown) => request<any>("/storefront/contact", body(payload)),
};
export const mediaUrl = (value?:string) => {
  if (!value || /^(https?:|data:|blob:)/i.test(value)) return value || "https://placehold.co/600x600/e8f5ed/176b43?text=HRS+Basket";
  return `${API_URL.replace(/\/api$/, "")}/${value.replace(/^\/?api\//, "").replace(/^\//, "")}`;
};
