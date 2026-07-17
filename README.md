# E-commerce Admin Panel

Full-stack starter for an e-commerce operations dashboard with:

- React admin frontend in `frontend/`
- Node.js, Express, and MongoDB backend in `backend/`
- Inventory, catalog, orders, fulfillment, customers, analytics, promotions, abandoned cart hooks, and RBAC modules

## Run Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

For an existing database created before the Seller terminology update, run the one-time migration before starting the updated API:

```bash
cd backend
npm run migrate:sellers
```

This renames the related MongoDB collections, references, order-item fields, payout fields, and indexes without changing document IDs.

Seeded admin login:

```text
admin@example.com
password123
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:5173` and expects the backend at `http://localhost:5000/api`.

The admin dashboard is protected by a login screen. After `POST /api/auth/login` succeeds, the frontend stores the JWT and user profile in local storage, verifies the session with `GET /api/auth/me`, and sends authenticated requests with a Bearer token. Use the sign-out button in the top bar to clear the session. Public registration only works when there are no users yet; after bootstrap, staff accounts are created by a Super Admin from the Access section.

## API Modules

- `POST /api/auth/login`
- `GET|POST /api/products`
- `PATCH /api/products/:id/inventory`
- `GET|POST /api/categories`
- `PUT /api/categories/:id`
- `GET|POST /api/tax-categories`
- `PUT /api/tax-categories/:id`
- `GET|POST /api/orders`
- `PATCH /api/orders/:id/status`
- `POST /api/orders/:id/refunds`
- `PATCH /api/orders/:id/rma`
- `GET|POST /api/customers`
- `POST /api/customers/:id/store-credit`
- `GET|POST /api/promotions`
- `GET /api/promotions/abandoned-carts`
- `GET|POST /api/users`
- `GET /api/analytics`
