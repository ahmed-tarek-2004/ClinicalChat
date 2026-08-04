# Chat — Frontend

فرونت اند كامل لنظام شات: كل مستخدم يتكلم مع الأدمن فقط، والمستخدمين مش بيشوفوا بعض. مبني فوق الـ Hub اللي بعتّه بالظبط (أسماء الميثودز والـ events متطابقة 100%).

## الصفحات
- `index.html` — تسجيل الدخول (أو لصق JWT مباشرة للتجربة).
- `user.html` — صفحة أي مستخدم عادي، بتفتح محادثة واحدة ثابتة مع الأدمن بس.
- `admin.html` — صفحة الأدمن، فيها قائمة بكل المستخدمين، وكل واحد له محادثة منفصلة تمامًا عن التانية.

## الملفات المشتركة
- `js/config.js` — روابط الـ API والـ Hub (لازم تعدّلها لتطابق مشروعك).
- `js/auth.js` — تخزين وفك تشفير الـ JWT، ومعرفة الدور (admin / user) من claim الـ role.
- `js/api.js` — نداءات REST المفترضة (login, users list, admin info, history).
- `js/chat-hub.js` — الاتصال بـ SignalR ونداء `sendmessage` / `isonline` / `markasread` واستقبال `ReceiveMessage` / `CheckReceiverAvailability` / `IsRead` بنفس الأسماء اللي في الـ Hub بتاعك.
- `css/style.css` — التصميم الموحّد لكل الصفحات.

## حاجات لازم تظبطها عندك (لأنها مش موجودة في الكود اللي بعتّه)
الـ Hub بتاعك ما فيهوش REST endpoints لجلب قائمة المستخدمين أو الـ history أو تسجيل الدخول، فحطيت افتراضات واضحة في `config.js`:

| في الكود | الغرض | المتوقع منه يرجع |
|---|---|---|
| `POST /api/auth/login` | تسجيل الدخول | `{ token: "<JWT>" }` |
| `GET /api/users` | قايمة المستخدمين (للأدمن) | `[{ id, userName }]` |
| `GET /api/users/admin` | بيانات الأدمن (للمستخدم العادي) | `{ id, userName }` |
| `GET /api/messages/{userId}` | تاريخ الرسائل | `[{ id, content, sentAt, senderId }]` |

لو عندك أسماء Endpoints مختلفة، غيّرها في `js/config.js` بس، مفيش داعي تلمس باقي الملفات.

الـ JWT لازم يكون فيه:
- `ClaimTypes.NameIdentifier` (userId)
- `ClaimTypes.Name` (اسم المستخدم)
- role claim فيه كلمة `admin` عشان يعرف يوجّهك لصفحة الأدمن أو المستخدم.

## تشغيل سريع
افتح `index.html` من أي static server (مش file:// مباشرة، عشان الـ fetch والـ SignalR websockets)، مثلاً:

```bash
npx serve .
```

وبعدين افتح `http://localhost:PORT/index.html`.
