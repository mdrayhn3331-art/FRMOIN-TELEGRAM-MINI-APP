-- FRMOIN Miner: mining points + server-side tap cooldown
alter table public.users add column if not exists mining_points bigint not null default 0;
alter table public.users add column if not exists mining_level integer not null default 1;
alter table public.users add column if not exists last_mine_at timestamptz;
alter table public.users add column if not exists total_taps bigint not null default 0;
alter table public.users add column if not exists wallet_address text;

create index if not exists users_referred_by_idx on public.users(referred_by);
create index if not exists users_mining_points_idx on public.users(mining_points desc);
