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

Admin routes use clean paths such as `/admin/dashboard`. Production hosts must serve `index.html` for non-file routes so direct links and refreshes work. An Apache `.htaccess` fallback is included; for Nginx use `try_files $uri $uri/ /index.html;`. Legacy `#/admin/...` links are converted on load.
