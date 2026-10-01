# Meezan Bank payment receipt receiver

Meezan Bank credit alerts are forwarded through Postmark Inbound to:

`https://www.sasifysolutions.com/api/meezan/inbound-email`

The receiver authenticates the Postmark request and original Meezan message,
then parses the `PKR ... received to your account`, beneficiary for display,
masked account,
transaction date and transaction time fields shown in the credit alert. The
visible Meezan template does not include a transaction ID, so the authenticated
Message-ID is converted into a stable receipt fingerprint.

## Configuration

Set these server-only variables:

- `MEEZAN_ACCOUNT_TITLE`: title shown at checkout.
- `MEEZAN_ACCOUNT_NUMBER`: the full account number; only its last four digits
  are compared with the masked account in the alert.
- `MEEZAN_IBAN`: the IBAN shown to customers for bank transfers.
- `MEEZAN_BENEFICIARY`: optional beneficiary text retained for display. It is
  not used as an automatic verification requirement because the bank's branch
  or beneficiary wording can vary while the receiving account remains valid.
- `MEEZAN_RECEIVER_EMAIL`: the original recipient mailbox, or leave it unset to
  use `PAYMENT_RECEIVER_EMAIL`.
- `MEEZAN_SENDER`: normally `no-reply@meezanbank.com`.
- `MEEZAN_DKIM_DOMAIN`: normally `meezanbank.com`.
- `MEEZAN_INBOUND_BASIC_USER` and `MEEZAN_INBOUND_BASIC_PASSWORD` (or
  `MEEZAN_INBOUND_TOKEN`): the Postmark-to-Sasify webhook credential.
- `MEEZAN_AUTO_VERIFY=true`: enable only after one real authenticated receipt
  has been inspected and the sender, receiving mailbox, account suffix, amount
  and body date/time have been confirmed.

The Bank transfer checkout route displays the configured Meezan account. NayaPay
wallet payments continue to use the existing NayaPay receiver and parser.

## Postmark setup

1. Forward Meezan Bank alerts to the Postmark inbound address.
2. Configure the webhook URL above and the matching HTTP Basic Auth credentials.
3. Preserve the original MIME message and authentication headers when possible.
4. Keep automatic verification disabled until a real message has been tested.

Unmatched, stale, unauthenticated or incorrectly configured alerts remain in
the payment review flow and do not release inventory automatically.
