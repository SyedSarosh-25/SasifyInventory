# NayaPay inbound email receiver

This repository now supports a separate inbound-email endpoint for a future Gmail forwarding setup. It is intentionally disabled until the receiver authentication variables are configured and the site is deployed.

## Flow

1. Gmail forwards only matching NayaPay receipt emails to an inbound-email provider.
2. The provider sends the parsed email payload to `/api/nayapay/inbound-email`.
3. The commerce handler normalizes the payload and runs the existing sender, destination, amount, transaction, time-window, duplicate, reservation, and fulfilment checks.
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
