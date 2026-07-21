# Standard ERP

نظام ERP عربي: مخزن بالدفعات، شراء/بيع، كاش وتقسيط، عملاء، موردين، خزنة، تقارير.

## تشغيل محلي

```bash
npm install
npm run db:setup
npm run dev
```

افتح http://localhost:3000

---

## رفع على Vercel (بدون لوجن)

التطبيق **مفيهوش تسجيل دخول**. لو Vercel طلب لوجن، ده حماية النشر من Vercel نفسها — لازم تتقفل.

### 1) قاعدة بيانات سحابية (Turso مجاني)

SQLite المحلي مش بيشتغل على Vercel. استخدم [Turso](https://turso.tech):

```bash
# تثبيت CLI
npm i -g turso

turso auth login
turso db create standarderp
turso db show standarderp --url
turso db tokens create standarderp
```

ادفع الـ schema للقاعدة:

```bash
# مؤقتاً في التيرمنال (Windows PowerShell):
$env:DATABASE_URL="libsql://YOUR-DB.turso.io"
$env:TURSO_AUTH_TOKEN="YOUR_TOKEN"
npx prisma db push
```

### 2) مشروع Vercel

1. ارفع الكود على GitHub
2. Import في [vercel.com](https://vercel.com) → Framework: Next.js
3. Environment Variables:
   - `DATABASE_URL` = `libsql://....turso.io`
   - `TURSO_DATABASE_URL` = نفس الرابط
   - `TURSO_AUTH_TOKEN` = التوكن
4. Deploy

### 3) إلغاء طلب اللوجن (مهم)

في مشروع Vercel:

**Settings → Deployment Protection →** اختَر **Disabled**  
(أو اطفي Vercel Authentication / Standard Protection)

كده العميل يفتح اللينك مباشرة من غير ما يطلب حساب Vercel.
