# HRS Basket customer app

An Expo SDK 57 / React Native customer storefront for iOS and Android, with a web preview. Built in `mobile-customer` using the existing `react-native` starter. The original frontend, admin, and starter sources are unchanged.

## Start

```bash
cd mobile-customer
cp .env.example .env.local
npm install
npm start
```

Install the [SDK 57-compatible Expo Go](https://expo.dev/go?sdkVersion=57) on your device. The start/iOS/Android scripts explicitly target Expo Go. Scan the QR code with Expo Go, or run `npm run android` / `npm run ios` with a configured emulator. `npm run web` starts the browser preview. Restart Expo after changing environment variables.

`EXPO_PUBLIC_API_URL` must include `/api` and be reachable from the device:

- Android emulator: `http://10.0.2.2:5001/api`
- iOS simulator: `http://localhost:5001/api`
- Physical phone/tablet: `http://<computer LAN IP>:5001/api`
- Production: `https://ebackend.hrsbasket.com/api`

Set `EXPO_PUBLIC_STOREFRONT_URL` for frontend-owned `/images/...` assets and links. It defaults to `https://hrsbasket.com`. API uploads resolve against the API origin. Environment values are public app configuration; never put payment secrets in them.

Deploy the accompanying backend additions before using checkout or order detail with the production API. For local development, start the backend normally with its existing MongoDB and integration configuration. No database migrations are required. The backend allows Expo web at localhost/127.0.0.1:8081; add other preview origins to the existing comma-separated `CLIENT_URL` configuration.

## SDK 57 / Expo Go

The app uses Expo `57.0.26`, React Native `0.86.3`, React `19.2.3`, and Expo-compatible Worklets/Reanimated versions. Navigation hooks use `expo-router/react-navigation`, as required by SDK 56 and later. The start scripts force Expo Go with `--go`.

After upgrading, restart Metro with a cleared cache:

```bash
npm start -- --clear
```

If Expo reports `EACCES` for a root-owned `.expo` folder from an earlier run, restore ownership before starting. On macOS, from `mobile-customer`:

```bash
sudo chown -R "$USER":staff .expo
# Only if the shared native-modules cache also reports permission errors:
sudo chown -R "$USER":staff "$HOME/.expo/native-modules-cache"
```

Compatibility checks: `npx expo install --check` and `npx expo-doctor`. Install a matching SDK 57 Expo Go build from [Expo's download page](https://expo.dev/go?sdkVersion=57).

## Customer features

- Admin-powered home: all hero slides, media banners, ordered/hidden home sections, benefits, categories, new arrivals, featured products, category product sections, promotional/custom content, journal posts, Instagram section, newsletter, and published pages.
- Phone and tablet layouts: adaptive product grids, bounded wide-screen content, landscape support, safe-area tabs, drawer navigation, and tablet product details.
- Catalog/search: nested category filtering, featured products, brand, price range, availability, rating, and sorting.
- Product details: current API details, image galleries, video, variations, stock checks, seller links, related products, approved reviews, verified-purchase review submission, and admin product content.
- Cart/wishlist: device persistence, carts scoped by account, guest cart merge on sign-in, server cart synchronization, and stock-aware quantities. Native tokens use Expo SecureStore. Web preview uses browser storage.
- Customer account: registration, login, password reset/change, profile, address creation/edit/removal/default selection, paginated orders, order detail/tracking, and returns with uploaded photo/video evidence.
- Reels: native video, search, likes, comments, and view recording through the existing API.
- Contact form and newsletter use existing admin-configured APIs.

## Checkout and payments

The mobile quote endpoint calculates current product/variant prices, tax, fixed/realtime shipping, customer-owned COD fees, and first-order discount eligibility. Order creation uses the existing protected storefront endpoint and its final server validation.

COD requests/verifies the existing email OTP. Razorpay and PayU use hosted checkout in a native WebView; provider secrets stay on the backend. Payment results are verified again by the existing backend order creation code. Pending payment data is retained per account to resume payment or retry confirmation after an interruption. PayU recovery checks server transaction status. Razorpay resumes its existing gateway order; after receiving a successful payment callback, the verified payload is retained until order confirmation succeeds. If the app is terminated before that callback arrives, contact support with the gateway reference if resuming does not recover it.

Seller-split orders are displayed individually on confirmation. The web preview supports COD; online payments are available in the native app. Arbitrary admin HTML renders in an isolated native WebView; the web preview displays its text.

## Additive backend changes

- `POST /api/storefront/mobile/checkout-quote` — requires customer authentication; body `{ items: [{ productId, variantSku?, quantity }], pincode, state, paymentMethodCode }`. Returns `{ subtotal, shippingAmount, codCharge, discountTotal, total, codAvailable, shipments }`.
- `GET /api/auth/customer/mobile/orders/:orderId` — requires customer authentication and scopes the order to that customer. Returns `{ order }`.
- Allows Expo's standard web preview origins in CORS.

Existing shipping and payment endpoints preserve their response formats and default calculation paths. Both new endpoints reuse the existing pricing, discount, shipping, and customer ownership rules. The frontend's sources and routes are unchanged.

## Validation

```bash
npm run typecheck
npm test
npm run export
# From the repository root:
node --test backend/test/mobileCheckout.test.js backend/test/mobileOrderDetail.test.js backend/test/homeContentSettings.test.js backend/test/shippingPolicy.test.js backend/test/payuHash.test.js backend/test/heroMedia.test.js backend/test/changePassword.test.js backend/test/returnReason.test.js
```

Exports verify bundling for iOS, Android, and web; they do not replace on-device testing. Before release, exercise COD email delivery, both configured gateways in test mode, Shiprocket serviceability, account/cart switching, uploads/returns, and phone/tablet layouts against a staging backend. Production purchases were not created during implementation.
