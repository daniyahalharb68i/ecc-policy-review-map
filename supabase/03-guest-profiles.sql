-- =====================================================================
-- تحديث 3: تعريف الضيف بنفسه (الاسم والجهة والبريد اختياريًا) + أرقام اللوحة لأي فترة
-- © 2026 Daniyah Alharbi. جميع الحقوق محفوظة.
--
-- يُشغَّل في مشروع ecc-policy-map فقط، بعد 02-guests.sql.
-- Supabase → SQL Editor → New query → الصق الملف كاملًا → Run. آمن لإعادة التشغيل.
-- =====================================================================

create table if not exists public.guest_profiles (
  device uuid primary key,
  name text not null check (char_length(name) between 2 and 120),
  org text check (org is null or char_length(org) <= 160),
  email text check (email is null or (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guest_profiles enable row level security;
revoke all on public.guest_profiles from anon, authenticated;

-- يستدعيها المتصفح عندما يعرّف الضيف بنفسه
create or replace function public.register_guest(p_device uuid, p_name text, p_org text, p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.guest_profiles (device, name, org, email)
  values (p_device, left(trim(p_name),120), nullif(left(trim(coalesce(p_org,'')),160),''), nullif(lower(trim(coalesce(p_email,''))),''))
  on conflict (device) do update
    set name = excluded.name, org = excluded.org, email = excluded.email, updated_at = now();
end $$;
revoke all on function public.register_guest(uuid,text,text,text) from public;
grant execute on function public.register_guest(uuid,text,text,text) to anon, authenticated;

-- أرقام اللوحة لفترة محددة بالأيام، أو لكل المدة عند null
drop function if exists public.admin_guests();
create or replace function public.admin_period(p_days int default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d0 date := case when p_days is null then date '2000-01-01' else (now() at time zone 'Asia/Riyadh')::date - p_days + 1 end;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    -- المستخدمون المسجّلون
    'uActive', (select count(distinct user_id) from public.visits where (at at time zone 'Asia/Riyadh')::date >= d0),
    'uVisits', (select count(*) from public.visits where (at at time zone 'Asia/Riyadh')::date >= d0),
    'uDaily', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(d,'YYYY-MM-DD'), 'n', n) order by d) from (
        select (at at time zone 'Asia/Riyadh')::date d, count(distinct user_id) n from public.visits
        where (at at time zone 'Asia/Riyadh')::date >= d0 group by 1) x), '[]'::jsonb),
    -- الضيوف
    'g', (select count(distinct device) from public.guest_visits where day >= d0),
    'gNamed', (select count(distinct v.device) from public.guest_visits v join public.guest_profiles p using (device) where v.day >= d0),
    'gMobile', (select count(distinct device) from public.guest_visits where mobile and day >= d0),
    'gEn', (select count(distinct device) from public.guest_visits where lang = 'en' and day >= d0),
    'gReturning', (select count(*) from (select device from public.guest_visits where day >= d0 group by device having count(*) > 1) r),
    'gDaily', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(day,'YYYY-MM-DD'), 'n', n) order by day) from (
        select day, count(distinct device) n from public.guest_visits where day >= d0 group by day) x), '[]'::jsonb),
    'gTabs', coalesce((select jsonb_agg(jsonb_build_object('t', t, 'n', n) order by n desc) from (
        select u.t, count(*) n from public.guest_visits, unnest(tabs) as u(t) where day >= d0 group by u.t) y), '[]'::jsonb),
    'guests', coalesce((select jsonb_agg(z order by z->>'last' desc) from (
        select jsonb_build_object(
          'name', p.name, 'org', p.org, 'email', p.email,
          'first', to_char(min(v.day),'YYYY-MM-DD'), 'last', to_char(max(v.day),'YYYY-MM-DD'),
          'days', count(*), 'mobile', bool_or(v.mobile),
          'tabs', (select coalesce(array_length(array_agg(distinct t),1),0) from public.guest_visits v2, unnest(v2.tabs) as u2(t) where v2.device = v.device)) z
        from public.guest_visits v left join public.guest_profiles p using (device)
        where v.day >= d0 group by v.device, p.name, p.org, p.email
        order by max(v.day) desc limit 500) w), '[]'::jsonb),
    'first', (select to_char(least(
        coalesce((select min(day) from public.guest_visits), current_date),
        coalesce((select min((at at time zone 'Asia/Riyadh')::date) from public.visits), current_date)),'YYYY-MM-DD'))
  );
end $$;
revoke all on function public.admin_period(int) from public, anon;
grant execute on function public.admin_period(int) to authenticated;
