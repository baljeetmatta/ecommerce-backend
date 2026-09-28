# ShipRocket fulfillment

After deploying the backend and frontend, open an order's **Tracking & shipping documents** screen in the admin or seller panel. Once the order has a ShipRocket shipment ID, the screen provides status sync and PDF download/open/print actions for the carrier label, ShipRocket invoice, and pickup manifest. These are fetched on demand, so a document that was unavailable at dispatch can be retried without creating another shipment. The carrier's label is preserved, including its barcode/QR artwork; there is no fabricated standalone carrier QR code.

## Pickup and delivery

Seller orders dispatched from either panel use the seller profile's separate pickup address, or the business address when “pickup same as business” is selected. The destination comes from the order's delivery address. When ShipRocket is enabled, seller approval automatically registers the pickup address. The same check runs when an administrator updates an approved seller and before dispatch. Existing active pickup locations are matched by address, city, state and PIN code (ignoring case and repeated whitespace), even when their aliases differ. Only unmatched addresses create a location; new aliases include an address fingerprint. Approval and dispatch report registration failures so the administrator can correct API permissions or address data and retry. When ShipRocket is disabled, approval proceeds without contacting the carrier; dispatch registers the address after ShipRocket is enabled.

Orders currently have one shipment record. Checkout already splits orders by seller. Legacy orders containing multiple pickup owners must be split/reviewed instead of combining different seller warehouses into one shipment. Store-owned orders use the account's configured pickup location. Existing shipments keep their original pickup; editing a seller profile does not reroute an already-created parcel.

## Tracking

The server starts a background worker after database connection. It checks for work every minute and refreshes each active shipment approximately every 15 minutes, processing at most 100 per batch. Final delivered, cancelled, and RTO-delivered carrier statuses stop polling. Failures are recorded per order and retried; one unavailable shipment does not stop other updates. This is polling, not a webhook, and requires the backend process to remain running.

Tracking saves the carrier status, estimated delivery, recent scans, and last successful sync time. Known transit/delivery/RTO/cancellation statuses update order and item statuses. Delivery initializes the delivery date and return deadline once; repeated polls do not extend the return window. Completed items and return workflows are preserved. A status sync never creates a shipment or charges a wallet.

## Validation

Run `node --test test/adminShiprocket.test.js test/sellerShiprocket.test.js test/shiprocketTracking.test.js` from backend. Tests mock the carrier and database. A real account check is still required to verify API-user permissions, pickup registration, and the invoice/label template configured in ShipRocket. No live shipments are created by the tests.
