# NayaPay payment receipt receiver

The production receiver is Postmark Inbound. NayaPay receipts from
`syedadeen18@gmail.com` are forwarded to the configured Postmark inbound
address, and Postmark sends the receipt to
the backend at:

`https://www.sasifysolutions.com/api/nayapay/inbound-email`

NayaPay is configured as its own Postmark inbound stream. Meezan Bank is
currently disabled.

The backend remains responsible for sender and destination checks, amount
matching, transaction checks, duplicate protection, payment windows,
automatic fulfilment of a single trusted order, and a restricted Telegram
fallback only when automatic fulfilment of an authenticated receipt fails.

## Flow

1. NayaPay sends a receipt to the configured mailbox.
2. The mailbox forwards the receipt to the Postmark inbound address.
3. Postmark sends its inbound JSON payload to `/api/nayapay/inbound-email`
   using the configured HTTP Basic Auth credentials.
4. The backend authenticates the Postmark request and validates the preserved
   NayaPay DKIM/DMARC evidence. When Postmark includes `RawEmail`, the backend
   verifies the original signed MIME message when possible and can safely fall
   back to Postmark's preserved DKIM/DMARC evidence when Gmail forwarding has
   changed the raw signature.
5. The backend parses the receipt, checks the active payment receiver, amount,
   transaction, payment window and duplicate state.
6. If exactly one eligible order is found, the backend automatically fulfils it
   and sends a Telegram delivery alert. If the receipt arrives before the
   customer submits the claim, the unique amount and payment window can still
   attach it to the order. Telegram approval is available only when an
   authenticated receipt was matched but automatic fulfilment failed.
7. Unmatched or ambiguous receipts remain in the admin payments panel for
   review and never receive Telegram delivery controls automatically.

Postmark may omit `RawEmail` even when the raw-email option is enabled. In that
case, automatic verification is allowed only when the authenticated payload
preserves NayaPay DKIM and DMARC pass evidence. Plain provider fields alone
are never sufficient.

## Postmark configuration

- Inbound webhook URL:
  `https://www.sasifysolutions.com/api/nayapay/inbound-email`
- Enable raw email content when available.
- Configure the same HTTP Basic Auth username and password on Postmark and
  the production environment.
- Keep the NayaPay sender configured as `service@nayapay.com`.

## Backend configuration

Set these server-only environment variables:

- `NAYAPAY_INBOUND_BASIC_USER` and `NAYAPAY_INBOUND_BASIC_PASSWORD`: protect
  the Postmark inbound endpoint.
- `NAYAPAY_SENDER`: the exact NayaPay sender address, normally
  `service@nayapay.com`.
- `PAYMENT_RECEIVER_EMAIL`: the dedicated mailbox that receives the NayaPay
  receipt, for example `seemab3455@gmail.com`. When a newer receipt omits
  `Destination Acc. Title`, the backend accepts it only when the authenticated
  Postmark `To` header exactly matches this address.
- `NAYAPAY_AUTO_VERIFY=true`: enables trusted receipt verification and automatic
  fulfilment when exactly one eligible order matches.
- `PAYMENT_ACCOUNT_TITLE` and `PAYMENT_ACCOUNT_NUMBER`: primary payment
  receiver details.
- `PAYMENT_SECONDARY_TITLE` and `PAYMENT_SECONDARY_NUMBER`: secondary
  payment receiver details.

The configuration helper also expects `PAYMENT_ACCOUNT_NUMBER`,
`PAYMENT_RECEIVER_EMAIL`, `NAYAPAY_INBOUND_BASIC_USER` and
`NAYAPAY_INBOUND_BASIC_PASSWORD` to be available through the private secrets
file, the process environment or `.env.postmark-temp`. It never commits that
file or prints its values.

The active receiver is selected from the receiver records shown in the admin
panel. Keep payment account values server-side and never expose them in
frontend code or source control.

## Troubleshooting

- If no payment is recorded, inspect Postmark inbound activity and the
  payment record's `verification_reason`.
- If Postmark returns a non-2xx response, retry the inbound event after fixing
  the reported configuration or receipt issue.
- A receipt that arrives after the order window is recorded for review but is
  not automatically attached to an expired order; Telegram/admin fallback is
  required.
- The payment-window comparison uses Postmark's original `Date` header. If
  NayaPay supplies that header without a timezone, the receiver interprets it
  as Pakistan Standard Time (`+05:00`) instead of the Vercel runtime timezone.
- A duplicate transaction is retained safely and cannot deliver credentials
  twice.
- If a manual approval is required after an automatic delivery failure, the
  payment record retains the original verification reason, error code, stage
  and sanitized error message for admin diagnosis.
