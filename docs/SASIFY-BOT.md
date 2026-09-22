# Public SasifyBot

The public bot is separate from the private notification and admin-approval bot.
It is a Telegram-native storefront: customers browse products, create orders,
see the active receiver account, submit payment status, check order history and
receive verified credentials in the same private Telegram chat.

The website APIs, database, Postmark inbound receiver and MIME/signature
verification remain the backend source of truth. The customer does not need to
open the website. The actual bank or wallet payment still happens in the
customer's payment app, after which the customer returns to Telegram and taps
`I have paid`.

## Production variables

- `SASIFY_BOT_TOKEN`: the token for the public bot from BotFather.
- `SASIFY_BOT_WEBHOOK_SECRET`: a long random webhook secret.

Keep these separate from `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_WEBHOOK_SECRET`, which belong to the private notification bot.

## Customer flow

1. `/start` opens the Telegram storefront and persistent quick menu.
2. `Products` shows the live local and supplier catalogue.
3. A product message shows description, price, stock and `Buy now`.
4. The backend creates the order and the bot sends the active payment receiver.
5. The customer pays through the wallet or bank app and taps `I have paid`.
6. Postmark forwards the original MIME receipt to Vercel.
7. The existing signature, recipient, reference and amount checks run unchanged.
8. Verified orders are fulfilled automatically and credentials are sent to the
   buyer's Telegram chat. Failed or ambiguous receipts stay in `Needs review`.

## Webhook

After deploying, register the public bot webhook with Telegram:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https%3A%2F%2Fwww.sasifysolutions.com%2Fapi%2Fcommerce%3Faction%3Dpublic-telegram-webhook&secret_token=<WEBHOOK_SECRET>
```

The public bot supports `/start`, `/help`, `/menu`, `/products`, product
buttons, payment-method buttons, payment claims, status, history, profile,
support, wallet, API and warranty menus.
