# FRMOIN Rewards — Feature Architecture

## 1. Database

Run `supabase/schema.sql` in Supabase SQL Editor. Core tables:
- `users`: Telegram identity, Elite/Master level, trust score 0–100, daily streak and referral code.
- `wallets`: balance, lifetime earned and lifetime paid.
- `tasks`: Google Reviews, Instagram, TikTok and YouTube tasks; payout range `$0.0001`–`$0.02`.
- `task_completions`: pending/verified/rejected completion records.
- `transactions`: earning and withdrawal ledger.
- `withdrawals`: bKash and USDT BEP20 requests.
- `referrals`: tier and 20–25% commission settings.
- `daily_logins`: one record per user/day for streaks.

Keep RLS enabled. Never expose the Supabase service-role key to the browser.

## 2. Telegram authentication

The Mini App sends `Telegram.WebApp.initData` to `/functions/v1/telegram-rewards`. The Edge Function validates Telegram WebApp HMAC before trusting the user ID.

Set these server secrets:
- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never commit a bot token to GitHub. If a token was exposed, revoke/regenerate it in BotFather.

## 3. API actions

POST `/functions/v1/telegram-rewards` with `{ action, initData, ... }`.

| Action | Purpose |
|---|---|
| `profile` | Upsert Telegram profile and return level/trust/streak. |
| `balance` | Wallet + recent transactions. |
| `daily_login` | Daily streak + one reward per day. |
| `tasks` | List active social tasks. |
| `task_start` | Start a task and return its target URL. |
| `task_verify` | Verification adapter entry point. |
| `reward` | Process approved Monetag rewarded-ad events with cooldown. |
| `withdraw` | Validate minimum/balance and create payout request. |
| `withdrawals` | Withdrawal history. |
| `referral` | Referral code, invite link and commission data. |

## 4. Task verification

Do not pay a user just because a browser button was clicked. Implement platform-specific verification using an official API or approved verification provider. Store evidence in `task_completions.verification_data`, then mark verified and credit the wallet once.

## 5. Wallet/payout flow

1. Server receives a verified earning event.
2. Update wallet and create a transaction.
3. User submits a withdrawal request.
4. Server checks method, minimum, balance and account format.
5. Create `pending` withdrawal.
6. Admin/payment worker processes it and records `approved`, `paid`, or `rejected`.

Example Edge Function minimums: bKash `$1`, USDT BEP20 `$5`. Keep these rules server-side.

## 6. Referral flow

Invite URL: `https://t.me/frmoin_bot?start=ref_<code>`.

Resolve the code when a new Telegram user joins, store the relationship in `referrals`, and credit commissions only from qualifying revenue. Do not reward self-referrals or fraudulent traffic.

## 7. Home UI

Recommended cards/buttons:
- Telegram profile + Elite/Master badge
- Trust score 0–100
- Daily login streak
- Wallet balance
- Watch Ad & Earn
- Daily Bonus
- Daily Tasks
- Withdraw
- Reward History
- Invite Friends
- Leaderboard

See `docs/UI_LAYOUT.html` for a basic layout snippet.