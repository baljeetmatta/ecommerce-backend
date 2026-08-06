# HRS Basket mobile

Expo SDK 54 React Native storefront for the existing HRS Basket API.

## Run

```bash
cp .env.example .env.local
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` to a backend URL reachable from the device. Android emulators normally use `http://10.0.2.2:5001/api`; physical devices need the computer's LAN IP. Production defaults to `https://ebackend.hrsbasket.com/api`.

The app includes native home/catalog views, category/search/filter/sort, product detail, wishlist, persistent and server-synced cart, customer login/signup, checkout with COD email verification, order history/tracking, profile, bottom tabs, and a burger drawer.
