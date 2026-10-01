# Binance email payment verification

Binance is handled as two separate payment methods. Customers choose either
Binance Pay or an on-chain crypto USDT deposit on the website or inside
SasifyBot. The order shows the exact net USDT amount that must arrive.

For BEP20 crypto deposits, the displayed send amount includes a USDT 0.01
network-fee allowance. The customer sends the displayed gross amount, while
the parser compares Binance's credited net USDT amount with the order quote;
a short net amount is never auto-delivered. Binance Pay has no network-fee
allowance.

The on-chain email format currently seen in the mailbox is:
`[Binance] USDT Deposit Confirmed - ... (UTC) - ... (UTC)` with a body such as
`USDT Deposit Successful. Your deposit of 738 USDT is now available in your
Binance account.` The unique transaction id is recovered from the signed
Binance tracking links because it is not printed in the visible body.

The dedicated Postmark endpoint for Binance Pay is:

https://www.sasifysolutions.com/api/binance-pay/inbound-email

The dedicated Postmark endpoint for crypto USDT deposits is:

https://www.sasifysolutions.com/api/crypto/inbound-email

Configure Gmail forwarding from syedadeen18@gmail.com to the corresponding
Postmark inbound address. Keep Binance Pay and Crypto as separate Postmark
inbound streams. Postmark must forward the original MIME message (RawEmail) and
preserve the original authentication headers, including an
`Authentication-Results` header with `dkim=pass` and `dmarc=pass`.

Required production settings:

- BINANCE_RECEIVER_ID: the Binance account identifier customers should pay.
- BINANCE_RECEIVER_TITLE: the display name for that account.
- BINANCE_USDT_PKR_RATE: the PKR value used to quote each order in USDT.
- CRYPTO_RECEIVER_ID: the USDT wallet address customers should use for an
  on-chain deposit.
- CRYPTO_RECEIVER_TITLE: the display name for the crypto destination.
- CRYPTO_USDT_NETWORK: the exact network to display and optionally validate,
  such as TRC20 or BEP20.
- BINANCE_RECEIVER_EMAIL: the original `To` address from the raw Binance email.
  For the currently inspected receipt this is the Apple private-relay address,
  not the Gmail mailbox that receives the forwarded message.
- BINANCE_SENDER: the exact authenticated sender address from the raw Binance
  email. Do not replace it with a display name such as `Binance`.
- BINANCE_DKIM_DOMAIN: the authenticated DKIM signing domain. For the current
  inspected receipt Gmail reports `privaterelay.appleid.com`.
- BINANCE_INBOUND_BASIC_USER and BINANCE_INBOUND_BASIC_PASSWORD (or
  BINANCE_INBOUND_TOKEN): the Postmark-to-Sasify webhook credential.
- BINANCE_AUTO_VERIFY=true: enable only after one real raw message has been
  inspected and the sender, DKIM/DMARC results, timestamp, amount, payer and
  transaction reference all match the expected Binance format.

The parser refuses automatic delivery when the currency is not USDT, the
authenticated sender or recipient does not match, the timestamp is outside the
receipt window, the transaction reference is missing or ambiguous, the crypto
network does not match when configured, the received amount is short, or more
than one active order matches. Such payments remain available for admin review.
