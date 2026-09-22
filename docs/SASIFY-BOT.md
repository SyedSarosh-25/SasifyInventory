# Public SasifyBot

The public bot is separate from the notification and admin-approval bot.
It presents the public catalog and links customers to the existing Sasify
website checkout. It does not process payments or send credentials inside
Telegram.

## Production variables

- `SASIFY_BOT_TOKEN`: the token for the public bot from BotFather.
- `SASIFY_BOT_WEBHOOK_SECRET`: a long random webhook secret.

Keep these separate from `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_WEBHOOK_SECRET`, which belong to the private notification bot.

## Webhook

After deploying, register the public bot webhook with Telegram:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https%3A%2F%2Fwww.sasifysolutions.com%2Fapi%2Fcommerce%3Faction%3Dpublic-telegram-webhook&secret_token=<WEBHOOK_SECRET>
```

The public bot supports `/start`, `/catalog`, `/products`, and `/help`.
