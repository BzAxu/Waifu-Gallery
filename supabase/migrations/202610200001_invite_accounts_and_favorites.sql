-- Waifu-Gallery invite-only accounts and per-user cloud favorites.
-- Apply this migration in the Supabase SQL Editor or with the Supabase CLI.

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_at timestamptz,
  used_email text,
  revoked_at timestamptz,
  reserved_token uuid,
  reserved_until timestamptz,
  constraint invite_codes_hash_format check (code_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists invite_codes_created_at_idx
  on public.invite_codes (created_at desc);
create index if not exists invite_codes_active_idx
  on public.invite_codes (expires_at)
  where used_at is null and revoked_at is null;

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  source text not null default 'unknown',
  title text not null default '随机插画',
  created_at timestamptz not null default now(),
  constraint favorites_https_url check (image_url ~ '^https://[^[:space:]]+$'),
  constraint favorites_image_url_length check (char_length(image_url) <= 2048),
  constraint favorites_source_length check (char_length(source) <= 80),
  constraint favorites_title_length check (char_length(title) <= 240),
  constraint favorites_user_image_unique unique (user_id, image_url)
);

create index if not exists favorites_user_created_idx
  on public.favorites (user_id, created_at desc);

alter table public.invite_codes enable row level security;
alter table public.favorites enable row level security;

-- Invite codes must never be readable or writable through the public client API.
revoke all on table public.invite_codes from anon, authenticated;
grant all on table public.invite_codes to service_role;

-- A signed-in user may access only their own favorites.
revoke all on table public.favorites from anon;
grant select, insert, delete on table public.favorites to authenticated;
grant all on table public.favorites to service_role;

drop policy if exists "Users read their own favorites" on public.favorites;
create policy "Users read their own favorites"
  on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own favorites" on public.favorites;
create policy "Users add their own favorites"
  on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove their own favorites" on public.favorites;
create policy "Users remove their own favorites"
  on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Atomically reserve a single-use invite code while the invitation email is sent.
-- A reservation expires after 10 minutes if the request crashes.
create or replace function public.reserve_invite_code(
  p_code_hash text,
  p_email text,
  p_token uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invite_codes
     set reserved_token = p_token,
         reserved_until = now() + interval '10 minutes'
   where code_hash = p_code_hash
     and used_at is null
     and revoked_at is null
     and (expires_at is null or expires_at > now())
     and (reserved_until is null or reserved_until < now());
  return found;
end;
$$;

create or replace function public.complete_invite_code(
  p_code_hash text,
  p_email text,
  p_token uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invite_codes
     set used_at = now(),
         used_email = lower(trim(p_email)),
         reserved_token = null,
         reserved_until = null
   where code_hash = p_code_hash
     and reserved_token = p_token
     and used_at is null
     and revoked_at is null;
  return found;
end;
$$;

create or replace function public.release_invite_code(
  p_code_hash text,
  p_token uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invite_codes
     set reserved_token = null,
         reserved_until = null
   where code_hash = p_code_hash
     and reserved_token = p_token
     and used_at is null;
  return found;
end;
$$;

revoke all on function public.reserve_invite_code(text, text, uuid) from public, anon, authenticated;
revoke all on function public.complete_invite_code(text, text, uuid) from public, anon, authenticated;
revoke all on function public.release_invite_code(text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_invite_code(text, text, uuid) to service_role;
grant execute on function public.complete_invite_code(text, text, uuid) to service_role;
grant execute on function public.release_invite_code(text, uuid) to service_role;
