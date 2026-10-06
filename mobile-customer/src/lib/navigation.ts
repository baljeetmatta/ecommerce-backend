import { router } from 'expo-router';
import { Linking } from 'react-native';
import { STOREFRONT_URL } from './api';
export function openStoreLink(value = '#/products') {
 const raw = value.replace(/^https?:\/\/(www\.)?hrsbasket\.com\/?/i, '/').replace(/^\/?#/, '');
 const [path, query=''] = raw.split('?'); const params = new URLSearchParams(query);
 if (path === '/products' || path === 'products' || path === '#products') router.push({pathname:'/(tabs)/shop',params:Object.fromEntries(params)});
 else if (/^\/?product\//.test(path)) router.push({pathname:'/product/[id]',params:{id:decodeURIComponent(path.split('/').pop()!)}});
 else if (/^\/?page\//.test(path)) router.push({pathname:'/page/[slug]',params:{slug:path.split('/').pop()!}});
 else if (/^\/?blog\//.test(path)) router.push({pathname:'/blog/[slug]',params:{slug:path.split('/').pop()!}});
 else if (/^\/?sellers\//.test(path)) router.push({pathname:'/seller/[id]',params:{id:path.split('/').pop()!}});
 else if (path === '/reels') router.push('/reels');
 else if (path === '/contact') router.push('/contact');
 else if (path === '/cart') router.push('/(tabs)/cart');
 else if (path === '/account') router.push('/(tabs)/account');
 else if (!path || path === '/') router.push('/(tabs)');
 else if (/^(https?:|tel:|mailto:)/i.test(value)) void Linking.openURL(value);
 else void Linking.openURL(`${STOREFRONT_URL}/${value.replace(/^\//,'')}`);
}
