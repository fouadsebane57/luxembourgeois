-- =====================================================================
-- LULU TRAJET · SCHÉMA v5.0.0
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run.
-- Le script est idempotent. Il peut être relancé sans casse.
--
-- Principes :
--   RLS activée sur toutes les tables, sans exception.
--   Un utilisateur ne voit et n'écrit que ses propres lignes.
--   Les droits Premium ne sont JAMAIS modifiables par le client.
--   Les compteurs d'usage vocal ne sont JAMAIS modifiables par le client.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILS
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text        not null default 'Apprenant',
  locale        text        not null default 'fr',
  goal          text,                       -- travail, quotidien, nationalite, famille, autre
  daily_goal    integer     not null default 20 check (daily_goal between 5 and 180),
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.profiles is 'Profil applicatif. Une ligne par compte, créée automatiquement.';

-- ---------------------------------------------------------------------
-- 2. PROGRESSION
-- ---------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  snapshot        jsonb       not null default '{}'::jsonb,
  content_version text        not null default '',
  device_id       text        not null default '',
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists user_progress_updated_idx on public.user_progress (updated_at desc);
comment on column public.user_progress.snapshot is
  'Progression complète. Clés = identifiants permanents lxXXXXXXXX, jamais des positions.';

-- ---------------------------------------------------------------------
-- 3. ABONNEMENTS
--    Table écrite uniquement par le serveur. Source de vérité Premium.
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  status              text        not null default 'inactive',
  plan                text        not null default 'free',
  price_id            text,
  stripe_customer_id  text,
  stripe_subscription_id text,
  current_period_end  timestamptz,
  cancel_at_period_end boolean    not null default false,
  updated_at          timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- ---------------------------------------------------------------------
-- 4. USAGE VOCAL  (quota et coût)
--    Une ligne par utilisateur et par mois.
-- ---------------------------------------------------------------------
create table if not exists public.speech_usage (
  user_id       uuid        not null references auth.users(id) on delete cascade,
  period        text        not null,          -- 'YYYY-MM'
  requests      integer     not null default 0,
  audio_ms      bigint      not null default 0,
  errors        integer     not null default 0,
  last_request  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (user_id, period)
);
comment on table public.speech_usage is
  'Compteurs de consommation cloud. Écriture serveur uniquement. Base du quota et du contrôle de coût.';

-- ---------------------------------------------------------------------
-- 5. ÉVÉNEMENTS VOCAUX  (métadonnées seulement, jamais d''audio)
-- ---------------------------------------------------------------------
create table if not exists public.speech_events (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  engine       text,
  model        text,
  lang         text,
  audio_ms     integer,
  latency_ms   integer,
  ok           boolean,
  error_code   text
);
create index if not exists speech_events_user_idx on public.speech_events (user_id, created_at desc);
comment on table public.speech_events is
  'Journal technique. Aucune transcription, aucun audio, aucune donnée de contenu.';

-- ---------------------------------------------------------------------
-- 6. LIMITATION DE DÉBIT
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key         text        primary key,
  window_start timestamptz not null default now(),
  count       integer     not null default 0
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.user_progress  enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.speech_usage   enable row level security;
alter table public.speech_events  enable row level security;
alter table public.rate_limits    enable row level security;

-- profiles : lecture et écriture de sa propre ligne
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- user_progress : lecture et écriture de sa propre ligne
drop policy if exists "progress_select_own" on public.user_progress;
create policy "progress_select_own" on public.user_progress
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.user_progress;
create policy "progress_insert_own" on public.user_progress
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.user_progress;
create policy "progress_update_own" on public.user_progress
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress_delete_own" on public.user_progress;
create policy "progress_delete_own" on public.user_progress
  for delete to authenticated using (auth.uid() = user_id);

-- subscriptions : LECTURE SEULE pour le client. Aucune policy d'écriture.
-- Le client ne peut donc pas se déclarer Premium.
drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- speech_usage : LECTURE SEULE pour le client, pour afficher son quota.
drop policy if exists "usage_select_own" on public.speech_usage;
create policy "usage_select_own" on public.speech_usage
  for select to authenticated using (auth.uid() = user_id);

-- speech_events : lecture seule de ses propres événements.
drop policy if exists "events_select_own" on public.speech_events;
create policy "events_select_own" on public.speech_events
  for select to authenticated using (auth.uid() = user_id);

-- rate_limits : aucune policy. Table inaccessible au client.
-- Seule la clé secrète serveur y accède, car elle contourne la RLS.

-- =====================================================================
-- FONCTIONS ET DÉCLENCHEURS
-- =====================================================================

-- Création automatique du profil et de la ligne d'abonnement à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Apprenant'))
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, status, plan)
  values (new.id, 'inactive', 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Horodatage automatique.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists progress_touch on public.user_progress;
create trigger progress_touch before update on public.user_progress
  for each row execute function public.touch_updated_at();

-- Quota vocal. Appelée par l'Edge Function avec la clé secrète.
-- Renvoie true si la requête est autorisée, et incrémente dans le même appel.
create or replace function public.consume_speech_quota(
  p_user uuid,
  p_audio_ms integer,
  p_max_requests integer,
  p_max_per_minute integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
  v_row public.speech_usage%rowtype;
  v_minute_key text := 'stt:' || p_user::text || ':' || to_char(now(), 'YYYYMMDDHH24MI');
  v_minute_count integer;
begin
  -- 1. Débit par minute
  insert into public.rate_limits (key, window_start, count)
  values (v_minute_key, now(), 1)
  on conflict (key) do update set count = public.rate_limits.count + 1
  returning count into v_minute_count;

  if v_minute_count > p_max_per_minute then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limit',
                              'perMinute', v_minute_count, 'maxPerMinute', p_max_per_minute);
  end if;

  -- 2. Quota mensuel
  insert into public.speech_usage (user_id, period, requests, audio_ms, last_request)
  values (p_user, v_period, 0, 0, now())
  on conflict (user_id, period) do nothing;

  select * into v_row from public.speech_usage where user_id = p_user and period = v_period for update;

  if p_max_requests >= 0 and v_row.requests >= p_max_requests then
    return jsonb_build_object('allowed', false, 'reason', 'quota',
                              'used', v_row.requests, 'limit', p_max_requests, 'period', v_period);
  end if;

  update public.speech_usage
     set requests = requests + 1,
         audio_ms = audio_ms + greatest(0, coalesce(p_audio_ms, 0)),
         last_request = now(),
         updated_at = now()
   where user_id = p_user and period = v_period;

  return jsonb_build_object('allowed', true, 'used', v_row.requests + 1,
                            'limit', p_max_requests, 'period', v_period);
end;
$$;

revoke all on function public.consume_speech_quota(uuid, integer, integer, integer) from public, anon, authenticated;

-- Nettoyage des compteurs de débit. À planifier une fois par jour.
create or replace function public.purge_rate_limits()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limits where window_start < now() - interval '2 hours';
$$;

-- =====================================================================
-- VÉRIFICATION
-- Doit renvoyer rowsecurity = true pour les 6 tables.
-- =====================================================================
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public'
--    and tablename in ('profiles','user_progress','subscriptions','speech_usage','speech_events','rate_limits');
