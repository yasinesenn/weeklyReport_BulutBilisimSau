# Weekly Report Portal — Mikro Servis Mimarisi

Kurumsal haftalık raporlama sistemi.  
**3 bağımsız mikro hizmet** (Frontend · Backend API · Veritabanı) Docker container'larında çalışır ve `docker compose up` komutuyla tek seferde ayağa kalkar.

---

## 📋 İçindekiler

1. [Mikro Servis Mimarisi](#1--mikro-servis-mimarisi)
2. [Teknik Gereksinimlerin Karşılanması](#2--teknik-gereksinimlerin-karşılanması)
3. [Ön Gereksinimler](#3--ön-gereksinimler)
4. [Sıfırdan Kurulum ve Çalıştırma (Docker Compose)](#4--sıfırdan-kurulum-ve-çalıştırma-docker-compose)
5. [Kubernetes ile Deploy (Bonus)](#5--kubernetes-ile-deploy-bonus)
6. [Servisler Arası İletişim](#6--servisler-arası-i̇letişim)
7. [Proje Yapısı](#7--proje-yapısı)
8. [Veritabanı Yönetimi](#8--veritabanı-yönetimi)
9. [API Referansı](#9--api-referansı)
10. [Demo Hesaplar](#10--demo-hesaplar)
11. [Lokal Geliştirme (Docker'sız)](#11--lokal-geliştirme-dockersız)
12. [Sorun Giderme](#12--sorun-giderme)

---

## 1. 🏗 Mikro Servis Mimarisi

Uygulama 3 bağımsız mikro hizmetten oluşur. Her biri kendi Docker container'ında çalışır:

```
┌─────────────────────── Docker Network (weekly-network) ───────────────────────┐
│                                                                                │
│  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐    │
│  │  🌐 FRONTEND      │     │  ⚙️  BACKEND API   │     │  🐘 DATABASE      │    │
│  │  (Mikro Hizmet 1) │     │  (Mikro Hizmet 2) │     │  (Mikro Hizmet 3) │    │
│  │                   │     │                   │     │                   │    │
│  │  Nginx + React    │────▶│  Node.js/Express  │────▶│  PostgreSQL 16    │    │
│  │  Dockerfile.client│     │  Dockerfile.server│     │  (Official Image) │    │
│  │                   │     │                   │     │                   │    │
│  │  Port: 8080       │     │  Port: 5000       │     │  Port: 5432       │    │
│  └───────────────────┘     └───────────────────┘     └───────────────────┘    │
│       ↕ :3000                    ↕ :5001                    ↕ :5432           │
│    (host port)                (host port)                (host port)          │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Servis Detayları

| Mikro Hizmet | Teknoloji | Dockerfile | Container Adı | İç Port → Dış Port |
|-------------|-----------|------------|---------------|---------------------|
| **Frontend** | Nginx + React SPA | `Dockerfile.client` | weekly-report-frontend | 8080 → 3000 |
| **Backend API** | Node.js + Express | `Dockerfile.server` | weekly-report-backend | 5000 → 5001 |
| **Database** | PostgreSQL 16 | Official Image | weekly-report-db | 5432 → 5432 |

---

## 2. ✅ Teknik Gereksinimlerin Karşılanması

| # | Gereksinim | Durum | Detay |
|---|-----------|-------|-------|
| 1 | En az 2 farklı mikro hizmet | ✅ | **3 mikro hizmet**: Frontend (Nginx), Backend API (Node.js), Database (PostgreSQL) |
| 2 | Her mikro hizmet için ayrı Dockerfile | ✅ | `Dockerfile.client` (Frontend), `Dockerfile.server` (Backend), PostgreSQL official image |
| 3 | docker-compose.yml ile bağlama | ✅ | Tüm servisler `docker-compose.yml` içinde tanımlı, ortak `weekly-network` ağında |
| 4 | Servisler arası iletişim | ✅ | Frontend→Backend: **REST API** (Nginx reverse proxy), Backend→DB: **SQL over TCP** |
| 5 | `docker compose up` ile başlatılabilir | ✅ | `docker compose up --build -d` — tek komut, health check ile sıralı başlatma |
| 6 | (Bonus) Kubernetes deployment | ✅ | `k8s/` dizininde 12 manifest dosyası + `deploy-k8s.sh` otomasyon scripti |

---

## 3. 🔧 Ön Gereksinimler

Projeyi çalıştırmak için aşağıdaki yazılımlar gereklidir:

### Docker Compose ile Çalıştırma (Zorunlu)

| Yazılım | Minimum Versiyon | İndirme |
|---------|-----------------|---------|
| Docker Desktop | 24.0+ | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| Docker Compose | v2.20+ | Docker Desktop ile birlikte gelir |

> **Not:** Docker Desktop kurulumu tamamlandığında Docker Compose da otomatik olarak kullanılabilir hale gelir.

### Kubernetes ile Çalıştırma (Bonus — Opsiyonel)

| Yazılım | Minimum Versiyon | İndirme |
|---------|-----------------|---------|
| kubectl | 1.28+ | [kubernetes.io/docs/tasks/tools](https://kubernetes.io/docs/tasks/tools/) |
| Minikube | 1.32+ | [minikube.sigs.k8s.io/docs/start](https://minikube.sigs.k8s.io/docs/start/) |

### Versiyon Kontrolü

Kurulumdan sonra aşağıdaki komutlarla her şeyin düzgün kurulduğunu doğrulayın:

```bash
docker --version          # Docker version 24.x+ beklenir
docker compose version    # Docker Compose version v2.x+ beklenir
```

---

## 4. 🚀 Sıfırdan Kurulum ve Çalıştırma (Docker Compose)

Farklı bir bilgisayarda sıfırdan projeyi ayağa kaldırmak için aşağıdaki adımları takip edin.

### Adım 1: Projeyi İndirin

```bash
# Git ile klonlama
git clone https://github.com/yasinesenn/weeklyReport_BulutBilisimSau.git
cd weeklyReport_BulutBilisimSau

# VEYA zip dosyasını açtıktan sonra
cd weeklyReport_BulutBilisimSau
```

### Adım 2: Tüm Servisleri Başlatın

```bash
docker compose up --build -d
```

Bu tek komut şunları otomatik olarak yapar:
1. 🐘 PostgreSQL 16 image'ını indirir ve container'ı başlatır
2. 🗄️ `init.sql` dosyası ile veritabanı tablolarını otomatik oluşturur
3. ⚙️ Backend API'yi Dockerfile.server ile build edip container'ı başlatır
4. 🌐 Frontend'i Dockerfile.client ile build edip (Nginx) container'ı başlatır
5. 🌱 Seed data (demo veriler) otomatik yüklenir

> **İlk çalıştırmada** Docker image'ları build edildiği için **5-10 dakika** sürebilir.  
> Sonraki çalıştırmalarda cache kullanılacağı için **birkaç saniye** sürer.

### Adım 3: Servislerin Durumunu Kontrol Edin

```bash
docker compose ps
```

**Beklenen çıktı** (3 servis çalışıyor olmalı):

```
NAME                     IMAGE                    STATUS                    PORTS
weekly-report-db         postgres:16-alpine       Up 30s (healthy)          0.0.0.0:5432->5432/tcp
weekly-report-backend    weekly_node-backend      Up 25s (healthy)          0.0.0.0:5001->5000/tcp
weekly-report-frontend   weekly_node-frontend     Up 20s                    0.0.0.0:3000->8080/tcp
```

> **Önemli:** `postgres` ve `backend` servisleri `(healthy)` durumunda olmalıdır.  
> Health check'ler başarılı olana kadar bağımlı servisler başlamaz.

### Adım 4: Sağlık Kontrolü (Health Check)

```bash
# Backend çalışıyor mu?
curl http://localhost:5001/healthz
# Beklenen: {"status":"ok"}

# Backend veritabanına bağlanabiliyor mu?
curl http://localhost:5001/readyz
# Beklenen: {"status":"ready"}
```

### Adım 5: Uygulamayı Kullanın

Tarayıcınızı açın ve aşağıdaki adreslere gidin:

| Servis | URL | Açıklama |
|--------|-----|----------|
| 🌐 **Frontend** | [http://localhost:3000](http://localhost:3000) | Web arayüzü (kullanıcı girişi burada) |
| ⚙️ **Backend API** | [http://localhost:5001/healthz](http://localhost:5001/healthz) | REST API sağlık kontrolü |
| 🐘 **PostgreSQL** | `localhost:5432` | DBeaver/pgAdmin ile bağlanılabilir |

> **Giriş bilgileri** için [Demo Hesaplar](#10--demo-hesaplar) bölümüne bakınız.

### Adım 6: Durdurma ve Temizleme

```bash
# Servisleri durdur (veriler korunur)
docker compose down

# Servisleri durdur VE tüm verileri sil (temiz başlangıç)
docker compose down -v

# Servisleri yeniden build et (kod değişikliği sonrası)
docker compose up --build -d

# Canlı log takibi
docker compose logs -f

# Sadece bir servisin logları
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f frontend
```

---

## 5. ☸️ Kubernetes ile Deploy (Bonus)

### Adım 1: Minikube Kurulumu

#### macOS (Apple Silicon — M1/M2/M3)
```bash
curl -Lo /tmp/minikube https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-arm64
sudo mv /tmp/minikube /usr/local/bin/minikube
sudo chmod +x /usr/local/bin/minikube
```

#### macOS (Intel)
```bash
curl -Lo /tmp/minikube https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
sudo mv /tmp/minikube /usr/local/bin/minikube
sudo chmod +x /usr/local/bin/minikube
```

#### Windows (PowerShell — Yönetici olarak çalıştırın)
```powershell
New-Item -Path 'C:\minikube' -ItemType Directory -Force
Invoke-WebRequest -OutFile 'C:\minikube\minikube.exe' -Uri 'https://github.com/kubernetes/minikube/releases/latest/download/minikube-windows-amd64.exe'
$oldPath = [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable('Path', "$oldPath;C:\minikube", [EnvironmentVariableTarget]::Machine)
```

#### Linux
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

#### kubectl kurulumu (yoksa)
```bash
# macOS
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/arm64/kubectl"
sudo mv kubectl /usr/local/bin/kubectl && sudo chmod +x /usr/local/bin/kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/kubectl
```

### Adım 2: Minikube Cluster'ı Başlatın

```bash
minikube start --driver=docker --cpus=4 --memory=4096
```

Başarılı çıktı:
```
✅ minikube v1.x.x on Darwin
✅ Using the docker driver
✅ Starting "minikube" primary control-plane node
✅ kubectl is now configured to use "minikube" cluster
```

### Adım 3: Docker Image'ları Build Edin

Minikube kendi Docker daemon'ını kullanır. Image'ları **Minikube'un içinde** build etmemiz gerekir:

```bash
# Terminali Minikube Docker ortamına bağla
eval $(minikube docker-env)

# Backend image
docker build -t weekly-report-backend:latest -f Dockerfile.server .

# Frontend image
docker build -t weekly-report-frontend:latest -f Dockerfile.client .
```

### Adım 4: Kubernetes'e Deploy Edin

#### Otomatik (Önerilen)
```bash
chmod +x deploy-k8s.sh
./deploy-k8s.sh
```

#### Manuel (Adım adım)
```bash
# 1. Namespace
kubectl apply -f k8s/namespace.yaml

# 2. Secrets (DB şifreleri, JWT)
kubectl apply -f k8s/postgres-secret.yaml

# 3. ConfigMap (init.sql — tablo oluşturma)
kubectl apply -f k8s/postgres-configmap.yaml

# 4. Persistent Volume Claims (kalıcı depolama)
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/uploads-pvc.yaml

# 5. PostgreSQL deploy
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl -n weekly-report rollout status deployment/postgres --timeout=120s

# 6. Backend deploy
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl -n weekly-report rollout status deployment/backend --timeout=180s

# 7. Frontend deploy
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# 8. Ingress (opsiyonel)
kubectl apply -f k8s/ingress.yaml
```

### Adım 5: Durumu Kontrol Edin

```bash
# Tüm pod'lar
kubectl -n weekly-report get pods

# Beklenen çıktı (5 pod çalışıyor):
# NAME                        READY   STATUS    RESTARTS
# postgres-xxxxx              1/1     Running   0
# backend-xxxxx               1/1     Running   0
# backend-yyyyy               1/1     Running   0
# frontend-xxxxx              1/1     Running   0
# frontend-yyyyy              1/1     Running   0

# Tüm kaynaklar
kubectl -n weekly-report get all
```

### Adım 6: Uygulamaya Erişin

```bash
# Browser'ı otomatik aç
minikube service frontend -n weekly-report

# Sadece URL'i al
minikube service frontend -n weekly-report --url
```

### Kubernetes'ten Kaldırma

```bash
# Tüm kaynakları sil (tek komut)
./deploy-k8s.sh delete

# Veya manuel
kubectl delete namespace weekly-report

# Minikube cluster'ı durdur
minikube stop

# Minikube cluster'ı tamamen sil
minikube delete
```

### Kubernetes Faydalı Komutlar

```bash
# Pod logları
kubectl -n weekly-report logs -f deployment/backend
kubectl -n weekly-report logs -f deployment/postgres

# Pod'a shell aç
kubectl -n weekly-report exec -it deployment/backend -- sh

# PostgreSQL'e bağlan
kubectl -n weekly-report exec -it deployment/postgres -- psql -U postgres -d weekly_report

# Deployment ölçekle (3 backend instance)
kubectl -n weekly-report scale deployment/backend --replicas=3

# Dashboard (web arayüzü)
minikube dashboard
```

---

## 6. 🔀 Servisler Arası İletişim

### İletişim Akışı

```
Kullanıcı (Browser)
    │
    │  HTTP Request (http://localhost:3000)
    ▼
┌─────────────────────────────────────────────┐
│  FRONTEND (Nginx — API Gateway Görevi)      │
│                                             │
│  • Statik dosyalar → /usr/share/nginx/html  │
│  • /api/* istekleri → Backend'e proxy       │
│  • /uploads/* → Backend'e proxy             │
│                                             │
│  nginx.conf:                                │
│    location /api/ {                          │
│      proxy_pass http://backend:5000;        │
│    }                                        │
└────────────────┬────────────────────────────┘
                 │
                 │  REST API (HTTP/JSON)
                 │  Örn: POST /api/auth/login
                 │       GET  /api/reports
                 ▼
┌─────────────────────────────────────────────┐
│  BACKEND API (Node.js + Express)            │
│                                             │
│  • JWT Authentication                       │
│  • CRUD işlemleri (reports, templates)       │
│  • PDF export (Puppeteer)                   │
│  • Health check endpoints                   │
└────────────────┬────────────────────────────┘
                 │
                 │  SQL over TCP (pg driver)
                 │  Örn: SELECT * FROM reports
                 │       INSERT INTO users ...
                 ▼
┌─────────────────────────────────────────────┐
│  DATABASE (PostgreSQL 16)                   │
│                                             │
│  • 4 tablo: teams, users, reports, templates│
│  • Otomatik tablo oluşturma (init.sql)      │
│  • Kalıcı depolama (Docker Volume)          │
└─────────────────────────────────────────────┘
```

### İletişim Protokolleri

| Kaynak → Hedef | Protokol | Port | Açıklama |
|----------------|----------|------|----------|
| Kullanıcı → Frontend | HTTP | 3000 (dış) → 8080 (iç) | Browser'dan web arayüzüne erişim |
| Frontend → Backend | HTTP (REST API) | 5000 (internal) | Nginx reverse proxy ile `/api/*` yönlendirme |
| Backend → Database | TCP (PostgreSQL) | 5432 (internal) | `pg` npm paketi ile SQL sorguları |

### Docker Network

Tüm 3 servis aynı Docker bridge network (`weekly-network`) üzerinde çalışır.  
Servisler birbirlerine **container adı** ile erişir (DNS resolution):
- Frontend → `http://backend:5000` (nginx.conf'ta tanımlı)
- Backend → `postgres:5432` (db_config'te tanımlı)

---

## 7. 📁 Proje Yapısı

```
weekly_node/
│
├── docker-compose.yml            # ★ 3 servisi birbirine bağlayan orchestration dosyası
├── Dockerfile.client             # ★ Frontend (Mikro Hizmet 1) — Nginx + React
├── Dockerfile.server             # ★ Backend  (Mikro Hizmet 2) — Node.js + Express
├── nginx.conf                    #   Frontend Nginx konfigürasyonu (reverse proxy)
├── deploy-k8s.sh                 #   Kubernetes tek komut deploy scripti
├── README.md                     #   Bu dosya
│
├── client/                       # React Frontend kaynak kodları
│   ├── src/
│   │   ├── components/           # UI bileşenleri (ReportCard, ReportForm, vb.)
│   │   ├── pages/                # Sayfa bileşenleri (Dashboard, Login, vb.)
│   │   ├── context/              # React Context (AuthContext)
│   │   └── index.css             # Tailwind CSS stilleri
│   ├── package.json              # Frontend bağımlılıkları
│   └── vite.config.js            # Vite konfigürasyonu
│
├── server/                       # Node.js Backend kaynak kodları
│   ├── config/index.js           # Ortam değişkenleri konfigürasyonu
│   ├── db/
│   │   ├── init.sql              # ★ PostgreSQL tablo şeması (otomatik çalışır)
│   │   ├── pg-adapter.js         # PostgreSQL veritabanı adapter'ı
│   │   ├── json-adapter.js       # JSON dosya adapter'ı (geliştirme modu)
│   │   └── seed.js               # Demo veri (ilk çalıştırmada otomatik yüklenir)
│   ├── middleware/auth.js        # JWT authentication middleware
│   ├── routes/                   # Express API route'ları
│   │   ├── auth.js               # /api/auth/* (login, me)
│   │   ├── reports.js            # /api/reports/* (CRUD)
│   │   ├── teams.js              # /api/teams/*
│   │   └── templates.js          # /api/templates/*
│   ├── utils/pdf-export.js       # Puppeteer ile PDF oluşturma
│   ├── index.js                  # Express sunucu giriş noktası
│   └── package.json              # Backend bağımlılıkları
│
└── k8s/                          # ★ Kubernetes manifest dosyaları (Bonus)
    ├── namespace.yaml            # weekly-report namespace
    ├── postgres-secret.yaml      # DB şifreleri (base64 encoded)
    ├── postgres-configmap.yaml   # init.sql ConfigMap
    ├── postgres-pvc.yaml         # PostgreSQL veri kalıcılığı (1Gi)
    ├── postgres-deployment.yaml  # PostgreSQL deployment (1 replica)
    ├── postgres-service.yaml     # PostgreSQL ClusterIP service
    ├── backend-deployment.yaml   # Backend deployment (2 replica)
    ├── backend-service.yaml      # Backend ClusterIP service
    ├── frontend-deployment.yaml  # Frontend deployment (2 replica)
    ├── frontend-service.yaml     # Frontend NodePort service
    ├── uploads-pvc.yaml          # Dosya yükleme kalıcılığı (512Mi)
    └── ingress.yaml              # Ingress routing kuralları
```

---

## 8. 🗄️ Veritabanı Yönetimi

### PostgreSQL'e Bağlanma

#### Docker Compose üzerinden
```bash
# İnteraktif psql shell aç
docker exec -it weekly-report-db psql -U postgres -d weekly_report

# Tek bir sorgu çalıştır
docker exec weekly-report-db psql -U postgres -d weekly_report -c "SELECT * FROM users;"
```

#### Kubernetes üzerinden
```bash
kubectl -n weekly-report exec -it deployment/postgres -- psql -U postgres -d weekly_report
```

#### Harici Veritabanı Client (DBeaver, pgAdmin, DataGrip)

| Parametre | Değer |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `weekly_report` |
| User | `postgres` |
| Password | `weekly_report_secret_2026` |

### Veritabanı Tabloları

```sql
-- Tabloları listele
\dt

-- Tablo yapısını gör
\d+ reports
```

| Tablo | Açıklama |
|-------|----------|
| `teams` | Takım bilgileri (id, name, slug, department) |
| `users` | Kullanıcı bilgileri (id, name, username, password, team_id) |
| `reports` | Haftalık raporlar (app_name, severity, content, week, year) |
| `templates` | Rapor şablonları (name, items, share_token) |

### Örnek SQL Sorguları

```sql
SELECT id, name, username, team_id FROM users;
SELECT id, app_name, severity, week, year FROM reports;
SELECT * FROM teams;
SELECT id, name, user_id FROM templates;
\q   -- çıkış
```

---

## 9. 🔌 API Referansı

Tüm API endpoint'leri `http://localhost:5001` üzerinden erişilebilir.

### Kimlik Doğrulama

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `POST` | `/api/auth/login` | Kullanıcı girişi (JWT token döner) | ❌ |
| `GET` | `/api/auth/me` | Mevcut kullanıcı bilgisi | ✅ |

### Raporlar

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `GET` | `/api/reports` | Haftalık raporları listele | ✅ |
| `POST` | `/api/reports` | Yeni rapor oluştur | ✅ |
| `PUT` | `/api/reports/:id` | Rapor güncelle | ✅ |
| `DELETE` | `/api/reports/:id` | Rapor sil | ✅ |

### Template / Şablonlar

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `GET` | `/api/templates` | Şablonları listele | ✅ |
| `POST` | `/api/templates` | Yeni şablon oluştur | ✅ |
| `PUT` | `/api/templates/:id` | Şablon güncelle | ✅ |
| `DELETE` | `/api/templates/:id` | Şablon sil | ✅ |
| `GET` | `/api/shared/:token` | Paylaşılan şablonu görüntüle | ❌ |

### Diğer

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `GET` | `/api/teams` | Takımları listele | ✅ |
| `POST` | `/api/upload` | Dosya yükle (10MB max) | ✅ |
| `GET` | `/api/export/pdf` | Haftalık raporu PDF olarak indir | ✅ |
| `GET` | `/api/export/template/:id` | Şablonu PDF olarak indir | ✅ |
| `GET` | `/healthz` | Servis sağlık kontrolü | ❌ |
| `GET` | `/readyz` | Veritabanı bağlantı kontrolü | ❌ |

---

## 10. 👥 Demo Hesaplar

Uygulama ilk çalıştırıldığında aşağıdaki demo veriler otomatik yüklenir:

| Kullanıcı | Username | Şifre | Takım |
|-----------|----------|-------|-------|
| Ahmet Yılmaz | `ahmet.yilmaz` | `demo123` | ICT-AO-NIQS |
| Elif Demir | `elif.demir` | `demo123` | ICT-AO-NIQS |
| Mehmet Kara | `mehmet.kara` | `demo123` | ICT-AO-FRONTEND |
| Zeynep Aksoy | `zeynep.aksoy` | `demo123` | ICT-AO-FRONTEND |
| Can Öztürk | `can.ozturk` | `demo123` | ICT-AO-DEVOPS |

---

## 11. 💻 Lokal Geliştirme (Docker'sız)

Docker kullanmadan, doğrudan Node.js ile çalıştırmak için:

### Backend

```bash
cd server
npm install
npm run dev
# → http://localhost:5001 adresinde çalışır
# → DB_ADAPTER=json modunda JSON dosyaları kullanılır
```

### Frontend

```bash
cd client
npm install
npm run dev
# → http://localhost:5173 adresinde çalışır
# → API istekleri otomatik olarak localhost:5001'e proxy'lenir
```

---

## 12. 🔧 Sorun Giderme

### Servisler başlamıyor

```bash
# Container loglarını kontrol edin
docker compose logs backend
docker compose logs postgres
docker compose logs frontend

# Container'ları sıfırdan build edin
docker compose down -v
docker compose up --build -d
```

### PostgreSQL bağlantı hatası

```bash
# PostgreSQL çalışıyor mu?
docker exec weekly-report-db pg_isready -U postgres
# Beklenen: accepting connections

# Backend DB'ye bağlanabiliyor mu?
curl http://localhost:5001/readyz
# Beklenen: {"status":"ready"}
```

### Port çakışması (Address already in use)

```bash
# Hangi process portu kullanıyor?
lsof -i :3000   # Frontend
lsof -i :5001   # Backend
lsof -i :5432   # PostgreSQL

# Çözüm: docker-compose.yml'deki port'ları değiştirin
# "3001:8080"  → Frontend
# "5002:5000"  → Backend
# "5433:5432"  → PostgreSQL
```

### Image'ları temizleme (disk alanı)

```bash
# Kullanılmayan tüm Docker kaynaklarını temizle
docker system prune -a
```

### Minikube sorunları

```bash
minikube status                                    # Durumu kontrol et
minikube delete && minikube start --driver=docker  # Sıfırla
minikube dashboard                                 # Web arayüzü
```

---

## 📄 Ortam Değişkenleri Referansı

| Değişken | Varsayılan | Açıklama |
|----------|-----------|----------|
| `NODE_ENV` | `development` | Ortam: development / production |
| `PORT` | `5001` | Backend API port |
| `DB_ADAPTER` | `json` | Veritabanı: `json` veya `postgresql` |
| `DB_HOST` | `localhost` | PostgreSQL host adresi |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `weekly_report` | Veritabanı adı |
| `DB_USER` | `postgres` | Veritabanı kullanıcısı |
| `DB_PASSWORD` | `password` | Veritabanı şifresi |
| `JWT_SECRET` | `super-secret-fallback-key` | JWT token imzalama anahtarı |
| `UPLOAD_DIR` | `./uploads` | Dosya yükleme dizini |
| `LDAP_ENABLED` | `false` | LDAP kimlik doğrulama |
