# FRMOIN Telegram Mini App

Telegram Mini App for `@frmoin_bot` with a premium rewards UI.

## Current stage
- Telegram WebApp SDK connected
- Mobile-first premium UI
- Telegram user greeting/avatar
- Balance and reward counters
- Monetag rewarded-ad integration hook prepared
- Quick-action buttons for Daily Bonus, Tasks, Invite, Withdraw, History, Leaderboard and Promo Code
- Supabase-ready rewards API contract
- Database schema for users, levels, trust score, daily streaks, tasks, task verification, wallets, transactions, withdrawals and referrals
- No Bot Token or payment secret stored in the repository

## Database
Run `supabase/schema.sql` in the Supabase SQL Editor. Sensitive balance changes should happen through a server-side Edge Function after validating Telegram WebApp `initData`.

## API
See `docs/API_ROUTES.md` for the recommended `telegram-rewards` actions and request/response format.

## Monetag
The official Monetag Telegram Mini App SDK/tag is included in `index.html`. Coins should only be credited after a genuine documented ad-completion event and should be rate-limited server-side.

## Deploy
Deploy this repository as an HTTPS static site using GitHub Pages, Netlify, or another HTTPS host. Then use the deployed Mini App URL when registering the app with Monetag and configuring the Telegram bot.

## Security
Never put the Telegram Bot Token, payment credentials, or Supabase service-role key in browser code. Social task verification must use an appropriate official API/integration or approved verification provider; a client-side click alone is not proof of completion.
