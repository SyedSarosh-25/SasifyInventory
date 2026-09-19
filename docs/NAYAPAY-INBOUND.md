# NayaPay payment receipt receiver

The primary low-cost receiver is Google Gmail plus the Apps Script bridge in
`commerce/nayapay-apps-script.gs`. The script scans the Gmail mailbox for
NayaPay receipt messages and sends signed receipt fields to the existing
`/api/nayapay/email-webhook` endpoint. The backend remains responsible for
parsing, amount matching, transaction checks, duplicate protection, payment
windows and fulfilment.

## Flow

1. NayaPay sends a receipt to the connected Gmail mailbox.
2. Gmail Apps Script searches for matching NayaPay receipt messages every five
   minutes.
3. The script sends the sender, recipient, subject, text, HTML, date and stable
   Gmail message ID to `/api/nayapay/email-webhook`, together with an HMAC
   signature.
4. The commerce handler verifies the webhook secret and signature, parses the
   receipt again, and runs the destination, amount, transaction, time-window,
   duplicate, reservation and fulfilment checks.
5. The script records successfully handled message IDs so retries do not create
   duplicate payment events. The backend also deduplicates messages and
   transaction IDs.

The script does not approve a payment itself. A receipt is delivered only when
the backend verification rules pass.

## Apps Script setup

1. Open the Apps Script project connected to the Gmail mailbox.
2. Copy `commerce/nayapay-apps-script.gs` into the project.
3. In Apps Script project settings, add these Script Properties:
   - `WEBHOOK_SECRET`: exactly the value used by the backend as
     `NAYAPAY_WEBHOOK_SECRET`.
   - `NAYAPAY_SIGNING_KEY`: exactly the value used by the backend as
     `NAYAPAY_SIGNING_KEY`.
4. Run `installPaymentTrigger()` once and approve the Gmail and URL-fetch
   permissions.
5. Run `checkNayaPayEmails()` once manually and confirm the execution log shows a
   successful webhook response.
6. Send or wait for one controlled NayaPay receipt and confirm that the payment
   appears in the admin panel and is delivered only once.

Keep the Gmail message in the mailbox for audit and retry. Do not expose either
secret in frontend code, public documentation or the repository.

## Backend configuration

Set these server-only environment variables:

- `NAYAPAY_WEBHOOK_SECRET`: authenticates the Apps Script request.
- `NAYAPAY_SIGNING_KEY`: verifies the signed receipt fields.
- `NAYAPAY_SENDER`: the exact NayaPay sender address, normally
  `service@nayapay.com`.
- `NAYAPAY_RECEIVER_MARKER` and/or `NAYAPAY_RECEIVER_EMAIL`: the configured
  destination marker used by the receipt parser.
- `NAYAPAY_AUTO_VERIFY=true`: enables automatic receipt verification.

The endpoint is intentionally fail-closed. Invalid signatures, mismatched
sender or destination, inconsistent subject/body amounts, missing transaction
references, stale receipts and duplicate transactions are not automatically
fulfilled.

## Optional raw-email upgrade

The current bridge sends the fields needed by the existing signed webhook. If
stronger original-message validation is required later, the Apps Script can also
send `GmailMessage.getRawContent()` to a separately authenticated inbound-email
endpoint. The backend can then parse the raw MIME and verify its original DKIM
evidence before applying the same commerce checks. That upgrade should be
tested with a real NayaPay receipt before being enabled for fulfilment.

## Troubleshooting and cutover

- If no payment is recorded, inspect Apps Script executions first, then inspect
  the commerce payment record and its `verification_reason`.
- If a webhook returns a non-2xx response, leave the Gmail message unmarked so
  the next scan can retry it.
- The search window is intentionally limited to recent messages. Backfill old
  receipts manually; do not assign old receipts a new receipt timestamp.
- A third-party inbound-email service remains optional. If one is used later,
  it must authenticate to the backend and preserve the original receipt fields;
  it must not bypass backend verification.
