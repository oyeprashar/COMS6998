-- Apply in the SAME Supabase project used by both applications.
-- Authenticated users can check only whether their OWN email is allowed.
-- Do not grant public SELECT on the allowlist tables.
create or replace function public.is_app_user_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select lower(trim(u.email)) as email
    from auth.users u
    where u.id = (select auth.uid())
  ),
  active_domains as (
    select lower(trim(domain)) as domain
    from public.allowed_signup_domains
    where is_active = true
  ),
  active_emails as (
    select lower(trim(email)) as email
    from public.whitelisted_email_addresses
    where is_active = true
  )
  select case
    when not exists (select 1 from me) then false
    when not exists (select 1 from active_domains)
     and not exists (select 1 from active_emails) then true
    else
      exists (select 1 from me join active_emails using (email))
      or exists (
        select 1
        from me
        join active_domains d
          on split_part(me.email, '@', 2) = d.domain
      )
  end
$$;
revoke all on function public.is_app_user_allowed() from public, anon;
grant execute on function public.is_app_user_allowed() to authenticated;
