# NayaPay inbound email receiver

This repository now supports a separate inbound-email endpoint for a future Gmail forwarding setup. It is intentionally disabled until the receiver authentication variables are configured and the site is deployed.

## Flow

1. Gmail forwards only matching NayaPay receipt emails to an inbound-email provider.
2. The provider sends the parsed email payload to `/api/nayapay/inbound-email`.
3. The commerce handler verifies the original MIME's DKIM signature against the configured NayaPay sender domain, parses that same signed content, and runs the existing destination, amount, transaction, time-window, duplicate, reservation, and fulfilment checks.
4. The payment appears in the admin panel. Credentials are delivered only when the existing verification rules pass.

The existing `/api/nayapay/email-webhook` endpoint remains available for the Apps Script migration period.

## Runtime configuration

Configure one of these authentication options in the server environment. Do not place values in frontend code, this document, or Git:

- `NAYAPAY_INBOUND_TOKEN`: provider must send the same value in `X-NayaPay-Inbound-Token`.
- `NAYAPAY_INBOUND_BASIC_USER` and `NAYAPAY_INBOUND_BASIC_PASSWORD`: provider must send HTTP Basic authentication.

The endpoint returns an error when neither option is configured, and rejects requests that do not authenticate.

## Forwarding provider

An inbound-email service such as Postmark can receive forwarded mail and POST parsed JSON to the endpoint. Configure its inbound webhook URL with HTTPS and its supported authentication method. Gmail forwarding addresses must be verified first; use a Gmail filter that matches the NayaPay sender and receipt subject, and keep the original Gmail copy in the inbox for audit/reconciliation.

Do not activate automatic fulfilment from a new provider until a dry-run test confirms that the provider preserves the original NayaPay sender, subject, date, transaction ID, amount, destination title, and stable message ID.

## Original email verification

Enable `RawEmailEnabled` on the Postmark server. The receiver expects the original MIME string in `RawEmail`. Provider JSON text is never used to approve payment when original MIME is supplied: the signed original is parsed separately. Webhook authentication alone and forwarded Authentication-Results headers cannot approve a payment.

Automatic verification requires a valid full-body DKIM signature from the configured sender's exact domain, signing From, To, Subject, Date and Message-ID. Duplicate critical headers and partial-body signatures are rejected. Missing or invalid signature evidence records an unverified receipt for admin review; temporary DNS verification failures return 503 so the provider can retry. Missing email dates are not replaced by the current time.

The response includes `verified` and `authentication` for inbound deliveries. `recorded` means stored, not necessarily paid or delivered. Original Message-ID takes precedence over a provider-generated ID. Transaction uniqueness continues to prevent duplicate delivery across Apps Script and forwarding.

## Cutover checklist

1. Connect a Postmark account and create a dedicated inbound server with raw email enabled and HTTP Basic credentials matching the website environment. Use the stable HTTPS website endpoint, never a temporary tunnel.
2. Verify the generated inbound address in Gmail, then forward only NayaPay receipt messages; keep the Gmail originals.
3. Deploy the receiver and its server-only dependencies. Test a real newly received receipt for original DKIM verification, the correct recipient/amount/time, admin visibility and one-time delivery. Test retrying the same receipt and a mismatched transaction.
4. Only after the forwarding path works, disable the Apps Script time trigger. Backfill missed receipts separately; old receipts must not be given new receipt timestamps.

Current status: local implementation tested; receiving provider account, Gmail forwarding, production deployment and real-receipt cutover are still pending.
