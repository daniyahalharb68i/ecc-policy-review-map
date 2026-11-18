# خارطة مراجعة سياسات ECC · ECC Policy Review Map

أداة لمراجعة الالتزام بالضوابط الأساسية للأمن السيبراني **ECC-2:2024** الصادرة عن الهيئة الوطنية للأمن السيبراني.

A workbench for reviewing compliance with NCA's **Essential Cybersecurity Controls (ECC-2:2024)**.

## ما يميزها

- **النص الرسمي:** نصوص الضوابط الـ108 والضوابط الفرعية الـ92، بالعربية والإنجليزية.
- **ثلاث طبقات لكل ضابط:** موثّق، ومطبّق، وفعّال. تكشف «الالتزام الورقي» و«الممارسة غير الموثقة».
- **المخرجات المتوقعة:** 546 مخرجًا من الدليل الإرشادي الرسمي GECC-2:2026، في قائمة تحقق لكل ضابط.
- **النطاق والانطباق:** الجهات الملزمة والجهات الموصى لها، والضوابط المشروطة بنصها.
- **خارطة معالجة:** ثلاث مراحل، مع حالة لكل فجوة.
- **أدوات المراجعة:** تدقيق تجريبي، وسجل وثائق بمواعيد مراجعتها، وإحالات رسمية من CCC-2:2024.
- **تقرير رسمي:** ملف PDF بالعربية أو الإنجليزية.

**Highlights**
- Official control text in Arabic and English.
- Three layers per control (documented / implemented / effective), with paper-compliance detection.
- The official GECC-2:2026 expected deliverables as a checklist.
- Applicability engine.
- Three-phase remediation roadmap.
- Mock audit, document register, and official CCC references.
- PDF report in Arabic or English.

## التشغيل

النسخة الحالية صفحة واحدة: [`docs/index.html`](docs/index.html).

- **على جهازك:** افتح الملف في المتصفح مباشرة.
- **على GitHub Pages:** فعّلها من *Settings → Pages* بالخيارات: *Deploy from a branch*، وفرع `main`، ومجلد `/docs`.

> في هذه النسخة تُحفظ البيانات في متصفح المستخدم فقط. خذ نسخة احتياطية (JSON) بانتظام من «التقارير والبيانات».
> الذكاء الاصطناعي، والفريق والصلاحيات، وأرشيف التقارير تعمل فقط في النسخة المنشورة داخل Claude.
> ربط الأداة بقاعدة بيانات (Supabase) مخطط له في المرحلة التالية.

## البناء من المصدر

```bash
node src/build.js src
node src/mktest.js src
cp src/out/test.html docs/index.html
```

| الملف | المحتوى |
|---|---|
| `src/data.js` | نصوص الضوابط، والإحالات من CCC، ونصوص الدليل الإرشادي |
| `src/core.js` | نموذج البيانات، والطبقات، والانطباق، والتخزين |
| `src/views.js` | الشاشات |
| `src/pdf.js` | تقرير PDF |
| `src/events.js` | التفاعل |
| `src/i18n.js` و `src/i18n-dict.js` | اللغتان العربية والإنجليزية |
| `src/app.css` و `src/theme.css` و `src/palette.css` | التصميم |

## المصادر

- ECC-2:2024، الهيئة الوطنية للأمن السيبراني.
- CCC-2:2024، النسخة الإنجليزية.
- الدليل الإرشادي لتطبيق الضوابط الأساسية GECC-2:2026، النسخة الإنجليزية.

الأداة لا تمثل الهيئة الوطنية للأمن السيبراني، ولا تحل محل أدوات التقييم الرسمية.
This tool is not affiliated with NCA and does not replace official assessment tools.

---

© 2026 Daniyah Alharbi. جميع الحقوق محفوظة. All rights reserved. See [LICENSE](LICENSE).
