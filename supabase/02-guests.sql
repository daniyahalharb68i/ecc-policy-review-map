-- =====================================================================
-- تحديث 2: تسجيل زيارات الضيوف (من يستخدم الأداة دون حساب)
-- © 2026 Daniyah Alharbi. جميع الحقوق محفوظة.
--
-- طريقة التشغيل: Supabase → SQL Editor → New query → الصق الملف كاملًا → Run.
-- آمن لإعادة التشغيل.
--
-- ما يُسجَّل: معرّف عشوائي للجهاز (لا يدل على الشخص)، واليوم، ولغة الواجهة، ونوع الجهاز
-- (جوال أو حاسب)، والصفحات التي فتحها. لا اسم ولا بريد ولا عنوان IP ولا بيانات تقييم.
-- =====================================================================

create table if not exists public.guest_visits (
  device uuid not null,
  day date not null default (now() at time zone 'Asia/Riyadh')::date,
  lang text not null default 'ar' check (lang in ('ar','en')),
  mobile boolean not null default false,
  tabs text[] not null default '{}',
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (device, day),
  constraint guest_tabs_len check (coalesce(array_length(tabs,1),0) <= 20)
);
create index if not exists guest_visits_day_idx on public.guest_visits (day desc);
alter table public.guest_visits enable row level security;
-- لا قراءة ولا كتابة مباشرة لأحد؛ الإضافة تتم عبر الدالة أدناه فقط
revoke all on public.guest_visits from anon, authenticated;

-- يستدعيها المتصفح مرة عند الفتح ومع كل صفحة جديدة يفتحها الضيف
create or replace function public.log_guest(p_device uuid, p_lang text, p_mobile boolean, p_tab text)
returns void language plpgsql security definer set search_path = public as $$
declare t text := case when p_tab ~ '^[a-z]{2,12}$' then p_tab else null end;
begin
  insert into public.guest_visits (device, lang, mobile, tabs)
  values (p_device, case when p_lang = 'en' then 'en' else 'ar' end, coalesce(p_mobile,false),
          case when t is null then '{}' else array[t] end)
  on conflict (device, day) do update
    set last_at = now(),
        tabs = case when t is null or t = any(guest_visits.tabs) or coalesce(array_length(guest_visits.tabs,1),0) >= 20
                    then guest_visits.tabs else guest_visits.tabs || t end;
end $$;
revoke all on function public.log_guest(uuid,text,boolean,text) from public;
grant execute on function public.log_guest(uuid,text,boolean,text) to anon, authenticated;

-- لوحة المنصة: نضيف أرقام الضيوف إلى الأرقام السابقة
create or replace function public.admin_guests() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'g7', (select count(distinct device) from public.guest_visits where day > (now() at time zone 'Asia/Riyadh')::date - 7),
    'g30', (select count(distinct device) from public.guest_visits where day > (now() at time zone 'Asia/Riyadh')::date - 30),
    'gAll', (select count(distinct device) from public.guest_visits),
    'gMobile', (select count(distinct device) from public.guest_visits where mobile and day > (now() at time zone 'Asia/Riyadh')::date - 30),
    'gEn', (select count(distinct device) from public.guest_visits where lang = 'en' and day > (now() at time zone 'Asia/Riyadh')::date - 30),
    'gReturning', (select count(*) from (select device from public.guest_visits group by device having count(*) > 1) r),
    'gDaily', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(day,'YYYY-MM-DD'), 'g', n) order by day)
        from (select day, count(distinct device) n from public.guest_visits
              where day > (now() at time zone 'Asia/Riyadh')::date - 30 group by day) x), '[]'::jsonb),
    'gTabs', coalesce((select jsonb_agg(jsonb_build_object('t', t, 'n', n) order by n desc)
        from (select t, count(*) n from public.guest_visits, unnest(tabs) as u(t)
              where day > (now() at time zone 'Asia/Riyadh')::date - 30 group by t) y), '[]'::jsonb)
  );
end $$;
revoke all on function public.admin_guests() from public, anon;
grant execute on function public.admin_guests() to authenticated;
