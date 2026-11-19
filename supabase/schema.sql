-- =====================================================================
-- خارطة مراجعة سياسات ECC — مخطط قاعدة البيانات (Supabase / PostgreSQL)
-- © 2026 Daniyah Alharbi. جميع الحقوق محفوظة.
--
-- طريقة التشغيل: Supabase → SQL Editor → New query → الصق الملف كاملًا → Run.
-- الملف آمن لإعادة التشغيل (يستخدم if not exists / or replace).
-- =====================================================================

-- ---------- الجداول ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('lead','assessor','viewer')),
  doms text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'assessor' check (role in ('lead','assessor','viewer')),
  doms text[] not null default '{}',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- بيانات التقييم: كل وثيقة (ضابط، مكون فرعي، وثيقة، لقطة، تقرير، سجل…) صف واحد
create table if not exists public.org_docs (
  org_id uuid not null references public.organizations(id) on delete cascade,
  col text not null check (col in ('meta','ctl','sub','docs','snaps','fw','ana','audit','reports','log')),
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (org_id, col, id)
);
alter table public.org_docs replica identity full;
create index if not exists org_docs_log_idx on public.org_docs (org_id, col, updated_at desc);

create table if not exists public.visits (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists visits_at_idx on public.visits (at desc);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------- إنشاء الملف الشخصي تلقائيًا عند التسجيل ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- دوال الصلاحيات (security definer لتجنب التكرار في RLS) ----------
create or replace function public.my_role(o uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.memberships where org_id = o and user_id = auth.uid()
$$;

create or replace function public.my_doms(o uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select doms from public.memberships where org_id = o and user_id = auth.uid()
$$;

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

create or replace function public.shares_org(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships a join public.memberships b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = u)
$$;

-- هل يحق للمستخدم الحالي كتابة هذه الوثيقة؟
create or replace function public.can_write_doc(o uuid, c text, i text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r text; d text[];
begin
  select role, doms into r, d from public.memberships where org_id = o and user_id = auth.uid();
  if r is null or r = 'viewer' then return false; end if;
  if r = 'lead' then return true; end if;
  -- assessor
  if c in ('meta','snaps','fw','reports') then return false; end if;
  if c in ('ctl','sub') then
    return coalesce(array_length(d,1),0) = 0 or split_part(i,'-',1) = any(d);
  end if;
  return true; -- docs, ana, audit, log
end $$;

-- ---------- تفعيل RLS ----------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.org_docs enable row level security;
alter table public.visits enable row level security;
alter table public.platform_admins enable row level security;

-- profiles
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_org(id) or public.is_platform_admin());
drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- organizations
drop policy if exists "orgs read" on public.organizations;
create policy "orgs read" on public.organizations for select to authenticated
  using (public.my_role(id) is not null or public.is_platform_admin());
drop policy if exists "orgs update lead" on public.organizations;
create policy "orgs update lead" on public.organizations for update to authenticated
  using (public.my_role(id) = 'lead') with check (public.my_role(id) = 'lead');

-- memberships
drop policy if exists "mem read" on public.memberships;
create policy "mem read" on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.my_role(org_id) is not null or public.is_platform_admin());
drop policy if exists "mem update lead" on public.memberships;
create policy "mem update lead" on public.memberships for update to authenticated
  using (public.my_role(org_id) = 'lead') with check (public.my_role(org_id) = 'lead');
drop policy if exists "mem delete lead" on public.memberships;
create policy "mem delete lead" on public.memberships for delete to authenticated
  using (public.my_role(org_id) = 'lead' and user_id <> auth.uid());

-- invitations
drop policy if exists "inv read" on public.invitations;
create policy "inv read" on public.invitations for select to authenticated
  using (public.my_role(org_id) = 'lead');
drop policy if exists "inv insert" on public.invitations;
create policy "inv insert" on public.invitations for insert to authenticated
  with check (public.my_role(org_id) = 'lead');
drop policy if exists "inv delete" on public.invitations;
create policy "inv delete" on public.invitations for delete to authenticated
  using (public.my_role(org_id) = 'lead');

-- org_docs
drop policy if exists "docs read" on public.org_docs;
create policy "docs read" on public.org_docs for select to authenticated
  using (public.my_role(org_id) is not null);
drop policy if exists "docs insert" on public.org_docs;
create policy "docs insert" on public.org_docs for insert to authenticated
  with check (public.can_write_doc(org_id, col, id));
drop policy if exists "docs update" on public.org_docs;
create policy "docs update" on public.org_docs for update to authenticated
  using (public.can_write_doc(org_id, col, id)) with check (public.can_write_doc(org_id, col, id));
drop policy if exists "docs delete" on public.org_docs;
create policy "docs delete" on public.org_docs for delete to authenticated
  using (public.can_write_doc(org_id, col, id));

-- visits: كل مستخدم يسجّل زيارته فقط، ولا يقرأها أحد مباشرة (تُقرأ مجمّعة عبر admin_overview)
drop policy if exists "visits insert" on public.visits;
create policy "visits insert" on public.visits for insert to authenticated
  with check (user_id = auth.uid() and (org_id is null or public.my_role(org_id) is not null));

-- platform_admins: قراءة الذات فقط، والإضافة من SQL Editor فقط
drop policy if exists "pa read self" on public.platform_admins;
create policy "pa read self" on public.platform_admins for select to authenticated
  using (user_id = auth.uid());

-- ---------- الصلاحيات على مستوى الجداول ----------
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, update, delete on public.memberships to authenticated;
grant select, insert, delete on public.invitations to authenticated;
grant select, insert, update, delete on public.org_docs to authenticated;
grant insert on public.visits to authenticated;
grant select on public.platform_admins to authenticated;

-- ---------- الدوال التي تستدعيها الأداة ----------
-- إنشاء جهة جديدة، ويصبح منشئها مدير التقييم
create or replace function public.create_org(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.organizations (name, created_by) values (trim(p_name), auth.uid()) returning id into o;
  insert into public.memberships (org_id, user_id, role) values (o, auth.uid(), 'lead');
  return o;
end $$;

-- قبول الدعوات الموجهة إلى بريد المستخدم، وتحديث آخر ظهور
create or replace function public.claim_invites() returns int
language plpgsql security definer set search_path = public as $$
declare e text; n int := 0;
begin
  if auth.uid() is null then return 0; end if;
  select lower(email) into e from auth.users where id = auth.uid();
  insert into public.memberships (org_id, user_id, role, doms)
    select org_id, auth.uid(), role, doms from public.invitations where lower(email) = e
    on conflict (org_id, user_id) do nothing;
  get diagnostics n = row_count;
  delete from public.invitations where lower(email) = e;
  update public.profiles set last_seen = now() where id = auth.uid();
  return n;
end $$;

-- لوحة المنصة: أرقام مجمّعة فقط، لمدير المنصة وحده
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'orgs', (select count(*) from public.organizations),
    'active7', (select count(distinct user_id) from public.visits where at > now() - interval '7 days'),
    'active30', (select count(distinct user_id) from public.visits where at > now() - interval '30 days'),
    'visits30', (select count(*) from public.visits where at > now() - interval '30 days'),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'n', n, 'u', u) order by d)
        from (select to_char(date_trunc('day', at), 'YYYY-MM-DD') d, count(*) n, count(distinct user_id) u
              from public.visits where at > now() - interval '30 days' group by 1) x), '[]'::jsonb),
    'people', coalesce((select jsonb_agg(p order by p->>'last' desc nulls last) from (
        select jsonb_build_object(
          'name', pr.name, 'email', pr.email,
          'joined', to_char(pr.created_at, 'YYYY-MM-DD'),
          'last', (select to_char(max(v.at), 'YYYY-MM-DD HH24:MI') from public.visits v where v.user_id = pr.id),
          'visits', (select count(*) from public.visits v where v.user_id = pr.id),
          'edits', (select count(*) from public.org_docs d where d.updated_by = pr.id),
          'orgs', (select count(*) from public.memberships m where m.user_id = pr.id)) p
        from public.profiles pr) y), '[]'::jsonb),
    'orgList', coalesce((select jsonb_agg(jsonb_build_object(
          'name', o.name, 'created', to_char(o.created_at, 'YYYY-MM-DD'),
          'members', (select count(*) from public.memberships m where m.org_id = o.id),
          'assessed', (select count(*) from public.org_docs d where d.org_id = o.id and d.col = 'ctl' and (d.data ? 'd' or d.data ? 'i')),
          'last', (select to_char(max(d.updated_at), 'YYYY-MM-DD') from public.org_docs d where d.org_id = o.id)
        ) order by o.created_at desc) from public.organizations o), '[]'::jsonb),
    'ctl', coalesce((select jsonb_agg(jsonb_build_object(
          'id', id, 'orgs', orgs, 'c', c, 'p', p, 'x', x, 'paper', paper, 'undoc', undoc)) from (
        select id,
          count(distinct org_id) orgs,
          count(*) filter (where data->>'d' = 'y' and data->>'i' = 'y') c,
          count(*) filter (where data->>'d' is not null and data->>'i' is not null
                             and not (data->>'d' = 'y' and data->>'i' = 'y')
                             and not (data->>'d' = 'n' and data->>'i' = 'n')) p,
          count(*) filter (where data->>'d' = 'n' and data->>'i' = 'n') x,
          count(*) filter (where data->>'d' = 'y' and data->>'i' = 'n') paper,
          count(*) filter (where data->>'i' = 'y' and data->>'d' in ('n','p')) undoc
        from public.org_docs where col = 'ctl' and coalesce(data->>'app','') <> 'na' group by id) z), '[]'::jsonb)
  ) into res;
  return res;
