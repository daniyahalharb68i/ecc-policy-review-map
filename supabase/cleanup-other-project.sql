-- =====================================================================
-- تنظيف: يحذف ما أنشأه ملف 02-guests.sql إذا شُغّل بالخطأ في مشروع آخر.
--
-- ⚠️ شغّليه في المشروع الآخر (نظام الأهداف والمهام) فقط، وليس في ecc-policy-map.
-- تأكدي من اسم المشروع أعلى يسار صفحة Supabase قبل الضغط على Run.
-- يحذف ثلاثة عناصر فقط بأسمائها، ولا يلمس جداولك الأخرى.
-- =====================================================================

drop function if exists public.admin_guests();
drop function if exists public.log_guest(uuid, text, boolean, text);
drop table if exists public.guest_visits;
