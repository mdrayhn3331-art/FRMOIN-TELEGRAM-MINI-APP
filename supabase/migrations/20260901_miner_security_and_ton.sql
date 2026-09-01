-- FRMOIN Miner: device/referral/level/TON ledger hardening
-- Run in Supabase SQL Editor before enabling real-money payouts.

create table if not exists public.miner_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  level_no integer not null default 0 check (level_no between 0 and 6),
  fat_balance numeric(18,6) not null default 0 check (fat_balance >= 0),
  total_taps bigint not null default 0 check (total_taps >= 0),
  today_mined numeric(18,6) not null default 0 check (today_mined >= 0),
  device_key text unique,
  ton_wallet text unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.miner_level_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  level_no integer not null check (level_no between 1 and 6),
  price_usd numeric(18,6) not null,
  price_ton numeric(18,9) not null,
  destination text not null,
  payment_tx_hash text unique,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.miner_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null unique references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','qualified','rejected')),
  qualifying_event text,
  commission_rate numeric(6,5) not null default 0.05 check (commission_rate between 0 and 0.25),
  commission_paid numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  check (referrer_user_id <> referred_user_id)
);

create table if not exists public.miner_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wallet_address text not null,
  fat_amount numeric(18,6) not null check (fat_amount >= 10000),
  ton_amount numeric(18,9) not null check (ton_amount > 0),
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  payout_tx_hash text unique,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists uq_miner_device_key on public.miner_profiles(device_key) where device_key is not null;
create index if not exists idx_miner_referrals_referrer on public.miner_referrals(referrer_user_id, created_at desc);
create index if not exists idx_miner_purchases_user on public.miner_level_purchases(user_id, created_at desc);
create index if not exists idx_miner_withdrawals_user on public.miner_withdrawals(user_id, created_at desc);

alter table public.miner_profiles enable row level security;
alter table public.miner_level_purchases enable row level security;
alter table public.miner_referrals enable row level security;
alter table public.miner_withdrawals enable row level security;

-- No client write policies: all sensitive mutations must go through the Edge Function.
