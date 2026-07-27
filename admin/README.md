# HRSBasket Admin

Standalone React/Vite entry point for the existing HRSBasket administration
workspace. Production should deploy this folder to `admin.hrsbasket.com`.

## Environment

Create an `.env.production` file when the API is hosted separately:

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
