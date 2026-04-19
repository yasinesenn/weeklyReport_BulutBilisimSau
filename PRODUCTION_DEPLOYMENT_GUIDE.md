# 🚀 Production Deployment & Technical Guide

> **Weekly Report Portal — Production-Ready Technical Documentation**
> Node.js (Express) + React (Vite) Uygulaması — IIS / Docker Deployment

---

## 📌 İçindekiler

1. [LDAP Integration (Configurable)](#1-ldap-integration-configurable)
2. [Database Configuration (Configurable)](#2-database-configuration-configurable)
3. [IIS Deployment (Priority)](#3-iis-deployment-priority)
4. [Build & Release Process](#4-build--release-process)
5. [Production Hardening](#5-production-hardening)

---

## 1. LDAP Integration (Configurable)

> Bu proje şu anda JWT tabanlı local authentication kullanmaktadır. Production ortamında **LDAP/Active Directory** entegrasyonuna geçiş yapılacaktır.

### 1.1 Önerilen Node.js LDAP Kütüphanesi

```bash
npm install ldapjs
```

| Kütüphane | Açıklama |
|---|---|
| **ldapjs** | Saf JavaScript LDAP client, en yaygın Node.js LDAP kütüphanesi |
| **passport-ldapauth** | Passport.js ile LDAP stratejisi (Express middleware uyumlu) |
| **activedirectory2** | Active Directory'ye özel yüksek seviyeli wrapper |

### 1.2 LDAP Konfigürasyon Yapısı

Tüm LDAP ayarları **environment variable** ile yapılandırılmalı, hiçbir değer hard-code edilmemelidir.

#### Konfigürasyon Dosyası: `server/config/ldap.config.js`

```javascript
/**
 * LDAP Configuration
 * All values are configurable via environment variables.
 * No hard-coded credentials or server addresses.
 */
const LDAP_CONFIG = {
  // ── Connection ──
  enabled:        process.env.LDAP_ENABLED === 'true',         // LDAP açık/kapalı toggle
  url:            process.env.LDAP_URL || 'ldap://ldap.company.com',
  port:           parseInt(process.env.LDAP_PORT) || 389,
  
  // ── SSL/TLS (LDAPS) ──
  useSsl:         process.env.LDAP_USE_SSL === 'true',         // true ise ldaps:// kullanılır
  sslPort:        parseInt(process.env.LDAP_SSL_PORT) || 636,
  tlsOptions: {
    rejectUnauthorized: process.env.LDAP_REJECT_UNAUTHORIZED !== 'false',
    // Self-signed sertifika için: ca: [fs.readFileSync('/path/to/ca.crt')]
  },
  
  // ── Bind Credentials (Service Account) ──
  bindDN:         process.env.LDAP_BIND_DN,                    // 'CN=svc_app,OU=Service,DC=company,DC=com'
  bindPassword:   process.env.LDAP_BIND_PASSWORD,              // Güvenli depolama!
  
  // ── Search Configuration ──
  baseDN:         process.env.LDAP_BASE_DN || 'DC=company,DC=com',
  searchFilter:   process.env.LDAP_SEARCH_FILTER || '(sAMAccountName={{username}})',
  searchScope:    process.env.LDAP_SEARCH_SCOPE || 'sub',      // 'base', 'one', 'sub'
  
  // ── Attribute Mapping ──
  attributes: {
    username:     process.env.LDAP_ATTR_USERNAME || 'sAMAccountName',
    email:        process.env.LDAP_ATTR_EMAIL || 'mail',
    displayName:  process.env.LDAP_ATTR_DISPLAY_NAME || 'displayName',
    memberOf:     process.env.LDAP_ATTR_MEMBER_OF || 'memberOf',
    department:   process.env.LDAP_ATTR_DEPARTMENT || 'department',
  },
  
  // ── Group Mapping (LDAP Group → App Team) ──
  groupMapping: {
    // Env: LDAP_GROUP_MAP='CN=BackendTeam,OU=Groups,DC=company,DC=com:team-1;CN=FrontendTeam,...:team-2'
    raw: process.env.LDAP_GROUP_MAP || '',
  },
  
  // ── Timeouts & Resilience ──
  connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT) || 5000,   // ms
  searchTimeout:  parseInt(process.env.LDAP_SEARCH_TIMEOUT) || 10000,   // ms
  idleTimeout:    parseInt(process.env.LDAP_IDLE_TIMEOUT) || 300000,    // ms (5 min)
  maxRetries:     parseInt(process.env.LDAP_MAX_RETRIES) || 3,
  retryDelay:     parseInt(process.env.LDAP_RETRY_DELAY) || 1000,      // ms
  
  // ── Failover ──
  failoverUrl:    process.env.LDAP_FAILOVER_URL || '',                  // Yedek LDAP sunucusu
  fallbackToLocal: process.env.LDAP_FALLBACK_LOCAL === 'true',          // LDAP erişilemezse local auth'a düş
};

module.exports = LDAP_CONFIG;
```

### 1.3 LDAP Authentication Service: `server/services/ldap-auth.js`

```javascript
const ldap = require('ldapjs');
const LDAP_CONFIG = require('../config/ldap.config');

class LdapAuthService {
  /**
   * LDAP ile kullanıcı doğrulama
   * 1. Service account ile LDAP'a bağlan (bind)
   * 2. Kullanıcıyı searchFilter ile ara
   * 3. Bulunan kullanıcının DN'i ile tekrar bind yap (credential doğrulama)
   * 4. Kullanıcı bilgilerini döndür
   */
  async authenticate(username, password) {
    if (!LDAP_CONFIG.enabled) {
      throw new Error('LDAP authentication is not enabled');
    }

    const client = this._createClient();

    try {
      // Step 1: Service account ile bind
      await this._bind(client, LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword);

      // Step 2: Kullanıcıyı ara
      const user = await this._searchUser(client, username);
      if (!user) {
        throw new Error('User not found in LDAP directory');
      }

      // Step 3: Kullanıcının şifresi ile doğrula
      const userClient = this._createClient();
      try {
        await this._bind(userClient, user.dn, password);
      } finally {
        userClient.unbind();
      }

      // Step 4: Kullanıcı bilgilerini döndür
      return this._mapUserAttributes(user);
    } catch (err) {
      // Failover: yedek LDAP sunucusunu dene
      if (LDAP_CONFIG.failoverUrl && !err._failoverAttempted) {
        console.warn(`Primary LDAP failed, trying failover: ${err.message}`);
        err._failoverAttempted = true;
        return this._authenticateWithFailover(username, password);
      }

      // Fallback: LDAP erişilemezse local auth'a düş
      if (LDAP_CONFIG.fallbackToLocal && this._isConnectionError(err)) {
        console.warn('LDAP unreachable, falling back to local authentication');
        return null; // null = local auth'a devam et
      }

      throw err;
    } finally {
      client.unbind();
    }
  }

  _createClient(url) {
    const serverUrl = url || (LDAP_CONFIG.useSsl
      ? `ldaps://${new URL(LDAP_CONFIG.url).hostname}:${LDAP_CONFIG.sslPort}`
      : LDAP_CONFIG.url);

    return ldap.createClient({
      url: serverUrl,
      connectTimeout: LDAP_CONFIG.connectTimeout,
      timeout: LDAP_CONFIG.searchTimeout,
      idleTimeout: LDAP_CONFIG.idleTimeout,
      tlsOptions: LDAP_CONFIG.useSsl ? LDAP_CONFIG.tlsOptions : undefined,
      reconnect: true,
    });
  }

  _bind(client, dn, password) {
    return new Promise((resolve, reject) => {
      client.bind(dn, password, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  _searchUser(client, username) {
    const filter = LDAP_CONFIG.searchFilter.replace('{{username}}', username);
    const opts = {
      filter,
      scope: LDAP_CONFIG.searchScope,
      attributes: Object.values(LDAP_CONFIG.attributes),
      timeLimit: LDAP_CONFIG.searchTimeout / 1000,
    };

    return new Promise((resolve, reject) => {
      client.search(LDAP_CONFIG.baseDN, opts, (err, res) => {
        if (err) return reject(err);
        let user = null;
        res.on('searchEntry', (entry) => { user = entry; });
        res.on('error', (err) => reject(err));
        res.on('end', () => resolve(user));
      });
    });
  }

  _mapUserAttributes(ldapUser) {
    const attrs = LDAP_CONFIG.attributes;
    const get = (attr) => {
      const val = ldapUser.ppiObject?.[attr] || ldapUser.object?.[attr];
      return Array.isArray(val) ? val[0] : val;
    };
    return {
      username:    get(attrs.username),
      email:       get(attrs.email),
      displayName: get(attrs.displayName),
      department:  get(attrs.department),
      groups:      ldapUser.object?.[attrs.memberOf] || [],
      dn:          ldapUser.dn,
    };
  }

  _isConnectionError(err) {
    return ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ConnectionError']
      .some(code => err.message?.includes(code) || err.code === code);
  }

  async _authenticateWithFailover(username, password) {
    const client = this._createClient(LDAP_CONFIG.failoverUrl);
    try {
      await this._bind(client, LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword);
      const user = await this._searchUser(client, username);
      if (!user) throw new Error('User not found');
      const uc = this._createClient(LDAP_CONFIG.failoverUrl);
      try { await this._bind(uc, user.dn, password); } finally { uc.unbind(); }
      return this._mapUserAttributes(user);
    } finally {
      client.unbind();
    }
  }
}

module.exports = new LdapAuthService();
```

### 1.4 Auth Middleware Entegrasyonu

Mevcut `server/routes/auth.js` login endpoint'i şu şekilde güncellenir:

```javascript
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const LDAP_CONFIG = require('../config/ldap.config');

    let appUser = null;

    // ── LDAP Authentication (Production) ──
    if (LDAP_CONFIG.enabled) {
      const ldapAuth = require('../services/ldap-auth');
      const ldapUser = await ldapAuth.authenticate(email, password);

      if (ldapUser) {
        // LDAP'tan gelen kullanıcıyı DB'ye sync et (yoksa oluştur)
        let existing = await db.findAll('users', { email: ldapUser.email });
        if (existing.length === 0) {
          appUser = await db.create('users', {
            id: uuidv4(),
            name: ldapUser.displayName,
            email: ldapUser.email,
            teamId: resolveTeamFromGroups(ldapUser.groups),
            role: 'developer',
            source: 'ldap',
          });
        } else {
          appUser = existing[0];
        }
      } else if (LDAP_CONFIG.fallbackToLocal) {
        // LDAP erişilemedi, local auth'a düş
        appUser = await localAuth(email, password);
      }
    } else {
      // ── Local Authentication (Development) ──
      appUser = await localAuth(email, password);
    }

    if (!appUser) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(appUser);
    const { password: _, ...safe } = appUser;
    res.json({ token, user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### 1.5 Ortam Bazlı LDAP Konfigürasyonu

#### Development (`.env.development`)
```env
LDAP_ENABLED=false
# Development'ta LDAP kapalı, local auth kullanılır
```

#### Test (`.env.test`)
```env
LDAP_ENABLED=true
LDAP_URL=ldap://test-ldap.company.local
LDAP_PORT=389
LDAP_USE_SSL=false
LDAP_BIND_DN=CN=svc_test,OU=Service,DC=company,DC=local
LDAP_BIND_PASSWORD=test-service-password
LDAP_BASE_DN=DC=company,DC=local
LDAP_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_FALLBACK_LOCAL=true
```

#### Production (`.env.production`)
```env
LDAP_ENABLED=true
LDAP_URL=ldap://dc01.company.com
LDAP_PORT=389
LDAP_USE_SSL=true
LDAP_SSL_PORT=636
LDAP_BIND_DN=CN=svc_weeklyreport,OU=ServiceAccounts,DC=company,DC=com
LDAP_BIND_PASSWORD=<SECURE_VALUE_FROM_VAULT>
LDAP_BASE_DN=OU=Users,DC=company,DC=com
LDAP_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_SEARCH_SCOPE=sub
LDAP_CONNECT_TIMEOUT=5000
LDAP_SEARCH_TIMEOUT=10000
LDAP_MAX_RETRIES=3
LDAP_FAILOVER_URL=ldap://dc02.company.com
LDAP_FALLBACK_LOCAL=false
LDAP_REJECT_UNAUTHORIZED=true
LDAP_GROUP_MAP=CN=BackendTeam,OU=Groups,DC=company,DC=com:team-1;CN=FrontendTeam,OU=Groups,DC=company,DC=com:team-2
```

### 1.6 Credential Güvenliği

> [!CAUTION]
> LDAP bind password (service account şifresi) asla kaynak kodda veya `.env` dosyasında düz metin olarak bulunmamalıdır.

| Yöntem | Ortam | Açıklama |
|---|---|---|
| **IIS Environment Variables** | Production (IIS) | Application Pool → Advanced Settings → Environment Variables |
| **Windows Credential Manager** | Production (Windows) | `cmdkey` ile yönetilen kimlik bilgileri |
| **Azure Key Vault** | Azure | `@Microsoft.KeyVault(SecretUri=...)` referansı |
| **Docker Secrets** | Docker | `docker secret create` + compose `secrets:` |
| **.env dosyası** | Development only | `.gitignore`'a eklenmeli, repo'ya girmemeli |

### 1.7 LDAP Hata Yönetimi ve Failover

```
┌──────────────────┐
│  Login Request    │
└────────┬─────────┘
         │
    ┌────▼────┐     Yes    ┌─────────────────┐
    │  LDAP   ├───────────►│  Primary LDAP   │
    │ Enabled?│            │  Server Bind    │
    └────┬────┘            └────────┬────────┘
     No  │                     ┌───▼───┐
         │                     │Success?│
    ┌────▼────┐            No  └───┬───┘   Yes
    │  Local  │       ┌────────────▼──┐    │
    │  Auth   │       │  Failover URL │    │
    └─────────┘       │  configured?  │    │
                      └──────┬────────┘    │
                    Yes      │    No       │
               ┌─────────────▼──┐  │  ┌───▼──────────┐
               │ Try Failover   │  │  │ Search User  │
               │ LDAP Server    │  │  │ + Verify Pwd │
               └────────┬───────┘  │  └───┬──────────┘
                    ┌────▼────┐    │      │
                    │Success? │    │  ┌───▼──────────┐
                    └────┬────┘    │  │ Return User  │
               Yes  ┌───▼──┐ No   │  │ + JWT Token  │
                    │Search│  │    │  └──────────────┘
                    │User  │  │    │
                    └──────┘  │    │
                         ┌────▼────▼──┐
                         │ Fallback   │
                         │ to Local?  │
                         └─────┬──────┘
                      Yes      │    No
                    ┌──────────▼──┐  │
                    │ Local Auth  │  │
                    └─────────────┘  │
                                ┌────▼──────┐
                                │ 401 Error │
                                └───────────┘
```

---

## 2. Database Configuration (Configurable)

### 2.1 Mevcut Mimari

Proje **Database Adapter Pattern** kullanır. `server/db_config.js` dosyasında adapter seçimi yapılır:

| Adapter | Durum | Ortam |
|---|---|---|
| `json` | ✅ Aktif | Development / POC |
| `postgresql` | 🚧 Planlanmış | Test / Production |
| `mongodb` | 🚧 Planlanmış | Alternatif Production |

### 2.2 Ortam Bazlı Konfigürasyon

#### Development (`.env.development`)
```env
DB_ADAPTER=json
# JSON adapter için ek yapılandırma gerekmez
```

#### Test (`.env.test`)
```env
DB_ADAPTER=postgresql
DB_HOST=test-db.company.local
DB_PORT=5432
DB_NAME=weekly_report_test
DB_USER=app_test
DB_PASSWORD=test-password
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=5
```

#### Production (`.env.production`)
```env
DB_ADAPTER=postgresql
DB_HOST=prod-db.company.com
DB_PORT=5432
DB_NAME=weekly_report
DB_USER=app_prod
DB_PASSWORD=<SECURE_VALUE_FROM_VAULT>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=10000
DB_STATEMENT_TIMEOUT=30000
```

### 2.3 Geliştirilmiş `db_config.js` (Önerilen)

```javascript
const DB_CONFIG = {
  adapter: process.env.DB_ADAPTER || 'json',

  json: {
    dataDir: process.env.DB_JSON_DIR || './db/data',
  },

  postgresql: {
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'weekly_report',
    user:     process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl:      process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
                : false,
    pool: {
      min:                parseInt(process.env.DB_POOL_MIN) || 2,
      max:                parseInt(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis:  parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    },
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
    statement_timeout:       parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
  },

  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/weekly_report',
    options: {
      maxPoolSize:       parseInt(process.env.MONGO_POOL_MAX) || 10,
      minPoolSize:       parseInt(process.env.MONGO_POOL_MIN) || 2,
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_TIMEOUT) || 5000,
      connectTimeoutMS:  parseInt(process.env.MONGO_CONNECT_TIMEOUT) || 10000,
    },
  },
};
```

### 2.4 Connection String Güvenliği

> [!WARNING]
> Veritabanı şifreleri `.env` dosyalarında düz metin olarak saklanmamalıdır (production'da).

| Yöntem | Ortam | Açıklama |
|---|---|---|
| **IIS Environment Variables** | IIS (Windows) | `web.config`'deki `<environmentVariables>` veya Application Pool |
| **Azure Key Vault** | Azure | Managed Identity ile otomatik credential çözümleme |
| **Docker Secrets** | Docker | `docker secret create` + compose file referans |
| **Windows DPAPI** | Windows Server | Şifreli credential depolama |
| **.env dosyası** | Development only | `.gitignore`'a eklenmeli |

### 2.5 Connection Pooling Best Practices

```
┌─────────────────────────────────────────────────────┐
│                 Connection Pool                      │
│                                                     │
│  Min Pool: 2–5 (ortamın idle connection kapasitesi) │
│  Max Pool: 10–20 (aynı anda max connection sayısı)  │
│  Idle Timeout: 10–30 sn (boşta kalan conn'u kapat) │
│  Connection Timeout: 5 sn (bağlantı kurma timeout)  │
│  Statement Timeout: 30 sn (sorgu çalışma timeout)   │
│                                                     │
│  ⚠ Max Pool > DB max_connections / app_instance      │
│    olmamalıdır!                                     │
└─────────────────────────────────────────────────────┘
```

| Parametre | Development | Test | Production |
|---|---|---|---|
| `DB_POOL_MIN` | 1 | 2 | 5 |
| `DB_POOL_MAX` | 5 | 5 | 20 |
| `DB_IDLE_TIMEOUT` | 30000 ms | 30000 ms | 10000 ms |
| `DB_CONNECTION_TIMEOUT` | 5000 ms | 5000 ms | 5000 ms |
| `DB_STATEMENT_TIMEOUT` | — | 30000 ms | 30000 ms |

---

## 3. IIS Deployment (Priority)

### 3.1 Ön Gereksinimler

Bu proje **Node.js** uygulamasıdır. IIS üzerinde **iisnode** modülü kullanılarak çalıştırılır.

#### Gerekli Windows Özellikleri

| Bileşen | Nasıl Kurulur | Açıklama |
|---|---|---|
| **IIS** | Server Manager → Add Roles → Web Server (IIS) | IIS web sunucusu |
| **URL Rewrite Module** | [download.microsoft.com](https://www.iis.net/downloads/microsoft/url-rewrite) | iisnode için zorunlu |
| **iisnode** | [github.com/Azure/iisnode/releases](https://github.com/Azure/iisnode/releases) | Node.js ↔ IIS köprüsü |
| **Node.js 20 LTS** | [nodejs.org](https://nodejs.org/) | Node.js runtime |

PowerShell ile IIS özelliklerini yükleme:

```powershell
# IIS ve gerekli alt bileşenleri yükle
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Asp-Net45
Install-WindowsFeature -Name Web-Url-Authorization
Install-WindowsFeature -Name Web-Windows-Auth         # LDAP / Windows Auth için
Install-WindowsFeature -Name Web-Http-Redirect
Install-WindowsFeature -Name Web-Filtering
Install-WindowsFeature -Name Web-Static-Content
```

Then install:
```powershell
# 1. Node.js 20 LTS — https://nodejs.org/
#    Installer'ı çalıştırın ve PATH'e eklendiğinden emin olun.

# 2. URL Rewrite Module — https://www.iis.net/downloads/microsoft/url-rewrite
#    MSI installer'ı çalıştırın.

# 3. iisnode — https://github.com/Azure/iisnode/releases
#    x64 MSI installer'ı çalıştırın.

# Kurulumu doğrula:
node --version       # v20.x.x olmalı
```

### 3.2 IIS Site Oluşturma

#### Adım 1: Application Pool Oluşturma

```
IIS Manager → Application Pools → Add Application Pool
```

| Ayar | Değer | Açıklama |
|---|---|---|
| **Name** | `WeeklyReportAppPool` | Tanımlayıcı isim |
| **.NET CLR Version** | `No Managed Code` | Node.js uygulaması, .NET kullanmaz |
| **Managed Pipeline Mode** | `Integrated` | Entegre pipeline |
| **Start Automatically** | `True` | IIS başladığında otomatik başla |

**Advanced Settings:**

| Ayar | Değer | Açıklama |
|---|---|---|
| **Identity** | `ApplicationPoolIdentity` veya `NetworkService` | LDAP erişimi için `NetworkService` veya özel servis hesabı |
| **Idle Timeout (min)** | `0` | Pool'u timeout'a düşürme (her zaman çalışsın) |
| **Start Mode** | `AlwaysRunning` | Application Initialization |
| **Recycling → Regular Time** | `02:00:00` | Gece 2'de düzenli recycling |
| **Process Model → Max Worker Processes** | `1` | Node.js single-process |

> [!IMPORTANT]
> LDAP bind işlemleri için Application Pool Identity'nin LDAP sunucusuna erişim yetkisi olması gerekir. Active Directory ortamlarında **NetworkService** veya özel bir **domain service account** kullanın.

#### Adım 2: IIS Site Oluşturma

```
IIS Manager → Sites → Add Website
```

| Ayar | Değer |
|---|---|
| **Site Name** | `WeeklyReport` |
| **Application Pool** | `WeeklyReportAppPool` |
| **Physical Path** | `C:\inetpub\wwwroot\weekly-report` |
| **Binding** | `http` / port `80` veya `https` / port `443` |
| **Host Name** | `report.company.com` (opsiyonel) |

### 3.3 Mevcut `web.config` ve İyileştirmeler

Projede halihazırda bir `web.config` dosyası mevcuttur. Production için geliştirilmiş versiyon:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- iisnode configuration -->
    <iisnode
      nodeProcessCommandLine="&quot;C:\Program Files\nodejs\node.exe&quot;"
      node_env="production"
      loggingEnabled="true"
      logDirectory="iisnode-logs"
      debuggingEnabled="false"
      devErrorsEnabled="false"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="24"
      namedPipeConnectionRetryDelay="250"
      watchedFiles="web.config;iisnode.yml"
      flushResponse="false"
    />

    <handlers>
      <add name="iisnode" path="server/index.js" verb="*" modules="iisnode" />
    </handlers>

    <rewrite>
      <rules>
        <!-- API routes → Node.js -->
        <rule name="API Routes" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="server/index.js" />
        </rule>

        <!-- Upload routes → Node.js -->
        <rule name="Upload Routes" stopProcessing="true">
          <match url="^uploads/(.*)" />
          <action type="Rewrite" url="server/index.js" />
        </rule>

        <!-- Static files (built frontend) served directly by IIS -->
        <rule name="Static Files" stopProcessing="true">
          <match url="(.*)" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" />
          </conditions>
          <action type="None" />
        </rule>

        <!-- SPA fallback for client-side routing -->
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="client/dist/index.html" />
        </rule>
      </rules>
    </rewrite>

    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <remove name="X-Powered-By" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>

    <!-- Request limits -->
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="52428800" />  <!-- 50MB -->
      </requestFiltering>
    </security>

    <!-- Static content MIME types -->
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

### 3.4 IIS Üzerinde Environment Variables Ayarlama

> [!IMPORTANT]
> Production ortamında tüm hassas yapılandırmalar environment variable olarak ayarlanmalıdır.

#### Yöntem 1: web.config içinde (önerilmez — hassas veriler için)

```xml
<configuration>
  <system.webServer>
    <iisnode
      nodeProcessCommandLine="&quot;C:\Program Files\nodejs\node.exe&quot;"
      node_env="production"
    />
  </system.webServer>
  <!-- Sadece hassas olmayan değişkenler için -->
  <appSettings>
    <add key="NODE_ENV" value="production" />
    <add key="PORT" value="5000" />
    <add key="DB_ADAPTER" value="postgresql" />
  </appSettings>
</configuration>
```

#### Yöntem 2: IIS Configuration Editor (Önerilen)

```
IIS Manager → Select Site → Configuration Editor
→ system.webServer/iisnode
→ Set: node_env = "production"
```

#### Yöntem 3: iisnode.yml Dosyası (Önerilen)

Proje root'unda bir `iisnode.yml` dosyası oluşturun:

```yaml
nodeProcessCommandLine: "C:\Program Files\nodejs\node.exe"
node_env: production
loggingEnabled: true
logDirectory: iisnode-logs
debuggingEnabled: false
devErrorsEnabled: false
```

#### Yöntem 4: Sistem Ortam Değişkenleri (En Güvenli)

```powershell
# Makine düzeyinde (tüm process'ler görür)
[System.Environment]::SetEnvironmentVariable('JWT_SECRET', 'your-secure-key', 'Machine')
[System.Environment]::SetEnvironmentVariable('DB_PASSWORD', 'secure-db-pass', 'Machine')
[System.Environment]::SetEnvironmentVariable('LDAP_BIND_PASSWORD', 'secure-ldap-pass', 'Machine')

# Değişiklik sonrası IIS'i yeniden başlatın:
iisreset
```

#### Yöntem 5: IIS Application Pool Environment Variables (Windows Server 2016+)

```powershell
# PowerShell ile Application Pool env var ekleme
Import-Module WebAdministration

# Tek bir variable
Set-ItemProperty IIS:\AppPools\WeeklyReportAppPool `
  -Name environmentVariables `
  -Value @(
    @{name='NODE_ENV';     value='production'},
    @{name='PORT';         value='5000'},
    @{name='DB_ADAPTER';   value='postgresql'},
    @{name='DB_HOST';      value='prod-db.company.com'},
    @{name='DB_PASSWORD';  value='secure-password'},
    @{name='JWT_SECRET';   value='your-production-secret'},
    @{name='LDAP_ENABLED'; value='true'},
    @{name='LDAP_URL';     value='ldap://dc01.company.com'},
    @{name='LDAP_BIND_DN'; value='CN=svc_app,OU=Service,DC=company,DC=com'},
    @{name='LDAP_BIND_PASSWORD'; value='secure-ldap-password'}
  )
```

### 3.5 Klasör İzinleri (Folder Permissions)

```powershell
$sitePath = "C:\inetpub\wwwroot\weekly-report"
$poolIdentity = "IIS AppPool\WeeklyReportAppPool"

# Temel okuma izni (tüm proje)
icacls $sitePath /grant "${poolIdentity}:(OI)(CI)R" /T

# Yazma izni gereken dizinler
icacls "$sitePath\server\uploads" /grant "${poolIdentity}:(OI)(CI)M" /T
icacls "$sitePath\server\db\data" /grant "${poolIdentity}:(OI)(CI)M" /T
icacls "$sitePath\iisnode-logs"   /grant "${poolIdentity}:(OI)(CI)M" /T

# node_modules — sadece okuma
icacls "$sitePath\server\node_modules" /grant "${poolIdentity}:(OI)(CI)R" /T
```

| Dizin | İzin | Neden |
|---|---|---|
| Proje root | `Read` | IIS'in dosyaları okuması |
| `server/uploads/` | `Modify` | Dosya yükleme |
| `server/db/data/` | `Modify` | JSON DB yazma (eğer json adapter kullanılıyorsa) |
| `iisnode-logs/` | `Modify` | iisnode log yazması |
| `node_modules/` | `Read` | Paketlerin okunması |

### 3.6 HTTPS Binding Konfigürasyonu

#### Adım 1: SSL Sertifikası Yükleme

```powershell
# PFX sertifika dosyasını IIS'e import et
$certPassword = ConvertTo-SecureString -String "pfx-password" -Force -AsPlainText
Import-PfxCertificate -FilePath "C:\certs\report.company.com.pfx" `
  -CertStoreLocation "Cert:\LocalMachine\My" `
  -Password $certPassword
```

#### Adım 2: HTTPS Binding Ekleme

```
IIS Manager → Sites → WeeklyReport → Bindings → Add
  Type:        https
  IP Address:  All Unassigned
  Port:        443
  Host Name:   report.company.com
  SSL Cert:    report.company.com (listeden seçin)
  ✅ Require Server Name Indication
```

#### Adım 3: HTTP → HTTPS Yönlendirme

`web.config`'e eklenecek rewrite rule:

```xml
<rule name="HTTP to HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

---

## 4. Build & Release Process

### 4.1 Kavram Farkları

| Terim | Açıklama | Bu Projede |
|---|---|---|
| **Build** | Kaynak kodun derlenmesi / bundle oluşturulması | React frontend'in Vite ile bundle edilmesi (`npm run build`) |
| **Publish** | Build çıktısı + server kodunun deploy edilebilir pakete hazırlanması | Frontend build + server kodu + production dependencies |
| **Release / Deploy** | Hazırlanan paketin hedef sunucuya aktarılması | IIS dizinine kopyalama + IIS restart |

```
┌────────────┐      ┌─────────────┐      ┌──────────────┐
│   BUILD    │─────►│   PUBLISH   │─────►│   DEPLOY     │
│            │      │             │      │              │
│ Vite build │      │ Bundle +    │      │ IIS'e kopyala│
│ (frontend) │      │ Server +    │      │ npm ci       │
│            │      │ Deps        │      │ iisreset     │
└────────────┘      └─────────────┘      └──────────────┘
```

### 4.2 Build — Frontend Oluşturma

Frontend React uygulamasını production-ready static dosyalara dönüştürür.

```powershell
# Proje root dizininde (weekly_report/)
cd client
npm ci                    # Bağımlılıkları yükle (clean install)
npm run build             # Vite ile production build → client/dist/
```

**Çıktı:**
```
client/dist/
├── index.html
├── assets/
│   ├── index-[hash].js     # Bundled JavaScript
│   └── index-[hash].css    # Bundled CSS
└── ... (static assets)
```

### 4.3 Publish — Deploy Paketi Hazırlama

Tam bir deploy paketi oluşturma script'i:

#### `scripts/publish.sh` (macOS / Linux)
```bash
#!/bin/bash
set -e

echo "🔧 Weekly Report — Production Publish"
echo "======================================"

PUBLISH_DIR="./publish"
rm -rf $PUBLISH_DIR
mkdir -p $PUBLISH_DIR

# 1. Frontend Build
echo "📦 Building frontend..."
cd client
npm ci
npm run build
cd ..

# 2. Server dosyalarını kopyala
echo "📋 Copying server files..."
mkdir -p $PUBLISH_DIR/server
cp -r server/index.js $PUBLISH_DIR/server/
cp -r server/package.json server/package-lock.json $PUBLISH_DIR/server/
cp -r server/db_config.js $PUBLISH_DIR/server/
cp -r server/middleware $PUBLISH_DIR/server/
cp -r server/routes $PUBLISH_DIR/server/
cp -r server/utils $PUBLISH_DIR/server/
cp -r server/db/json-adapter.js server/db/seed.js $PUBLISH_DIR/server/db/
mkdir -p $PUBLISH_DIR/server/db/data
mkdir -p $PUBLISH_DIR/server/uploads

# 3. Frontend build çıktısını kopyala
echo "📋 Copying frontend build..."
cp -r client/dist $PUBLISH_DIR/client/dist

# 4. Root dosyalar
cp web.config $PUBLISH_DIR/
echo "node_env: production" > $PUBLISH_DIR/iisnode.yml

echo ""
echo "✅ Publish complete → $PUBLISH_DIR/"
echo "📁 Next: Copy to IIS, run 'npm ci --omit=dev' in server/, restart IIS"
```

#### `scripts/publish.ps1` (Windows / PowerShell)
```powershell
Write-Host "🔧 Weekly Report — Production Publish" -ForegroundColor Cyan

$publishDir = ".\publish"
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }
New-Item -ItemType Directory -Path $publishDir | Out-Null

# 1. Frontend Build
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Push-Location client
npm ci
npm run build
Pop-Location

# 2. Server dosyaları
Write-Host "📋 Copying server files..." -ForegroundColor Yellow
$serverDest = "$publishDir\server"
New-Item -ItemType Directory -Path $serverDest -Force | Out-Null
Copy-Item server\index.js, server\package.json, server\package-lock.json, server\db_config.js -Destination $serverDest
Copy-Item -Recurse server\middleware, server\routes, server\utils -Destination $serverDest
New-Item -ItemType Directory -Path "$serverDest\db" -Force | Out-Null
Copy-Item server\db\json-adapter.js, server\db\seed.js -Destination "$serverDest\db\"
New-Item -ItemType Directory -Path "$serverDest\db\data" -Force | Out-Null
New-Item -ItemType Directory -Path "$serverDest\uploads" -Force | Out-Null

# 3. Frontend build
New-Item -ItemType Directory -Path "$publishDir\client" -Force | Out-Null
Copy-Item -Recurse client\dist -Destination "$publishDir\client\"

# 4. Root config
Copy-Item web.config -Destination $publishDir
"node_env: production" | Out-File "$publishDir\iisnode.yml" -Encoding UTF8

Write-Host "`n✅ Publish complete → $publishDir\" -ForegroundColor Green
Write-Host "📁 Next: Copy to IIS, run 'npm ci --omit=dev' in server\, restart IIS"
```

### 4.4 Deploy — IIS'e Aktarma

#### Adım Adım Manual Deployment

```powershell
# ──────────────────────────────────────────────────────
# STEP 1: Uygulamayı durdur
# ──────────────────────────────────────────────────────
Stop-WebAppPool -Name "WeeklyReportAppPool"

# ──────────────────────────────────────────────────────
# STEP 2: Dosyaları IIS dizinine kopyala
# ──────────────────────────────────────────────────────
$source      = "C:\builds\weekly-report\publish"
$destination = "C:\inetpub\wwwroot\weekly-report"

# Mevcut dosyaları temizle (uploads + db/data hariç)
Get-ChildItem $destination -Exclude "server" | Remove-Item -Recurse -Force
Get-ChildItem "$destination\server" -Exclude "uploads","node_modules" |
  Where-Object { $_.Name -ne "db" } | Remove-Item -Recurse -Force

# Yeni dosyaları kopyala
Copy-Item -Recurse "$source\*" -Destination $destination -Force

# ──────────────────────────────────────────────────────
# STEP 3: Production bağımlılıklarını yükle
# ──────────────────────────────────────────────────────
Push-Location "$destination\server"
npm ci --omit=dev
Pop-Location

# ──────────────────────────────────────────────────────
# STEP 4: Klasör izinlerini ayarla
# ──────────────────────────────────────────────────────
$poolIdentity = "IIS AppPool\WeeklyReportAppPool"
icacls $destination /grant "${poolIdentity}:(OI)(CI)R" /T
icacls "$destination\server\uploads" /grant "${poolIdentity}:(OI)(CI)M" /T
icacls "$destination\server\db\data" /grant "${poolIdentity}:(OI)(CI)M" /T

# ──────────────────────────────────────────────────────
# STEP 5: Uygulamayı başlat
# ──────────────────────────────────────────────────────
Start-WebAppPool -Name "WeeklyReportAppPool"

# ──────────────────────────────────────────────────────
# STEP 6: Doğrulama
# ──────────────────────────────────────────────────────
Start-Sleep -Seconds 3
Invoke-WebRequest -Uri "https://report.company.com/api/auth/me" `
  -UseBasicParsing -Method GET 2>$null
Write-Host "✅ Deployment complete!" -ForegroundColor Green
```

### 4.5 Deployment Checklist

```
Pre-Deployment:
  □ Backend ve frontend'te tüm testler geçiyor
  □ .env.production veya IIS env vars ayarlandı
  □ SSL sertifikası güncel
  □ Veritabanı migration'ları (varsa) çalıştırıldı
  □ Mevcut veritabanı yedeklendi

Deployment:
  □ Application Pool durduruldu
  □ publish/ klasörü IIS dizinine kopyalandı
  □ npm ci --omit=dev çalıştırıldı
  □ Klasör izinleri ayarlandı
  □ Application Pool başlatıldı

Post-Deployment:
  □ /api/auth/login → 200 (login çalışıyor mu?)
  □ / → frontend yükleniyor mu?
  □ /api/reports?week=X&year=Y → veri geliyor mu?
  □ /api/export/pdf?week=X&year=Y → PDF indiriliyor mu?
  □ LDAP login testi (production'da)
  □ iisnode-logs/ dizininde hata yok
  □ Dosya yükleme (upload) çalışıyor mu?
```

---

## 5. Production Hardening

### 5.1 Logging Stratejisi

#### Önerilen: `winston` Logger

```bash
npm install winston winston-daily-rotate-file
```

```javascript
// server/utils/logger.js
const winston = require('winston');
require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'weekly-report' },
  transports: [
    // Günlük rotate eden dosya
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',        // 30 gün sakla
    }),
    // Sadece hatalar için ayrı dosya
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '90d',        // 90 gün sakla
    }),
  ],
});

// Development'ta console'a da yaz
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

module.exports = logger;
```

#### Neleri Loglamalı

| Seviye | Ne loglanmalı | Örnek |
|---|---|---|
| `error` | Uygulama hataları, yakalanmayan istisnalar | DB bağlantı hatası, LDAP bind failure |
| `warn` | Beklenmeyen ama kurtarılabilir durumlar | LDAP failover tetiklendi, Puppeteer fallback |
| `info` | Önemli business olayları | Kullanıcı giriş yaptı, rapor oluşturuldu/silindi |
| `debug` | Detaylı teknik bilgi | LDAP search parametreleri, DB query süreleri |

> [!WARNING]
> **Asla loglamayın:** Şifreler, JWT secret, LDAP bind password, DB connection string, kişisel bilgiler (KVKK/GDPR).

### 5.2 Error Handling Stratejisi

#### Global Error Handler Middleware

```javascript
// server/middleware/error-handler.js
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
  });

  // API response — production'da stack trace gösterme
  res.status(statusCode).json({
    error: isProduction && statusCode === 500
      ? 'Internal Server Error'
      : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

// Yakalanmayan hataları yakala
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);  // Graceful restart (iisnode otomatik yeniden başlatır)
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });
}

module.exports = { errorHandler, setupGlobalErrorHandlers };
```

### 5.3 Security Recommendations

#### 5.3.1 LDAP Credential Koruması

| Tehdit | Önlem |
|---|---|
| Kaynak kodda şifre | ❌ Asla hard-code etmeyin. Env var kullanın |
| .env dosyası repo'da | ❌ `.gitignore`'a ekleyin |
| Düz metin log'da şifre | ❌ Logger'da sanitize filtresi uygulayın |
| LDAP bağlantısı sniffing | ✅ LDAPS (SSL/TLS port 636) kullanın |
| Bind password çalınma | ✅ Windows Credential Manager / Azure Key Vault |

```javascript
// Password sanitization for logs
const sanitize = (obj) => {
  const sensitiveKeys = ['password', 'secret', 'token', 'bindPassword', 'LDAP_BIND_PASSWORD'];
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    }
  }
  return sanitized;
};
```

#### 5.3.2 Connection String Koruması

```javascript
// server/index.js — startup logunda şifreyi maskeleme
const maskedConfig = {
  adapter: DB_CONFIG.adapter,
  host: DB_CONFIG.postgresql?.host,
  port: DB_CONFIG.postgresql?.port,
  database: DB_CONFIG.postgresql?.database,
  user: DB_CONFIG.postgresql?.user,
  password: '***',  // Asla loglanmaz
};
logger.info('Database config:', maskedConfig);
```

#### 5.3.3 JWT Security

```javascript
// Production için güçlü JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters!');
  process.exit(1);
}
```

| Ayar | Development | Production |
|---|---|---|
| JWT Secret | Default string (kabul edilebilir) | **Minimum 64 karakter**, rastgele üretilmiş |
| Token Expiry | 24 saat | 8 saat veya daha kısa |
| HTTPS Only | Opsiyonel | **Zorunlu** |

JWT Secret üretme:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5.4 IIS Security Hardening

#### 5.4.1 Security Headers (web.config'te mevcut)

| Header | Değer | Koruma |
|---|---|---|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS filtreleme |
| `Strict-Transport-Security` | `max-age=31536000` | HTTPS zorunlu kılma |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer bilgi sızıntısı |
| `Content-Security-Policy` | (aşağıya bakın) | XSS, injection |

```xml
<!-- Tam CSP header (web.config'e eklenecek) -->
<add name="Content-Security-Policy"
     value="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'" />
```

#### 5.4.2 IIS Yapılandırma Kontrolleri

```powershell
# 1. Directory browsing'i kapat
Set-WebConfigurationProperty -pspath 'IIS:\Sites\WeeklyReport' `
  -filter 'system.webServer/directoryBrowse' -name 'enabled' -value $false

# 2. Detaylı hata mesajlarını kapat
Set-WebConfigurationProperty -pspath 'IIS:\Sites\WeeklyReport' `
  -filter 'system.web/customErrors' -name 'mode' -value 'RemoteOnly'

# 3. IIS version bilgisini gizle
Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' `
  -filter 'system.webServer/security/requestFiltering' `
  -name 'removeServerHeader' -value $true
```

### 5.5 Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

// Genel API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 dakika
  max: 100,                   // IP başına max istek
  message: { error: 'Too many requests, please try again later' },
});

// Login brute-force koruması
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                     // 15 dakikada max 5 login denemesi
  message: { error: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);
```

### 5.6 CORS Konfigürasyonu (Production)

```javascript
// Development'ta tüm origin'lere izin vers (mevcut durum)
// Production'da sıkılaştır:
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://report.company.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,  // Preflight cache: 24 saat
};

app.use(cors(process.env.NODE_ENV === 'production' ? corsOptions : undefined));
```

### 5.7 Helmet Middleware

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: false,  // web.config'de yönetiliyor
  crossOriginEmbedderPolicy: false,
}));
```

### 5.8 Production Checklist

```
Security:
  □ JWT_SECRET production'da güçlü (64+ karakter) ve env var'da
  □ LDAP_BIND_PASSWORD güvenli depolamada (Key Vault / Credential Manager)
  □ DB_PASSWORD güvenli depolamada
  □ HTTPS zorunlu, HTTP → HTTPS yönlendirmesi aktif
  □ SSL sertifikası güncel ve auto-renew'de
  □ CORS origin production domain'e kısıtlandı
  □ Rate limiting aktif (login + genel API)
  □ Security headers (X-Frame-Options, HSTS, CSP, vb.) ayarlandı
  □ X-Powered-By header'ı kaldırıldı
  □ Directory browsing kapalı
  □ Detaylı hata mesajları client'a gönderilmiyor

Performance:
  □ Node.js --max-old-space-size parametresi ayarlandı (gerekirse)
  □ gzip / brotli compression aktif (IIS Dynamic Compression)
  □ Static dosyalar için cache headers ayarlandı
  □ Database connection pooling optimize edildi

Monitoring:
  □ Loglama yapılandırıldı (winston + daily rotation)
  □ Log dosyaları düzenli temizleniyor (maxFiles)
  □ Uygulama sağlık kontrolü (health check endpoint) mevcut
  □ Disk alanı izleniyor (uploads + logs)

Backup:
  □ Veritabanı düzenli yedekleniyor
  □ uploads/ dizini yedekleniyor
  □ Konfigürasyonlar versiyonlanıyor
```

---

> 📅 Bu dokümantasyon **3 Mart 2026** tarihinde oluşturulmuştur.
> 📋 Proje: Weekly Report Portal (Node.js + React)
