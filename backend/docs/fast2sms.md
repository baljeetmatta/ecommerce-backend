# Fast2SMS

Configure SMS in **Admin → Settings → Fast2SMS**:

1. Enter the Fast2SMS API key and save it.
2. Use **Test SMS** to verify the API key and a 10-digit Indian mobile number.
3. Enable SMS notifications.
4. Select the events that should send SMS:
   - **On Registration**: customer, seller, reseller, and staff account registration.
   - **On Orders**: order placement messages to the customer, order seller(s), and attributed reseller.
   - **On Order Completion**: a message to the customer when all order items are delivered.
   - **On Order Status Change**: a message to the customer on other status changes. Completion is sent through its dedicated event when enabled.
   - **On Withdrawal by seller/reseller**: a confirmation to the account holder after a withdrawal request is submitted.

The API key is masked in settings responses. SMS delivery failures are logged and do not block registration, order placement/status updates, or withdrawal submission.

Messages use Fast2SMS `bulkV2` with the Quick SMS (`q`) route and require valid 10-digit Indian mobile numbers.
