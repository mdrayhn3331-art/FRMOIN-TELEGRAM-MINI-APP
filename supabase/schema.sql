-- FRMOIN Rewards / Telegram Mini App schema
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.user_level as enum ('Elite','Master');
create type public.task_platform as enum ('google','instagram','tiktok','youtube');
create type public.task_action as enum ('follow','like','comment','repost','review');
create type public.task_status as enum ('active','paused','completed');
create type public.withdrawal_status as enum ('pending','approved','paid','rejected');

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  username text,
  first_name text,
  last_name text,
  photo_url text,
  level public.user_level not null default 'Master',
  trust_score integer not null default 50 check (trust_score between 0 and 100),
  daily_streak integer not null default 0 check (daily_streak >= 0),
  last_login_at timestamptz,
  referred_by uuid references public.users(id) on delete set null,
  referral_code text unique not null default upper(substr(encode(gen_random_bytes(8),'hex'),1,10)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance numeric(18,6) not null default 0 check (balance >= 0),
  lifetime_earned numeric(18,6) not null default 0 check (lifetime_earned >= 0),
  lifetime_paid numeric(18,6) not null default 0 check (lifetime_paid >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform public.task_platform not null,
  action public.task_action not null,
  target_url text not null,
  instructions text,
  payout numeric(18,6) not null check (payout between 0.0001 and 0.02),
  max_completions integer,
  status public.task_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  verification_data jsonb not null default '{}'::jsonb,
  payout numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique(task_id,user_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('task','ad','daily_login','referral','withdrawal','adjustment')),
  amount numeric(18,6) not null,
  balance_after numeric(18,6) not null,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  method text not null check (method in ('bkash','usdt_bep20')),
  account_value text not null,
  amount numeric(18,6) not null check (amount > 0),
  status public.withdrawal_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null unique references public.users(id) on delete cascade,
  tier integer not null default 1 check (tier between 1 and 3),
  commission_rate numeric(5,4) not null default 0.20 check (commission_rate between 0 and 0.25),
  total_commission numeric(18,6) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_logins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  login_date date not null,
  streak_value integer not null default 1,
  reward numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id,login_date)
);

create index if not exists idx_tasks_active on public.tasks(status, platform);
create index if not exists idx_completions_user on public.task_completions(user_id, created_at desc);
create index if not exists idx_transactions_user on public.transactions(user_id, created_at desc);
create index if not exists idx_withdrawals_user on public.withdrawals(user_id, created_at desc);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

-- Keep wallet rows in sync when a user is created.
create or replace function public.create_wallet_for_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.wallets(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_wallet on public.users;
create trigger trg_create_wallet
after insert on public.users
for each row execute function public.create_wallet_for_user();

-- Basic RLS. Sensitive writes should be performed by the Edge Function using the service role.
alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.referrals enable row level security;
alter table public.daily_logins enable row level security;

create policy "public can read active tasks" on public.tasks
for select using (status = 'active');

-- No client-side policy is added for wallet/transaction/withdrawal writes.
-- The Telegram Edge Function must validate Telegram initData before changing balances.
