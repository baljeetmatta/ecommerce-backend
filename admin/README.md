# HRSBasket Admin

Standalone React/Vite entry point for the existing HRSBasket administration
workspace. Production should deploy this folder to `admin.hrsbasket.com`.

## Environment

Copy `.env.example` to `.env.production` when the API is hosted separately.
The URL is defined by `src/services/api.js` and can be overridden with:

```env
VITE_API_URL=https://ebackend.hrsbasket.com/api
```

## Commands

```sh
npm run dev
npm run build
```

Local development runs on `http://localhost:5174`. Production hostname access
is restricted to `admin.hrsbasket.com`.
