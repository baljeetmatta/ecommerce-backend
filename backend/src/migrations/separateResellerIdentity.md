Reseller identity migration

Deploy the backend and frontend together during a maintenance window. Before starting the new backend, run from backend/:

    npm run audit:reseller-identity
    npm run migrate:reseller-identity

The audit performs no writes. Both commands use MONGO_URI from the backend environment. Duplicate or invalid reseller emails must be corrected before applying.

The migration copies each legacy password hash once to the reseller record, preserves existing independent reseller credentials, and removes the customer reference and its obsolete unique index. Reseller IDs, wallets, KYC, links, sales, and assignments keep their original IDs. It does not modify or delete customer records. Existing reseller passwords continue working after migration; later customer password changes have no effect on them. It is safe to rerun while registration and credential changes are stopped.

Resellers listed under resetRequired have no recoverable password. Use the admin reseller password reset or reseller forgot-password flow after deployment. Neither requires a customer account. No passwords are printed by the migration.

Old customer tokens cannot access reseller routes. Users must sign in again to create a reseller session. Customer and reseller sessions use separate browser storage. Historical support tickets previously created as Customer remain in customer support because their original identity cannot reliably be inferred; new reseller tickets belong to Reseller.
