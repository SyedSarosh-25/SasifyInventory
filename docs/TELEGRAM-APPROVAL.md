# Telegram delivery alerts and fallback

Trusted Postmark receipts that match exactly one active order are delivered
automatically. Telegram receives a delivery notification after the successful
delivery. It is a restricted fallback only for an authenticated receipt whose
automatic fulfilment failed.

The initial order notification has no approval controls. Unmatched or ambiguous
receipts are sent to the admin payments panel for review and do not receive
Telegram delivery controls. For an authenticated automatic-delivery failure,
the Telegram message includes Approve and Reject buttons. Approve calls the
existing fulfilment code and makes the credentials available on the customer's
order page. Reject cancels the order, releases its reservation and does not
deliver credentials. Telegram callbacks reject unverified payments.

Configure these server-side environment variables in the production deployment:

- `TELEGRAM_BOT_TOKEN`: token from BotFather.
- `TELEGRAM_CHAT_ID`: the private chat where order alerts should arrive.
- `TELEGRAM_WEBHOOK_SECRET`: a long random value used to authenticate Telegram callbacks.

After deploying, register the webhook with Telegram:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://www.sasifysolutions.com/api/commerce?action=telegram-webhook&secret_token=<WEBHOOK_SECRET>
```

The bot must be able to send messages to the configured chat. Keep the bot token and
webhook secret only in deployment environment variables; never commit them.
