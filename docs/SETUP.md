# تشغيل نظام تقارير Clorox

## 1. ربط Google Sheets

انسخ `backend/.env.example` إلى `backend/.env` ثم ضَع قيمة `SPREADSHEET_ID` (المعرّف الموجود في رابط Google Sheet) وكلمة `JWT_SECRET` طويلة وعشوائية.

تأكّد من مشاركة ملف Google Sheet مع البريد الموجود في ملف حساب الخدمة `backend/config/service-account.json` بصلاحية **Editor**. أسماء الأوراق والأعمدة يجب أن تبقى كما هي في ملف `Sales Usher.xlsx`:

- `Reports`, `Targets`, `ReportTypes`, `Supervisors`, `Delegates`, `Branches`, `Products`, `VacationDelegate`, `VacationType`.

### أمان مهم

ملف `backend/config/service-account.json` يحتوي بيانات اعتماد حساسة. اتركه محليًا فقط، ولا ترفعه إلى Git أو ترسله عبر المحادثة. إذا كان قد وصل إلى مستودع عام أو شخص غير مخول، أنشئ مفتاح حساب خدمة جديدًا من Google Cloud ثم ألغِ المفتاح القديم فورًا.

يمكن للنظام قراءة الكود السري النصي الحالي للتوافق مع الملف الموجود، كما يدعم تلقائيًا القيم المشفّرة بـ `bcrypt` عندما تبدأ قيمة `SecretCode` بـ `$2`. يفضّل ترحيل الأكواد تدريجيًا إلى القيم المشفّرة.

## 2. تشغيل الخادم

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

## 3. تشغيل الواجهة

في نافذة PowerShell ثانية:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

ثم افتح الرابط الذي سيظهر عادةً على `http://localhost:5173`.

للنشر أو عند تشغيل الخادم بعنوان مختلف، انسخ `frontend/.env.example` إلى `frontend/.env` واضبط `VITE_API_BASE_URL` بعنوان واجهة API الصحيح.

## ما تم تنفيذه

- تسجيل الدخول بكود المندوبة والكود السري الموجودين في ورقة `Delegates`.
- لوحة إنجاز شهرية للعملاء والقطع وأنواع التقارير.
- نموذج تقرير مبيعات/فاوتشر/إجازة، مع تصنيف المنتجات، الفروع، الأهداف، والعملاء والملاحظات.
- حفظ التقرير مباشرة في ورقة `Reports` وعرض التقارير السابقة بصورة منظمة.
