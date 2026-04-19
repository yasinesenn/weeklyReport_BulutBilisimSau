# 📋 Weekly Report Portal — Proje Dokümantasyonu

> **Kurumsal Haftalık Raporlama Sistemi**
> Ekiplerin haftalık çalışma raporlarını oluşturmasını, yönetmesini ve PDF olarak dışa aktarmasını sağlayan full-stack web uygulaması.

---

## 📌 İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Teknoloji Stack'i](#2-teknoloji-stacki)
3. [Proje Yapısı](#3-proje-yapısı)
4. [Veritabanı Mimarisi](#4-veritabanı-mimarisi)
5. [API Endpoints](#5-api-endpoints)
6. [Server-Side Fonksiyonlar](#6-server-side-fonksiyonlar)
7. [Client-Side Fonksiyonlar](#7-client-side-fonksiyonlar)
8. [Authentication (Kimlik Doğrulama)](#8-authentication)
9. [PDF Export Sistemi](#9-pdf-export-sistemi)
10. [Deployment & Docker](#10-deployment--docker)
11. [Demo Kullanıcılar](#11-demo-kullanıcılar)

---

## 1. Genel Bakış

**Weekly Report Portal**, ekiplerin haftalık bazda raporlarını 4 farklı seviye (severity) ile kaydettiği, filtrelediği ve PDF/HTML olarak dışa aktarabildiği bir kurumsal raporlama platformudur.

### Temel Özellikler
- 🔐 JWT tabanlı kullanıcı kimlik doğrulama
- 📝 Zengin metin editörü ile rapor oluşturma (resim yapıştırma desteği)
- 📊 Severity bazlı rapor sınıflandırma (Info, Highlight, Lowlight, Critical)
- 🗓️ Hafta bazlı rapor filtreleme ve navigasyon
- 👥 Ekip bazlı filtreleme
- 📄 PDF / HTML export (Puppeteer ile)
- 📱 Responsive ve modern UI tasarım
- 🐳 Docker ile containerized deployment

---

## 2. Teknoloji Stack'i

### Backend (Server)

| Teknoloji | Versiyon | Kullanım Amacı |
|---|---|---|
| **Node.js** | 20 (Alpine) | Runtime environment |
| **Express** | ^4.18.2 | HTTP web framework |
| **JSON Web Token** | ^9.0.2 | Authentication & authorization |
| **Multer** | ^1.4.5-lts.1 | Dosya yükleme (file upload) |
| **UUID** | ^9.0.0 | Benzersiz ID üretimi |
| **Puppeteer** | ^22.0.0 | PDF oluşturma (headless Chrome) |
| **CORS** | ^2.8.5 | Cross-Origin Resource Sharing |

### Frontend (Client)

| Teknoloji | Versiyon | Kullanım Amacı |
|---|---|---|
| **React** | ^18.3.1 | UI framework |
| **React DOM** | ^18.3.1 | React DOM renderer |
| **Vite** | ^6.0.0 | Build tool & dev server |
| **TailwindCSS** | ^4.0.0 | Utility-first CSS framework |
| **React Router DOM** | ^7.1.0 | Client-side routing |
| **Axios** | ^1.7.0 | HTTP client |
| **Tiptap** | ^2.11.0 | Rich text (WYSIWYG) editör |
| **Lucide React** | ^0.468.0 | İkon kütüphanesi |
| **Inter Font** | — | Google Fonts tipografi |

### DevOps & Deployment

| Teknoloji | Kullanım |
|---|---|
| **Docker** | Multi-stage container build |
| **Docker Compose** | Orchestration |
| **IIS (web.config)** | Windows/Azure App Service deployment |

---

## 3. Proje Yapısı

```
weekly_report/
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Docker orchestration
├── web.config                    # IIS/Azure deployment config
│
├── server/                       # ── BACKEND ──
│   ├── index.js                  # Ana server dosyası, Express app
│   ├── package.json              # Backend bağımlılıkları
│   ├── db_config.js              # Veritabanı adapter konfigürasyonu
│   ├── middleware/
│   │   └── auth.js               # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js               # Kimlik doğrulama route'ları
│   │   ├── reports.js            # Rapor CRUD route'ları
│   │   └── teams.js              # Ekip route'ları
│   ├── utils/
│   │   └── pdf-export.js         # PDF/HTML export utility
│   ├── db/
│   │   ├── json-adapter.js       # JSON dosya tabanlı DB adapter
│   │   ├── seed.js               # Başlangıç demo verileri
│   │   └── data/                 # JSON veri dosyaları (runtime)
│   └── uploads/                  # Yüklenen dosyalar
│
└── client/                       # ── FRONTEND ──
    ├── index.html                # HTML entry point
    ├── package.json              # Frontend bağımlılıkları
    ├── vite.config.js            # Vite konfigürasyonu & proxy
    └── src/
        ├── main.jsx              # React app entry point
        ├── App.jsx               # Root component, routing
        ├── index.css             # Global stiller & CSS değişkenleri
        ├── api/
        │   └── client.js         # Axios HTTP client (interceptors)
        ├── context/
        │   └── AuthContext.jsx   # Authentication context (React Context)
        ├── utils/
        │   └── weekHelper.js     # ISO hafta hesaplama yardımcıları
        ├── pages/
        │   ├── LoginPage.jsx     # Giriş sayfası
        │   └── DashboardPage.jsx # Ana dashboard sayfası
        └── components/
            ├── layout/
            │   ├── Header.jsx    # Üst header bileşeni
            │   └── Sidebar.jsx   # Sol sidebar navigasyon
            ├── filters/
            │   └── WeekSelector.jsx  # Hafta seçici
            ├── editor/
            │   └── RichTextEditor.jsx # Tiptap WYSIWYG editör
            ├── export/
            │   └── ExportButton.jsx   # PDF export butonu
            └── reports/
                ├── ReportList.jsx     # Rapor listesi
                ├── ReportCard.jsx     # Tekil rapor kartı
                ├── ReportForm.jsx     # Rapor oluşturma/düzenleme formu
                └── SeverityBadge.jsx  # Severity badge bileşeni
```

---

## 4. Veritabanı Mimarisi

### Adapter Pattern
Proje **Database Adapter Pattern** kullanır. `db_config.js` üzerinden aktif adapter seçilir:

| Adapter | Durum | Açıklama |
|---|---|---|
| `json` | ✅ Aktif | Dosya tabanlı JSON storage (`./db/data/`) |
| `postgresql` | 🚧 Planlanmış | PostgreSQL bağlantısı (henüz implement edilmedi) |
| `mongodb` | 🚧 Planlanmış | MongoDB bağlantısı (henüz implement edilmedi) |

> Adapter `DB_ADAPTER` environment variable ile ayarlanır (default: `json`).

### JsonAdapter Sınıfı (`server/db/json-adapter.js`)

JSON dosya tabanlı CRUD operasyonları sunan adapter sınıfı.

| Metod | İmza | Açıklama |
|---|---|---|
| `findAll` | `findAll(collection, filter?)` | Koleksiyondaki tüm kayıtları getirir, opsiyonel filtreleme |
| `findById` | `findById(collection, id)` | ID ile tekil kayıt getirir |
| `create` | `create(collection, doc)` | Yeni kayıt oluşturur |
| `update` | `update(collection, id, updates)` | Mevcut kaydı günceller (partial update) |
| `delete` | `delete(collection, id)` | Kaydı siler |

### Veri Koleksiyonları

#### `teams` Koleksiyonu
```json
{
  "id": "team-1",
  "name": "Backend Team",
  "department": "Engineering"
}
```

#### `users` Koleksiyonu
```json
{
  "id": "user-1",
  "name": "Ahmet Yılmaz",
  "email": "ahmet@company.com",
  "password": "demo123",
  "teamId": "team-1",
  "role": "developer",
  "appName": "Payment Service"
}
```

#### `reports` Koleksiyonu
```json
{
  "id": "uuid-v4",
  "userId": "user-1",
  "teamId": "team-1",
  "appName": "Payment Service",
  "category": "Development",
  "severity": "info | highlight | lowlight | critical",
  "content": "<p>HTML içerik</p>",
  "week": 10,
  "year": 2026,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

## 5. API Endpoints

### 🔓 Kimlik Doğrulama (Auth)

#### `POST /api/auth/login`
- **Auth:** Public (auth gerekmiyor)
- **Body:** `{ email, password }`
- **Response:** `{ token, user }` — JWT token + kullanıcı bilgisi
- **Hata:** `401` geçersiz kimlik bilgileri

#### `GET /api/auth/me`
- **Auth:** 🔒 JWT Required
- **Response:** Giriş yapmış kullanıcının bilgileri (şifre hariç)

---

### 👥 Ekipler (Teams)

#### `GET /api/teams`
- **Auth:** 🔒 JWT Required
- **Response:** Tüm ekiplerin listesi

#### `GET /api/teams/:id`
- **Auth:** 🔒 JWT Required
- **Response:** Tekil ekip detayı
- **Hata:** `404` ekip bulunamazsa

#### `GET /api/teams/:id/members`
- **Auth:** 🔒 JWT Required
- **Response:** Belirtilen ekibin üyeleri (şifre hariç)

---

### 📝 Raporlar (Reports)

#### `GET /api/reports`
- **Auth:** 🔒 JWT Required
- **Query Params:**

| Param | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `week` | number | ✗ | ISO hafta numarası |
| `year` | number | ✗ | Yıl |
| `teamId` | string | ✗ | Ekip ID filtresi |
| `severity` | string | ✗ | Severity filtresi |

- **Response:** Filtrelenmiş rapor listesi (kullanıcı bilgisi zenginleştirilmiş).
- **Sıralama:** Severity önceliğine göre (critical → lowlight → highlight → info), sonra tarih.

#### `GET /api/reports/:id`
- **Auth:** 🔒 JWT Required
- **Response:** Tekil rapor detayı
- **Hata:** `404` rapor bulunamazsa

#### `POST /api/reports`
- **Auth:** 🔒 JWT Required
- **Body:**

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `appName` | string | ✅ | Uygulama adı |
| `category` | string | ✅ | Kategori |
| `severity` | string | ✅ | `info`, `highlight`, `lowlight`, `critical` |
| `content` | string | ✅ | HTML rapor içeriği |
| `week` | number | ✗ | Hafta (default: mevcut hafta) |
| `year` | number | ✗ | Yıl (default: mevcut yıl) |

- **Response:** `201` — Oluşturulan rapor
- **Otomatik alanlar:** `id`, `userId`, `teamId`, `createdAt`, `updatedAt`

#### `PUT /api/reports/:id`
- **Auth:** 🔒 JWT Required
- **Yetki:** Sadece kendi raporunu düzenleyebilir (`403`)
- **Body:** `{ appName?, category?, severity?, content? }` (partial update)
- **Response:** Güncellenen rapor

#### `DELETE /api/reports/:id`
- **Auth:** 🔒 JWT Required
- **Yetki:** Sadece kendi raporunu silebilir (`403`)
- **Response:** `{ message: "Report deleted" }`

---

### 📤 Dosya Yükleme (Upload)

#### `POST /api/upload`
- **Auth:** 🔒 JWT Required
- **Content-Type:** `multipart/form-data`
- **Body:** `image` alanında dosya (max 10MB)
- **Response:** `{ url, filename }` — Yüklenen dosyanın yolu

---

### 📄 PDF Export

#### `GET /api/export/pdf`
- **Auth:** 🔒 JWT Required (token query param ile de geçilebilir)
- **Query Params:**

| Param | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `week` | number | ✅ | Hafta numarası |
| `year` | number | ✅ | Yıl |
| `teamId` | string | ✗ | Ekip filtresi |
| `token` | string | ✗ | JWT token (browser download için) |

- **Response:** PDF dosyası (`Content-Disposition: attachment`). Puppeteer yoksa HTML fallback.

---

### 👤 Kullanıcılar (Users)

#### `GET /api/users`
- **Auth:** 🔒 JWT Required
- **Response:** Tüm kullanıcıların listesi (şifre hariç)

---

### 🌐 SPA Fallback

#### `GET *`
- Production'da, API ve uploads dışındaki tüm istekleri `client/dist/index.html`'e yönlendirir (SPA router desteği).

---

## 6. Server-Side Fonksiyonlar

### `server/index.js` — Ana Server

| Fonksiyon / Yapı | Satır | Açıklama |
|---|---|---|
| Express App kurulumu | 11-17 | CORS, JSON body parser (50MB limit), URL-encoded |
| Uploads directory | 20-24 | `uploads/` dizini oluşturma ve static serve |
| SPA static serve | 27-30 | Production'da `client/dist` dizinini serve etme |
| Database init & seed | 33-46 | İlk çalışmada demo veri yükleme |
| Multer storage config | 49-56 | Dosya yükleme — UUID isim, 10MB limit |
| PDF export handler | 83-136 | Raporları filtrele, kullanıcı bilgisiyle zenginleştir, PDF üret |
| Users list handler | 139-147 | Tüm kullanıcıları listele (şifre hariç) |

### `server/middleware/auth.js` — Authentication

| Fonksiyon | Açıklama |
|---|---|
| `generateToken(user)` | Kullanıcı bilgisinden JWT token üretir (24 saat geçerli). Payload: `id`, `email`, `teamId`, `role` |
| `authMiddleware(req, res, next)` | `Authorization: Bearer <token>` header'ını doğrular, `req.user`'a decode edilmiş kullanıcıyı atar |

### `server/routes/auth.js` — Auth Routes

| Endpoint | İşlev |
|---|---|
| `POST /login` | Email/password ile giriş, JWT token döner |
| `GET /me` | Mevcut kullanıcı bilgilerini döner |

### `server/routes/reports.js` — Report Routes

| Endpoint | İşlev |
|---|---|
| `GET /` | Raporları filtrele ve listele, kullanıcı bilgisiyle zenginleştir, severity'e göre sırala |
| `GET /:id` | Tekil rapor detayı |
| `POST /` | Yeni rapor oluştur (validasyon ile) |
| `PUT /:id` | Rapor güncelle (sahiplik kontrolü) |
| `DELETE /:id` | Rapor sil (sahiplik kontrolü) |
| `getISOWeek(date)` | Verilen tarihten ISO hafta numarası hesaplar |

### `server/routes/teams.js` — Team Routes

| Endpoint | İşlev |
|---|---|
| `GET /` | Tüm ekipleri listele |
| `GET /:id` | Tekil ekip detayı |
| `GET /:id/members` | Ekip üyelerini listele (şifre hariç) |

### `server/utils/pdf-export.js` — PDF Export

| Fonksiyon | Açıklama |
|---|---|
| `generateReportHTML(reports, week, year, teamName)` | Raporlardan stillendirilmiş HTML sayfası üretir. Logo (base64) ve team badge desteği. Severity'e göre gruplar |
| `exportToPDF(reports, week, year, teamName)` | HTML'i Puppeteer ile PDF'e dönüştürür. Puppeteer yoksa HTML olarak fallback döner |

### `server/db/json-adapter.js` — JsonAdapter Class

| Metod | Açıklama |
|---|---|
| `constructor(config)` | Veri dizinini yapılandır ve oluştur |
| `_ensureDataDir()` | Veri dizinini kontrol et, yoksa oluştur |
| `_filePath(collection)` | Koleksiyon JSON dosya yolunu hesapla |
| `_read(collection)` | JSON dosyasını oku ve parse et |
| `_write(collection, data)` | Veriyi JSON dosyasına yaz |
| `findAll(collection, filter?)` | Filtrelenmiş tüm kayıtları getir |
| `findById(collection, id)` | ID ile tekil kayıt getir |
| `create(collection, doc)` | Yeni kayıt oluştur |
| `update(collection, id, updates)` | Mevcut kaydı partial güncelle |
| `delete(collection, id)` | Kaydı sil |

### `server/db/seed.js` — Seed Data

| Export | Açıklama |
|---|---|
| `teams` | 3 demo ekip (Backend, Frontend, DevOps) |
| `users` | 5 demo kullanıcı (her ekipten en az 1) |
| `reports` | 5 demo rapor (farklı severity'lerde) |
| `getISOWeek(date)` | ISO hafta hesaplama (seed'de mevcut haftayı belirlemek için) |

---

## 7. Client-Side Fonksiyonlar

### `src/App.jsx` — Root Component

| Bileşen | Açıklama |
|---|---|
| `ProtectedRoute` | JWT ile korunan route wrapper — giriş yapmamış kullanıcıyı `/login`'e yönlendirir |
| `PublicRoute` | Giriş yapmış kullanıcıyı `/`'e yönlendirir (login sayfası için) |
| `App` | `AuthProvider` + `BrowserRouter` ile routing yapısı |

**Route'lar:**
| Path | Component | Erişim |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/` | `DashboardPage` | Protected |
| `*` | → `/` redirect | — |

### `src/api/client.js` — HTTP Client

| Yapı | Açıklama |
|---|---|
| Axios instance | Base URL: `/api`, JSON content type |
| Request interceptor | Her istek'e localStorage'dan JWT token ekler |
| Response interceptor | `401` yanıtında localStorage temizler ve `/login`'e yönlendirir |

### `src/context/AuthContext.jsx` — Auth Context

| Fonksiyon / State | Açıklama |
|---|---|
| `user` | Mevcut kullanıcı bilgisi (state) |
| `token` | JWT token (state + localStorage) |
| `loading` | Auth durumu yüklenme kontrolü |
| `login(email, password)` | API'ye login isteği atar, token ve user'ı kaydeder |
| `logout()` | Token ve user bilgisini temizler |
| `isAuthenticated` | `!!user` — giriş yapılmış mı kontrolü |
| `useAuth()` | AuthContext'e erişim hook'u |

### `src/utils/weekHelper.js` — Hafta Yardımcıları

| Fonksiyon | Açıklama |
|---|---|
| `getISOWeek(date)` | Verilen tarihten ISO 8601 hafta numarası hesaplar |
| `getCurrentWeekYear()` | Mevcut hafta ve yıl'ı döner |
| `getWeekDateRange(week, year)` | Hafta başlangıç–bitiş tarih aralığını Türkçe format ile döner |
| `getWeeksInYear(year)` | Yılda kaç ISO hafta olduğunu hesaplar (52 veya 53) |

### `src/pages/LoginPage.jsx` — Giriş Sayfası

| Özellik | Açıklama |
|---|---|
| Glassmorphism tasarım | Koyu gradient arka plan, blur efekt |
| Login formu | E-posta + şifre alanları |
| Demo hesaplar | 3 demo hesap butonu (tek tıkla doldurma) |
| Hata gösterimi | API'den dönen hata mesajları |
| Loading state | Giriş işlemi sırasında spinner |

### `src/pages/DashboardPage.jsx` — Ana Dashboard

| Fonksiyon | Açıklama |
|---|---|
| `fetchReports()` | Hafta/yıl/ekip/severity filtrelerine göre raporları çek |
| `fetchTeams()` | Ekip listesini çek |
| `handleWeekChange(week, year)` | Hafta seçici değişikliğini yönet |
| `handleSubmitReport(formData, reportId)` | Yeni rapor oluştur veya mevcut raporu güncelle |
| `handleDeleteReport(id)` | Onaylı rapor silme |
| `handleEdit(report)` | Düzenleme modunu aç |
| `handleCloseForm()` | Rapor form modalını kapat |
| `stats` | Severity bazlı istatistik hesaplama |

### `src/components/layout/Header.jsx`

| Props | Açıklama |
|---|---|
| `title` | Başlık metni |
| `subtitle` | Alt başlık |
| `teamName` | Aktif ekip adı (badge olarak gösterilir) |
| `logoSrc` | Logo resim yolu |

**İçerik:** Logo, başlık, ekip badge, arama alanı, bildirim ikonu, kullanıcı profili.

### `src/components/layout/Sidebar.jsx`

| Özellik | Açıklama |
|---|---|
| Collapse toggle | Sidebar daraltma/genişletme butonu |
| Navigasyon | Dashboard, Ekipler menü linkleri |
| Kullanıcı profili | Alt kısımda avatar, isim, uygulama adı |
| Çıkış butonu | `logout()` çağrısı |

### `src/components/filters/WeekSelector.jsx`

| Props | Açıklama |
|---|---|
| `week` | Aktif hafta numarası |
| `year` | Aktif yıl |
| `onChange(week, year)` | Hafta değişiklik callback'i |

**Özellikler:** İleri/geri ok butonları, yıl geçişi desteği, tarih aralığı gösterimi.

### `src/components/editor/RichTextEditor.jsx`

| Özellik | Açıklama |
|---|---|
| Tiptap editör | StarterKit + Image + Underline uzantıları |
| Toolbar | Bold, Italic, Underline, Strikethrough, Bullet list, Ordered list, Image, Undo, Redo |
| Image paste | Clipboard'dan direkt resim yapıştırma (base64) |
| Image upload | Dosya seçici ile resim yükleme |

### `src/components/export/ExportButton.jsx`

| Props | Açıklama |
|---|---|
| `week` | Hafta numarası |
| `year` | Yıl |
| `teamId` | Opsiyonel ekip filtresi |

**İşlev:** `/api/export/pdf` endpoint'ini query param'larla yeni sekmede açar (browser indirmesi).

### `src/components/reports/ReportList.jsx`

| Props | Açıklama |
|---|---|
| `reports` | Rapor dizisi |
| `loading` | Yüklenme durumu |
| `onEdit` | Düzenleme callback'i |
| `onDelete` | Silme callback'i |
| `currentUserId` | Yetki kontrolü için mevcut kullanıcı ID'si |

**Durumlar:** Loading skeleton, boş durum mesajı, staggered animation.

### `src/components/reports/ReportCard.jsx`

| Özellik | Açıklama |
|---|---|
| Severity renk çubuğu | Sol kenarda severity renginde bar |
| Severity ikonu + badge | Rapor tipini gösteren ikon ve etiket |
| HTML içerik render | `dangerouslySetInnerHTML` ile zengin içerik |
| Sahiplik aksiyonları | Edit + Delete butonları (sadece kendi raporları) |
| Hover efekti | translateY + gölge animasyonu |
| Critical pulse | Kritik raporlar için nabız animasyonu |

### `src/components/reports/ReportForm.jsx`

| Özellik | Açıklama |
|---|---|
| Severity seçici | 4'lü grid buton tasarımı (Info, Highlight, Lowlight, Critical) |
| App name + category | İki sütunlu form alanları |
| RichTextEditor | Tiptap ile zengin içerik düzenleme |
| Kategori seçenekleri | Development, Bug Fix, Feature, Infrastructure, Security, Performance, Deployment, Meeting, Planning, Other |
| Validasyon | App name ve content zorunlu alan kontrolü |
| Modal tasarım | Backdrop + animasyonlu modal pencere |

### `src/components/reports/SeverityBadge.jsx`

| Severity | Renk | İkon |
|---|---|---|
| `info` | Mavi (#3b82f6) | ℹ️ Info |
| `highlight` | Amber (#f59e0b) | ☀️ Sun |
| `lowlight` | Slate (#64748b) | ☁️ Cloud |
| `critical` | Kırmızı (#ef4444) | 🚩 Flag |

**Boyutlar:** `sm`, `md`, `lg` — padding ve font boyutu varyasyonları.

---

## 8. Authentication

### Akış Diyagramı

```
Kullanıcı → POST /api/auth/login (email, password)
         → Server: email ile kullanıcı bul, şifre karşılaştır
         → JWT Token üret (24 saat geçerli)
         → Response: { token, user }
         → Client: localStorage'a token + user kaydet
         → Sonraki istekler: Authorization: Bearer <token>
```

### JWT Token Payload
```json
{
  "id": "user-1",
  "email": "ahmet@company.com",
  "teamId": "team-1",
  "role": "developer",
  "iat": 1709443200,
  "exp": 1709529600
}
```

**Secret Key:** `JWT_SECRET` env variable veya default `weekly-report-secret-key-2026`

---

## 9. PDF Export Sistemi

### İşleyiş
1. Client, `/api/export/pdf?week=X&year=Y&token=JWT` URL'sini yeni sekmede açar
2. Server raporları filtreler ve kullanıcı bilgisiyle zenginleştirir
3. `generateReportHTML()` ile stillendirilmiş HTML üretir
4. Puppeteer varsa → HTML'i headless Chrome'da render edip A4 PDF'e dönüştürür
5. Puppeteer yoksa → HTML dosyası olarak döner (fallback)

### PDF Özellikleri
- **Format:** A4
- **Margin:** üst/alt 20mm, sağ/sol 15mm
- **Logo:** `client/public/logo.png` base64 encode edilmiş
- **Team badge:** Seçili ekip adı header'da gösterilir
- **Severity gruplaması:** Critical → Highlight → Lowlight → Info sırasıyla

---

## 10. Mikro Servis Mimarisi ve Docker Deployment

### 10.1 Mimari Genel Bakış

Uygulama, **3 bağımsız mikro hizmet** olarak tasarlanmıştır. Her mikro hizmet kendi Docker container'ında izole şekilde çalışır ve diğer servislerle yalnızca tanımlı ağ protokolleri üzerinden iletişim kurar. Bu yaklaşım, Martin Fowler'ın tanımladığı mikro servis desenine (Fowler & Lewis, 2014) uygun olarak, her servisin bağımsız deploy edilebilirliğini ve ölçeklenebilirliğini garanti altına alır.

```
┌───────────────────────── Docker Network (weekly-network) ─────────────────────────┐
│                                                                                    │
│  ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐  │
│  │  🌐 FRONTEND        │     │  ⚙️  BACKEND API     │     │  🐘 DATABASE        │  │
│  │  (Mikro Hizmet 1)   │     │  (Mikro Hizmet 2)   │     │  (Mikro Hizmet 3)   │  │
│  │                     │     │                     │     │                     │  │
│  │  Nginx + React SPA  │────▶│  Node.js + Express  │────▶│  PostgreSQL 16      │  │
│  │  Dockerfile.client  │ REST│  Dockerfile.server  │ SQL │  Official Image     │  │
│  │                     │ API │                     │     │                     │  │
│  │  Port: 8080 → 3000  │     │  Port: 5000 → 5001  │     │  Port: 5432 → 5432  │  │
│  └─────────────────────┘     └─────────────────────┘     └─────────────────────┘  │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Mikro Hizmetlerin Sorumlulukları

| Mikro Hizmet | Teknoloji | Sorumluluk | Dockerfile |
|---|---|---|---|
| **Frontend (API Gateway)** | Nginx + React | Statik dosya servisi, reverse proxy, istemci tarafı yönlendirme | `Dockerfile.client` |
| **Backend API** | Node.js + Express | İş mantığı, kimlik doğrulama, CRUD operasyonları, PDF üretimi | `Dockerfile.server` |
| **Database** | PostgreSQL 16 | Veri kalıcılığı, ilişkisel veri yönetimi, indeksleme | Official `postgres:16-alpine` |

**Frontend** servisi aynı zamanda bir **API Gateway** rolü üstlenir: Nginx konfigürasyonu ile gelen istekleri analiz eder ve `/api/*` ile `/uploads/*` isteklerini Backend servisine yönlendirir (reverse proxy). Bu, Newman'ın tanımladığı API Gateway deseniyle (Newman, 2015) örtüşmekte olup, istemcinin yalnızca tek bir giriş noktası (port 3000) üzerinden tüm sisteme erişmesini sağlar.

### 10.3 Servisler Arası İletişim

#### İstek Akışı

```
Kullanıcı (Browser)
    │
    │  HTTP GET http://localhost:3000
    ▼
┌─────────────────────────────────────────────────────┐
│  FRONTEND (Nginx — API Gateway)                     │
│                                                     │
│  nginx.conf:                                        │
│    location /api/ {                                 │
│        proxy_pass http://backend:5000;  ◀── REST    │
│    }                                                │
│    location /uploads/ {                             │
│        proxy_pass http://backend:5000;  ◀── HTTP    │
│    }                                                │
│    location / {                                     │
│        try_files $uri $uri/ /index.html; ◀── SPA   │
│    }                                                │
└──────────────────────┬──────────────────────────────┘
                       │
                       │  REST API (HTTP/JSON)
                       │  Authorization: Bearer <JWT>
                       ▼
┌─────────────────────────────────────────────────────┐
│  BACKEND API (Node.js + Express)                    │
│                                                     │
│  • POST /api/auth/login → JWT token üretimi         │
│  • GET  /api/reports    → Rapor listeleme (SQL)     │
│  • POST /api/reports    → Rapor oluşturma (SQL)     │
│  • GET  /api/export/pdf → PDF üretimi (Puppeteer)   │
│  • GET  /healthz        → Health check              │
│  • GET  /readyz         → DB bağlantı kontrolü      │
└──────────────────────┬──────────────────────────────┘
                       │
                       │  SQL over TCP (pg driver)
                       │  Pool: min=2, max=10
                       ▼
┌─────────────────────────────────────────────────────┐
│  DATABASE (PostgreSQL 16)                           │
│                                                     │
│  Tables: teams, users, reports, templates           │
│  Indexes: team_id, user_id, (week, year)            │
│  Init: /docker-entrypoint-initdb.d/01-init.sql      │
│  Volume: postgres-data (kalıcı depolama)            │
└─────────────────────────────────────────────────────┘
```

#### İletişim Protokolleri

| Kaynak → Hedef | Protokol | Port | Detay |
|---|---|---|---|
| Kullanıcı → Frontend | HTTP | 3000 → 8080 | Browser'dan Nginx'e erişim |
| Frontend → Backend | HTTP (REST API) | 5000 (internal) | Nginx reverse proxy, JSON payload |
| Backend → Database | TCP (PostgreSQL) | 5432 (internal) | `pg` npm client, connection pooling |

Docker network üzerinde servisler birbirlerine **container adı** ile erişir (Docker embedded DNS):
- `http://backend:5000` — Frontend'den Backend'e
- `postgres:5432` — Backend'den PostgreSQL'e

### 10.4 Dockerfile Tasarım Kararları

#### Frontend — `Dockerfile.client` (Multi-Stage Build)

```dockerfile
# Stage 1: Node.js ortamında React uygulamasını build et
FROM node:20-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm ci                    # Tekrarlanabilir bağımlılık kurulumu
COPY client/ ./
RUN npm run build             # Vite ile production build → /app/dist

# Stage 2: Sadece build çıktısını Nginx ile serve et
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
```

Multi-stage build kullanılmasının temel nedeni **image boyutunu minimize etmektir**. Build aşamasında kullanılan Node.js, npm ve kaynak kodlar final image'a dahil edilmez. Bu, Docker'ın resmi dokümantasyonunda önerilen best practice'tir (Docker, 2024).

| Stage | Base Image | Amaç | Final Image'a Katkısı |
|---|---|---|---|
| Build | `node:20-alpine` (~180MB) | React/Vite build | ❌ Dahil edilmez |
| Production | `nginx:alpine` (~7MB) | Static file serve | ✅ Final image |

#### Backend — `Dockerfile.server`

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev    # Sadece production bağımlılıkları
COPY server/ ./server/
EXPOSE 5000
CMD ["node", "index.js"]
```

- **Alpine Linux** tabanlı image ile boyut optimizasyonu
- **Chromium** sistem bağımlılığı: PDF export (Puppeteer) için gerekli
- `npm ci --omit=dev`: devDependencies hariç tutularak image boyutu azaltılır

#### `.dockerignore` Optimizasyonu

```
node_modules
client/node_modules
server/node_modules
client/dist
.git
.env
*.log
server/db/data/*.json
server/uploads/*
```

Bu dosya, Docker build context'ine gereksiz dosyaların gönderilmesini engeller. Özellikle `node_modules` dizinlerinin hariç tutulması, build süresini önemli ölçüde kısaltır.

### 10.5 Docker Compose Orchestration

`docker-compose.yml` dosyası 3 mikro hizmeti tanımlar ve aralarındaki bağımlılıkları yönetir:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d weekly_report"]
      interval: 5s
      retries: 10
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./server/db/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro

  backend:
    build:
      dockerfile: Dockerfile.server
    depends_on:
      postgres:
        condition: service_healthy    # PostgreSQL hazır olana kadar bekle
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5000/healthz || exit 1"]
    environment:
      - DB_ADAPTER=postgresql
      - DB_HOST=postgres              # Docker DNS ile servis adı

  frontend:
    build:
      dockerfile: Dockerfile.client
    depends_on:
      backend:
        condition: service_healthy    # Backend hazır olana kadar bekle

networks:
  weekly-network:
    driver: bridge

volumes:
  postgres-data:
  uploads-data:
```

#### Health Check Zinciri

Servisler arası bağımlılık, **health check tabanlı başlatma sırası** ile yönetilir:

```
PostgreSQL (pg_isready) ──healthy──▶ Backend (/healthz) ──healthy──▶ Frontend
```

Bu yaklaşım, `depends_on` direktifinin yalnızca container başlatma sırasını değil, aynı zamanda servisin **gerçekten hazır olduğunu** garanti altına almasını sağlar. Docker Compose v2'nin `condition: service_healthy` özelliği bu amaca hizmet eder.

#### Volume Yönetimi

| Volume | Mount Point | Amaç |
|---|---|---|
| `postgres-data` | `/var/lib/postgresql/data` | Veritabanı kalıcılığı (container silinse bile veri korunur) |
| `uploads-data` | `/app/server/uploads` | Kullanıcı dosya yüklemeleri |
| `init.sql` (bind mount) | `/docker-entrypoint-initdb.d/` | İlk çalıştırmada otomatik tablo oluşturma |

### 10.6 Veritabanı Katmanı

#### PostgreSQL Tablo Şeması (`init.sql`)

```sql
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    department VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    team_id VARCHAR(64) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    team_id VARCHAR(64) REFERENCES teams(id),
    app_name VARCHAR(255) NOT NULL,
    category VARCHAR(255) DEFAULT '',
    severity VARCHAR(50) NOT NULL,
    importance INTEGER DEFAULT 1,
    content TEXT,
    week INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    team_id VARCHAR(64) REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    items TEXT DEFAULT '[]',
    share_token VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performans indeksleri
CREATE INDEX IF NOT EXISTS idx_reports_team_id ON reports(team_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_week_year ON reports(week, year);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_share_token ON templates(share_token);
```

#### Database Adapter Pattern

Proje, veritabanı bağımsızlığını sağlamak için **Adapter (Wrapper) Pattern** kullanır. `db_config.js` üzerinden aktif adapter seçilir:

| Adapter | Sınıf | Ortam |
|---|---|---|
| `json` | `JsonAdapter` | Lokal geliştirme (Docker'sız) |
| `postgresql` | `PgAdapter` | Docker / Production |

Her iki adapter de aynı interface'i implemente eder: `findAll()`, `findById()`, `create()`, `update()`, `delete()`. Bu, Gamma et al. (1994) tarafından tanımlanan Adapter tasarım deseninin pratik bir uygulamasıdır.

---

## 11. Kubernetes Deployment (Bonus)

### 11.1 Kubernetes Manifest Yapısı

Proje, `k8s/` dizininde 12 adet Kubernetes manifest dosyası içerir:

| Kaynak Türü | Dosya | Açıklama |
|---|---|---|
| Namespace | `namespace.yaml` | `weekly-report` namespace izolasyonu |
| Secret | `postgres-secret.yaml` | DB credentials + JWT secret (base64) |
| ConfigMap | `postgres-configmap.yaml` | `init.sql` tablo şeması |
| PersistentVolumeClaim | `postgres-pvc.yaml` | PostgreSQL veri kalıcılığı (1Gi) |
| PersistentVolumeClaim | `uploads-pvc.yaml` | Dosya yükleme kalıcılığı (512Mi) |
| Deployment | `postgres-deployment.yaml` | PostgreSQL (1 replica, liveness/readiness) |
| Service | `postgres-service.yaml` | ClusterIP :5432 |
| Deployment | `backend-deployment.yaml` | Backend (2 replica, initContainer) |
| Service | `backend-service.yaml` | ClusterIP :5000 |
| Deployment | `frontend-deployment.yaml` | Frontend (2 replica) |
| Service | `frontend-service.yaml` | NodePort :30080 |
| Ingress | `ingress.yaml` | URL-tabanlı yönlendirme kuralları |

### 11.2 Kubernetes Mimarisi

```
┌──────────────────── Kubernetes Cluster ────────────────────────┐
│                                                                 │
│  ┌─── Ingress (nginx) ───────────────────────────────────┐     │
│  │  /api/*     → backend-svc:5000                        │     │
│  │  /uploads/* → backend-svc:5000                        │     │
│  │  /*         → frontend-svc:8080                       │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ frontend-1 │  │ backend-1  │  │  postgres   │               │
│  │ frontend-2 │  │ backend-2  │  │  (1 replica) │              │
│  │ (2 replica) │  │ (2 replica) │  │             │              │
│  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘              │
│        │               │                │                       │
│  frontend-svc     backend-svc      postgres-svc                │
│  (NodePort)       (ClusterIP)      (ClusterIP)                 │
│                                                                 │
│  PVC: uploads-pvc (512Mi)    PVC: postgres-data-pvc (1Gi)      │
└─────────────────────────────────────────────────────────────────┘
```

### 11.3 Yüksek Erişilebilirlik (High Availability)

- **Frontend**: 2 replica ile yük dengeleme
- **Backend**: 2 replica, `RollingUpdate` stratejisi ile sıfır kesinti güncelleme
- **Database**: 1 replica (stateful workload — production'da PostgreSQL HA cluster önerilir)
- **initContainer**: Backend pod'ları, PostgreSQL hazır olana kadar başlamaz (`wait-for-postgres`)

### 11.4 Resource Management

Her container için CPU ve memory limitleri tanımlanmıştır:

| Servis | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| PostgreSQL | 100m | 500m | 256Mi | 512Mi |
| Backend | 100m | 500m | 256Mi | 512Mi |
| Frontend | 50m | 200m | 64Mi | 128Mi |

---

## 12. Ölçeklenebilirlik ve Performans Analizi

### 12.1 Yatay Ölçekleme (Horizontal Scaling)

Mikro servis mimarisi, her servisin bağımsız olarak ölçeklenmesine olanak tanır:

```bash
# Backend'i 5 instance'a ölçekle
kubectl -n weekly-report scale deployment/backend --replicas=5

# Frontend'i 3 instance'a ölçekle
kubectl -n weekly-report scale deployment/frontend --replicas=3
```

**Ölçekleme Stratejisi:**

| Servis | Ölçekleme Yeteneği | Dikkat Edilecekler |
|---|---|---|
| Frontend | ✅ Kolay (stateless) | Load balancer arkasında çoklu instance |
| Backend | ✅ Kolay (mostly stateless) | JWT stateless auth, dosya yüklemeleri PVC ile paylaşılır |
| Database | ⚠️ Dikkatli | Read replica'lar eklenebilir, write scaling için sharding gerekir |

### 12.2 Monolitik vs Mikro Servis Karşılaştırması

| Kriter | Monolitik Yaklaşım | Mikro Servis (Mevcut) |
|---|---|---|
| Deploy | Tüm uygulama birlikte | Her servis bağımsız |
| Ölçekleme | Tüm uygulama ölçeklenir | Sadece ihtiyaç olan servis |
| Hata izolasyonu | Bir hata tüm sistemi etkiler | Hatalar servis bazında izole |
| Teknoloji bağımsızlığı | Tek stack | Her servis farklı teknoloji kullanabilir |
| Karmaşıklık | Düşük | Orta-yüksek (ağ, orchestration) |
| Geliştirme hızı | Küçük ekiplerde hızlı | Büyük ekiplerde paralel geliştirme |

### 12.3 Gözlemlenen Performans

Docker Compose ortamında yapılan testlerde:

| Metrik | Değer |
|---|---|
| Toplam başlatma süresi (ilk build) | ~5-10 dakika |
| Toplam başlatma süresi (cache ile) | ~15 saniye |
| PostgreSQL health check geçiş süresi | ~6 saniye |
| Backend readiness süresi | ~11 saniye |
| API yanıt süresi (GET /healthz) | <10ms |
| Frontend ilk yükleme (gzip) | <500ms |

---

## 13. Demo Kullanıcılar

İlk çalışmada otomatik seed edilen demo hesaplar:

| İsim | Username | Şifre | Ekip |
|---|---|---|---|
| Ahmet Yılmaz | ahmet.yilmaz | demo123 | ICT-AO-NIQS |
| Elif Demir | elif.demir | demo123 | ICT-AO-NIQS |
| Mehmet Kara | mehmet.kara | demo123 | ICT-AO-FRONTEND |
| Zeynep Aksoy | zeynep.aksoy | demo123 | ICT-AO-FRONTEND |
| Can Öztürk | can.ozturk | demo123 | ICT-AO-DEVOPS |

---

## 14. Sonuç ve Değerlendirme

Bu proje, modern yazılım geliştirme pratiklerinin bir araya getirildiği kapsamlı bir full-stack uygulamadır. Mikro servis mimarisi sayesinde her bileşen bağımsız olarak geliştirilebilir, test edilebilir ve ölçeklenebilir hale getirilmiştir.

Docker container'ları ile elde edilen **ortam bağımsızlığı**, uygulamanın herhangi bir platformda (geliştirici bilgisayarı, CI/CD pipeline, production sunucusu) tutarlı şekilde çalışmasını garanti eder. Kubernetes desteği ile production-grade orchestration, otomatik iyileşme (self-healing), ve bildirimsel altyapı yönetimi (declarative infrastructure) sağlanmıştır.

### Gelecek İyileştirme Önerileri

1. **Monitoring**: Prometheus + Grafana ile metrik toplama
2. **Log Aggregation**: ELK Stack veya Loki ile merkezi log yönetimi
3. **CI/CD Pipeline**: GitHub Actions ile otomatik build/deploy
4. **Database HA**: PostgreSQL streaming replication veya Patroni
5. **Cache Layer**: Redis ile API yanıt önbellekleme

---

## 15. Kaynakça

1. **Fowler, M., & Lewis, J.** (2014). *Microservices: A Definition of This New Architectural Term*. martinfowler.com. https://martinfowler.com/articles/microservices.html

2. **Newman, S.** (2015). *Building Microservices: Designing Fine-Grained Systems*. O'Reilly Media. ISBN: 978-1491950357.

3. **Docker Documentation.** (2024). *Best practices for writing Dockerfiles*. https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

4. **Kubernetes Documentation.** (2024). *Concepts: Workloads, Services, Networking*. https://kubernetes.io/docs/concepts/

5. **Gamma, E., Helm, R., Johnson, R., & Vlissides, J.** (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley. ISBN: 978-0201633610.

6. **Burns, B., Grant, B., Oppenheimer, D., Brewer, E., & Wilkes, J.** (2016). *Borg, Omega, and Kubernetes*. ACM Queue, 14(1), 70-93. https://doi.org/10.1145/2898442.2898444

---

> 📅 Bu dokümantasyon son olarak **19 Nisan 2026** tarihinde güncellenmiştir.
