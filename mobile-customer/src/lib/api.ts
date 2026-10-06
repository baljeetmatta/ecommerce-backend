import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Address, CartItem } from '@/types';
import { orderItems } from './commerce';
const configured = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
export const API_URL = String(configured || (Platform.OS === 'android' ? 'http://10.0.2.2:5001/api' : 'http://localhost:5001/api')).replace(/\/+$/, '');
export const STOREFRONT_URL = (process.env.EXPO_PUBLIC_STOREFRONT_URL || 'https://hrsbasket.com').replace(/\/+$/, '');
let authToken: string | null = null;
let visitorPromise: Promise<string> | undefined;
const visitorId=()=>visitorPromise ||= (async()=>{let id=await AsyncStorage.getItem('customer_visitor_id');if(!id){id=`mobile_${Date.now()}_${Math.random().toString(36).slice(2)}`;await AsyncStorage.setItem('customer_visitor_id',id)}return id})();
export const setApiToken = (token: string | null) => { authToken = token; };
async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
 const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30000);
 try {
  const response = await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...options.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(data?.message || `Request failed (${response.status})`), { status: response.status });
  return data;
 } catch (error: any) { if (error.name === 'AbortError') throw new Error('The store took too long to respond. Please retry.'); throw error; }
 finally { clearTimeout(timeout); }
}
const body = (value: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(value) });
export const api = {
 bootstrap: () => request('/storefront?bootstrap=1&v=2'), catalog: () => request('/storefront/catalog?v=2'), product: (id: string) => request(`/storefront/catalog/${encodeURIComponent(id)}?v=2`),
 login: (payload: {email:string; password:string}) => request('/auth/customer/login', body(payload)), register: (payload: unknown) => request('/auth/customer/register', body(payload)),
 me: () => request('/auth/customer/me'), account: () => request('/auth/customer/account'), updateProfile: (payload: unknown) => request('/auth/customer/account/profile', body(payload, 'PATCH')),
 addresses: (addresses: Address[]) => request('/auth/customer/account/addresses', body({addresses}, 'PUT')),
 forgotPassword: (email: string) => request('/auth/customer/forgot-password', body({email})), resetPassword: (payload: unknown) => request('/auth/customer/reset-password', body(payload)),
 changePassword: (payload: unknown) => request('/auth/customer/password', body(payload, 'PUT')),
 order: (id:string) => request(`/auth/customer/mobile/orders/${encodeURIComponent(id)}`),
 orders: (page = 1) => request(`/auth/customer/account/orders?page=${page}&limit=5`), tracking: (id:string) => request(`/auth/customer/account/orders/${encodeURIComponent(id)}/tracking`),
 returnItem: (orderId:string, productId:string, payload: unknown) => request(`/auth/customer/account/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(productId)}/return`, body(payload)),
 cart: () => request('/auth/customer/cart'), saveCart: (items: CartItem[]) => request('/auth/customer/cart', body({items:orderItems(items)}, 'PUT')),
 shippingQuote: (postalCode:string, items:CartItem[], cod=false) => request('/storefront/shipping-quote', body({pincode:postalCode, cod, items:orderItems(items)})),
 orderOtp: (payload:unknown) => request('/storefront/orders/otp', body(payload)), createOrder: (payload:unknown) => request('/storefront/orders', body(payload)),
 checkoutQuote: (payload:unknown) => request('/storefront/mobile/checkout-quote', body(payload)),
 paymentMethods: () => request('/storefront/payment-methods'), razorpay: (payload:unknown) => request('/storefront/orders/razorpay', body(payload)), payu: (payload:unknown) => request('/storefront/orders/payu', body(payload)), payuStatus: (id:string) => request(`/storefront/payu/status/${encodeURIComponent(id)}`),
 reviews: (id:string) => request(`/storefront/products/${encodeURIComponent(id)}/reviews`), createReview: (id:string, payload:unknown) => request(`/storefront/products/${encodeURIComponent(id)}/reviews`, body(payload)),
 blog: (slug:string) => request(`/storefront/blog/${encodeURIComponent(slug)}`), seller: (id:string) => request(`/storefront/sellers/${encodeURIComponent(id)}`),
 engagement: (id:string) => request(`/storefront/reels/${id}/engagement`), reelView: async (id:string) => request(`/storefront/reels/${id}/view`, body({visitorId:await visitorId()})), reelLike: (id:string) => request(`/storefront/reels/${id}/like`, body({})), reelComment: (id:string, comment:string) => request(`/storefront/reels/${id}/comments`, body({text:comment})),
 newsletter: (email:string) => request('/storefront/newsletter', body({email})), contact: (payload:unknown) => request('/storefront/contact', body(payload)),
 upload: async (file: {uri:string; name:string; mimeType?:string}, video=false) => {
  const form = new FormData(); const field = video ? 'video' : 'image';
  if (Platform.OS === 'web') { const blob = await (await fetch(file.uri)).blob(); form.append(field, blob, file.name); }
  else form.append(field, {uri:file.uri, name:file.name, type:file.mimeType || (video ? 'video/mp4' : 'image/jpeg')} as any);
  return request(`/uploads/${field}`, {method:'POST',body:form});
 },
};
export const mediaUrl = (value?:string) => {
 if (!value) return '';
 if (/^https?:|^data:|^blob:/i.test(value)) return value;
 if (value.startsWith('//')) return `https:${value}`;
 const base = /^\/?images\//.test(value) ? STOREFRONT_URL : API_URL.replace(/\/api$/, '');
 return `${base}/${value.replace(/^\/?api\//, '').replace(/^\//, '')}`;
};
