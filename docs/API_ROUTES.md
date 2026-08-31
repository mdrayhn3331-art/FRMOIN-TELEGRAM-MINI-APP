# FRMOIN API Routes

All protected requests should send the Telegram Mini App `initData`. The server must validate the Telegram WebApp HMAC before trusting the user ID.

Base URL:
`https://<supabase-project>.supabase.co/functions/v1/telegram-rewards`

## POST routes/actions

| Action | Purpose |
|---|---|
| `profile` | Create/update Telegram user profile and return level + trust score |
| `balance` | Return wallet balance, lifetime earnings and recent transactions |
| `daily_login` | Register today's login, update streak and grant configured reward once per day |
| `tasks` | List active Google/Instagram/TikTok/YouTube tasks |
| `task_start` | Register that a user started a task |
| `task_verify` | Verify a task using the configured platform integration and award payout once |
| `reward` | Grant a server-approved ad reward after a valid rewarded-ad event |
| `withdraw` | Create a bKash or USDT BEP20 withdrawal request after minimum-balance checks |
| `withdrawals` | Return the user's withdrawal history |
| `referral` | Return referral code, invite link and commission totals |
| `leaderboard` | Return top users by configured period |

## Suggested request

```json
{
  "action": "balance",
  "initData": "<Telegram.WebApp.initData>"
}
```

## Suggested response

```json
{
  "ok": true,
  "wallet": {
    "balance": 0.004,
    "lifetime_earned": 0.012,
    "lifetime_paid": 0
  },
  "user": {
    "level": "Master",
    "trust_score": 50,
    "daily_streak": 3
  },
  "history": []
}
```

## Security rules

1. Never accept `telegram_id`, balance, payout or trust score from the browser as authoritative data.
2. Validate Telegram `initData` on the server using the bot token stored only as a Supabase Edge Function secret.
3. Apply task payouts in one database transaction and prevent duplicate completion with the `(task_id,user_id)` unique constraint.
4. Keep bKash/USDT payout processing server-side; do not put payment secrets in `index.html` or `app.js`.
5. Social task verification requires the appropriate official platform/API integration or an approved verification provider; do not mark a task verified just because the user clicked a button.
6. Monetag rewards should be granted only after the ad SDK reports successful completion and should be rate-limited server-side.

## Minimum withdrawal examples

Set your business rules in the Edge Function, for example:
- bKash: minimum 1.00 USD-equivalent
- USDT BEP20: minimum 5.00 USD-equivalent

Do not hard-code these values in the client if they are business rules that may change.