end $$;

revoke all on function public.create_org(text) from public, anon;
revoke all on function public.claim_invites() from public, anon;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.create_org(text) to authenticated;
grant execute on function public.claim_invites() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.my_role(uuid), public.my_doms(uuid), public.is_platform_admin(),
  public.shares_org(uuid), public.can_write_doc(uuid,text,text) to authenticated;

-- ---------- التحديث اللحظي ----------
do $$ begin
  begin alter publication supabase_realtime add table public.org_docs; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.memberships; exception when duplicate_object then null; end;
end $$;

-- ---------- تخزين الملفات (الأدلة والتقارير) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

-- المسار دائمًا: <org_id>/<ملف>
drop policy if exists "evidence read" on storage.objects;
create policy "evidence read" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.my_role(((storage.foldername(name))[1])::uuid) is not null);
drop policy if exists "evidence insert" on storage.objects;
create policy "evidence insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.my_role(((storage.foldername(name))[1])::uuid) in ('lead','assessor'));
drop policy if exists "evidence delete" on storage.objects;
create policy "evidence delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and public.my_role(((storage.foldername(name))[1])::uuid) in ('lead','assessor'));

-- =====================================================================
-- بعد التسجيل في الأداة، اجعلي نفسك مديرة المنصة (شغّليها مرة واحدة،
-- وضعي بريدك بدل النص بين علامتي التنصيص):
--
--   insert into public.platform_admins (user_id)
--   select id from auth.users where email = 'بريدك@هنا';
-- =====================================================================
