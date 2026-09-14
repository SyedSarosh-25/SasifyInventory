# Admin workspace redesign

Implemented locally on 14 September 2026. This document does not imply deployment.

## Architecture and scope

`CommerceAdmin` retains its existing API calls, polling, mutation handlers, authentication and financial-unlock flow. New presentation components provide the navigation shell, overview widgets and client-side order/payment record controls. Styling is imported only by the admin route. No commerce server code, schema, credentials, deployment configuration or financial formulas were changed.

- Persistent desktop sidebar, automatic compact tablet layout, accessible mobile navigation drawer.
- Compact topbar with section search, refresh and sign-out.
- Collapsible supplier alerts, useful first-screen KPIs, recent orders, payment inbox and reported supplier balances.
- Protected financial card with clearer text and the existing server-checked unlock.
- Orders and payments: loaded-record search, forward/reverse ordering, bounded pagination and page size; payment verification filters. Inventory and supplier lists also have bounded pagination and page-size controls alongside their existing searches.
- Consistent cards, controls, table scroll containers, sticky table headers, keyboard focus and reduced-motion behavior.
- Read-only teammate permission explanation matching the existing restricted role.

No fabricated trend percentages, all-time receipt totals, notification backend, permission editor, unsupported CRUD actions or audit events were introduced. Order/payment searching remains limited to the recent records returned by `admin-list`; it is not a full-history search.

## Verification

- Existing commerce regression suite covers authentication, signed payment processing, supplier fulfillment, financial lock and teammate stock/commission behavior.
- Added record-model tests cover search, stale-page clamping, empty results, pagination and non-mutating reversal.
- Browser checked all ten modules with synthetic data in the isolated visual harness, including search, pagination, payment filters, sidebar collapse and mobile drawer navigation.
- Checked desktop and 390px mobile overview; mobile table overflow stays inside the table container.
- No live orders, supplier purchases, stock mutations or real credential changes performed during QA.

## Isolated visual harness

Run `npx vite --config tests/admin-preview/vite.config.mjs`, then open `http://127.0.0.1:4177/`.

The harness uses actual admin components with explicitly synthetic records and intercepts every fetch. Only its synthetic read response is allowed; all mutations/external requests return an error. It is outside the production route tree and must never be deployed as the admin application.

Authenticated production smoke testing and any deployment remain separate steps. Module-specific form/drawer overhauls, full-history analytics and bulk CRUD are not part of this implemented pass.
