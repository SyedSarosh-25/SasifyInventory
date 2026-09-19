# Telegram order approval

Orders are now held for admin approval. A new order sends a Telegram message with
Approve and Reject buttons. Payment claims and trusted receipt evidence also move
the order to review, but neither path delivers credentials automatically.

Approve calls the existing fulfillment code and makes the credentials available on
the customer's order page. Reject cancels the order, releases its reservation and
does not deliver credentials.

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
