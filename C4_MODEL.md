# C4 Model - Business Intelligence Platform

## 🎯 Contexto y Alcance

Esta es una plataforma de Business Intelligence que permite cargar, procesar y visualizar datos de ventas desde un Data Warehouse (AdventureWorksDW2022) en Azure SQL Server, con dashboards en Grafana y un portal web interactivo.

---

## 📊 C1: Context Diagram (Diagrama de Contexto del Sistema)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────┐      ┌─────────────────────────────────┐    │
│  │   Usuario    │      │  Business Intelligence System   │    │
│  │  (Browser)   ├─────►│                                 │    │
│  │              │      │  • Portal Web (bi-portal)       │    │
│  │              │◄─────┤  • API Backend (bi-loader-api)  │    │
│  │              │      │  • Dashboards (bi-grafana)      │    │
│  │              │      │  • Database (SQL Server)        │    │
│  └──────────────┘      └──────────────────────┬──────────┘    │
│                                                │               │
│  ┌──────────────┐                             │               │
│  │  Data Admin  │     ┌──────────────────┐    │               │
│  │ (CSV Upload) ├────►│  Sistema BI      │◄───┤               │
│  │              │     │                  │    │               │
│  └──────────────┘     └─────────┬────────┘    │               │
│                                  │             │               │
│                        ┌─────────▼────────┐   │               │
│                        │  Azure SQL Server│◄──┘               │
│                        │ AdventureWorksDW │                   │
│                        │     2022         │                   │
│                        └──────────────────┘                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📦 C2: Container Diagram (Diagrama de Contenedores)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Azure Container Environment                      │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   Internet / Cliente Browser                   │ │
│  └────────────┬──────────────────────────────────────────────────┘ │
│               │                                                    │
│  ┌────────────▼──────────────────────────────────────────────────┐ │
│  │                   Azure CDN / Load Balancer                    │ │
│  └────────────┬───────────────────────────────────────────────────┘ │
│               │                                                    │
│  ┌────────────▼──────────────────────────────────────────────────┐ │
│  │               Container: bi-portal (Frontend)                  │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │  • Nginx (Webserver)                                   │   │ │
│  │  │  • HTML + CSS + JavaScript                             │   │ │
│  │  │  │                                                     │   │ │
│  │  │  ├─ assets/js/api.js (HTTP Client)                     │   │ │
│  │  │  ├─ assets/js/cargas.js (Upload/Process UI)            │   │ │
│  │  │  └─ index.html (Portal)                                │   │ │
│  │  │                                                         │   │ │
│  │  │  Puertos: 80 → 443 (HTTPS)                             │   │ │
│  │  │  Healthcheck: GET /                                    │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  └────────────┬───────────────────────────────────────────────────┘ │
│               │ HTTPS REST Calls                                   │
│  ┌────────────▼──────────────────────────────────────────────────┐ │
│  │            Container: bi-loader-api (Backend)                 │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │  Node.js Runtime (Express.js)                          │   │ │
│  │  │  ┌──────────────────────────────────────────────────┐  │   │ │
│  │  │  │  API Routes:                                     │  │   │ │
│  │  │  │  • GET    /api/health                            │  │   │ │
│  │  │  │  • GET    /api/cargas                            │  │   │ │
│  │  │  │  • GET    /api/cargas/:id/detalle                │  │   │ │
│  │  │  │  • POST   /api/cargas/upload (CSV)               │  │   │ │
│  │  │  │  • POST   /api/cargas/:id/procesar               │  │   │ │
│  │  │  │  • DELETE /api/cargas/:id                        │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  │  Modules:                                         │  │   │ │
│  │  │  │  • csv-parse (Parse CSV files)                    │  │   │ │
│  │  │  │  • mssql (Database driver)                        │  │   │ │
│  │  │  │  • multer (File upload)                           │  │   │ │
│  │  │  │  • cors (Cross-origin)                            │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  │  Services:                                        │  │   │ │
│  │  │  │  • db.js (Connection Pool)                        │  │   │ │
│  │  │  │  • cargaService.js (Business Logic)               │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  └──────────────────────────────────────────────────┘  │   │ │
│  │  │                                                         │   │ │
│  │  │  Puerto: 3000                                          │   │ │
│  │  │  Healthcheck: GET /api/health                          │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  └────────────┬───────────────────────────────────────────────────┘ │
│               │ SQL Connection (TLS)                               │
│  ┌────────────▼──────────────────────────────────────────────────┐ │
│  │           Container: bi-grafana (Analytics)                   │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │  • Grafana (Visualización)                             │   │ │
│  │  │  • Datasource: MSSQL Driver                            │   │ │
│  │  │  • Dashboards provisioning                             │   │ │
│  │  │  • User authentication                                 │   │ │
│  │  │                                                         │   │ │
│  │  │  Puerto: 3000 (interno)                                │   │ │
│  │  │  Puerto externo: 3000                                  │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  └────────────┬───────────────────────────────────────────────────┘ │
│               │ SQL Connection (TLS)                               │
│  ┌────────────▼──────────────────────────────────────────────────┐ │
│  │    External Database: Azure SQL Server (AdventureWorksDW)     │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │  • Server: sql-bi-student-dev.database.windows.net    │   │ │
│  │  │  • Database: AdventureWorksDW2022_imp                  │   │ │
│  │  │  • Tables:                                             │   │ │
│  │  │    - BI_CargaArchivo (Upload metadata)                 │   │ │
│  │  │    - BI_CargaVentas_Staging (Staging data)             │   │ │
│  │  │    - BI_VentasManual (Final processed data)            │   │ │
│  │  │    - DimProduct, FactSales, etc. (DW tables)           │   │ │
│  │  │                                                         │   │ │
│  │  │  Puerto: 1433 (SSL encrypted)                          │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 C3: Component Diagram - Backend (bi-loader-api)

```
┌─────────────────────────────────────────────────────────────────┐
│                   bi-loader-api Container                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              API Layer (Express.js)                    │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │  Middleware:                                      │  │   │
│  │  │  • CORS Handler (Cross-origin support)            │  │   │
│  │  │  • Body Parser (JSON, URL-encoded, files)         │  │   │
│  │  │  • Error Handler (Global error catching)          │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │  Routes: src/routes/cargas.js                    │  │   │
│  │  │  ├─ GET    /api/health                            │  │   │
│  │  │  ├─ GET    /api/cargas                            │  │   │
│  │  │  ├─ GET    /api/cargas/:id/detalle                │  │   │
│  │  │  ├─ POST   /api/cargas/upload                     │  │   │
│  │  │  ├─ POST   /api/cargas/:id/procesar               │  │   │
│  │  │  └─ DELETE /api/cargas/:id                        │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └────────────┬──────────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────▼──────────────────────────────────────────┐   │
│  │           Service Layer (Business Logic)             │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │  CargaService:                                    │  │   │
│  │  │  ├─ obtenerCargas()                               │  │   │
│  │  │  ├─ obtenerDetalleCarga(id)                        │  │   │
│  │  │  ├─ crearCargaArchivo()                            │  │   │
│  │  │  ├─ insertarFilasStaging()  ◄── CSV PARSING       │  │   │
│  │  │  ├─ procesarCarga()                                │  │   │
│  │  │  └─ eliminarCarga()                                │  │   │
│  │  │                                                    │  │   │
│  │  │  CSV Processing:                                  │  │   │
│  │  │  ├─ normalizeKey()     (Header normalization)      │  │   │
│  │  │  ├─ normalizeField()   (Value trimming)            │  │   │
│  │  │  ├─ getFirstValue()    (Alias matching)            │  │   │
│  │  │  ├─ parseDecimal()     (Number parsing)            │  │   │
│  │  │  ├─ parseDateValue()   (Date parsing)              │  │   │
│  │  │  └─ parseDecimal()     (Decimal conversion)        │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └────────────┬──────────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────▼──────────────────────────────────────────┐   │
│  │         Data Access Layer (Database)                 │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │  DatabaseService: src/services/db.js            │  │   │
│  │  │  ├─ getConnection()    (Connection pooling)       │  │   │
│  │  │  ├─ sql.ConnectionPool (MSSQL driver)             │  │   │
│  │  │  └─ closeConnection()  (Connection cleanup)       │  │   │
│  │  │                                                    │  │   │
│  │  │  Queries executed:                                │  │   │
│  │  │  • INSERT INTO BI_CargaArchivo                     │  │   │
│  │  │  • INSERT INTO BI_CargaVentas_Staging              │  │   │
│  │  │  • SELECT FROM BI_CargaVentas_Staging              │  │   │
│  │  │  • INSERT INTO BI_VentasManual                     │  │   │
│  │  │  • UPDATE BI_CargaArchivo (status)                 │  │   │
│  │  │  • DELETE FROM BI_CargaVentas_Staging              │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └────────────┬──────────────────────────────────────────┘   │
│               │                                             │
└───────────────┼─────────────────────────────────────────────┘
                │
        [External: Azure SQL Database]
```

---

## 🎨 C3: Component Diagram - Frontend (bi-portal)

```
┌─────────────────────────────────────────────────────────┐
│              bi-portal Container (Nginx)               │
│                                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │         HTTP/HTTPS Server (Nginx)                │ │
│  │  ├─ Static file serving (HTML, CSS, JS)          │ │
│  │  ├─ Gzip compression                             │ │
│  │  ├─ Cache headers                                │ │
│  │  └─ SPA routing (Single Page App)                │ │
│  └──────────────────┬────────────────────────────────┘ │
│                     │                                 │
│  ┌──────────────────▼────────────────────────────────┐ │
│  │         Frontend Application (index.html)         │ │
│  │  ┌────────────────────────────────────────────┐   │ │
│  │  │  UI Components:                            │   │ │
│  │  │  • File Upload Form                        │   │ │
│  │  │  • Cargas Table (History)                  │   │ │
│  │  │  • Detail Modal Popup                      │   │ │
│  │  │  • Status Messages                         │   │ │
│  │  │  • Action Buttons (Process, Delete, etc)   │   │ │
│  │  └────────────────────────────────────────────┘   │ │
│  │                    ▲                              │ │
│  │                    │                              │ │
│  │  ┌────────────────┼───────────────────────────┐   │ │
│  │  │     API Client Layer (assets/js/api.js)    │   │ │
│  │  │  ┌──────────────────────────────────────┐  │   │ │
│  │  │  │  BiLoaderAPIClient:                  │  │   │ │
│  │  │  │  ├─ obtenerCargas()                  │  │   │ │
│  │  │  │  ├─ obtenerDetalleCarga()            │  │   │ │
│  │  │  │  ├─ subirArchivo()                   │  │   │ │
│  │  │  │  ├─ procesarCarga()                  │  │   │ │
│  │  │  │  ├─ eliminarCarga()                  │  │   │ │
│  │  │  │  └─ verificarSalud()                 │  │   │ │
│  │  │  └──────────────────────────────────────┘  │   │ │
│  │  └────────────────────────────────────────────┘   │ │
│  │                    │                              │ │
│  │  ┌────────────────▼───────────────────────────┐   │ │
│  │  │     Business Logic (assets/js/cargas.js)   │   │ │
│  │  │  ┌──────────────────────────────────────┐  │   │ │
│  │  │  │  Functions:                          │  │   │ │
│  │  │  │  ├─ cargarListaCargas()               │  │   │ │
│  │  │  │  ├─ subirArchivo()                    │  │   │ │
│  │  │  │  ├─ verDetalle()                      │  │   │ │
│  │  │  │  ├─ procesarCarga()                   │  │   │ │
│  │  │  │  ├─ eliminarCarga()                   │  │   │ │
│  │  │  │  ├─ mostrarEstado()                   │  │   │ │
│  │  │  │  └─ verificarConexion()               │  │   │ │
│  │  │  └──────────────────────────────────────┘  │   │ │
│  │  └─────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────┘ │
│                     ▲                                 │
└─────────────────────┼─────────────────────────────────┘
                      │ HTTPS REST API Calls
                      │
        [External: bi-loader-api Backend]
```

---

## 🔄 Data Flow Diagram

```
┌─────────────┐
│   Usuario   │
│  (Browser)  │
└──────┬──────┘
       │ 1. Selecciona CSV
       │
       ▼
┌─────────────────────────┐
│   bi-portal (Frontend)   │
│  - UI component          │
│  - Form validation       │
└──────┬──────────────────┘
       │ 2. FormData(archivo)
       │
       ▼
┌─────────────────────────┐
│  bi-loader-api (Backend)│
│  POST /api/cargas/upload│
└──────┬──────────────────┘
       │ 3. Multer middleware
       │
       ▼
┌──────────────────────────────┐
│  CSV Parser & Normalization  │
│  • detectDelimiter()         │
│  • normalizeWrappedLines()   │
│  • normalizeKey()            │
│  • parseDecimal()            │
│  • parseDateValue()          │
└──────┬───────────────────────┘
       │ 4. Parsed rows array
       │
       ▼
┌──────────────────────────────┐
│    CargaService              │
│  • createCarga()             │
│  • insertRows() - Validación │
└──────┬───────────────────────┘
       │ 5. SQL INSERT statements
       │
       ▼
┌──────────────────────────────┐
│  Azure SQL Server (Database) │
│  • BI_CargaArchivo           │
│  • BI_CargaVentas_Staging    │
└──────┬───────────────────────┘
       │ 6. Response + idCarga
       │
       ▼
┌─────────────────────────┐
│  bi-portal (Frontend)   │
│  - Display success/error│
│  - Refresh table        │
└────────────────────────┘
```

---

## 📡 Integration Points

### 1. Frontend ↔ Backend Communication
```
Protocol: HTTPS/REST
Authentication: (Currently none, could be JWT)
Headers:
  - Content-Type: application/json
  - Accept: application/json
  - (Future) Authorization: Bearer <token>

CORS Policy:
  - Allowed Origins: bi-portal domain
  - Allowed Methods: GET, POST, DELETE, OPTIONS
  - Allowed Headers: Content-Type, Authorization
  - Credentials: Include
```

### 2. Backend ↔ Database Communication
```
Protocol: TLS 1.2+
Driver: mssql (node-mssql)
Connection Pooling: Yes
Max Connections: 10 (default)
Timeout: 30s
Authentication: SQL Authentication (Username/Password)

Encrypted: Yes
Trust Certificate: No (production-ready)
```

### 3. Dashboard ↔ Database Communication
```
Protocol: TLS 1.2+
Driver: Grafana MSSQL Plugin
Provisioning: YAML-based
Data Sources: Pre-configured
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Nginx Alpine | Web server |
| **Frontend** | HTML5 + CSS3 + Vanilla JS | UI |
| **Frontend** | Fetch API | HTTP client |
| **Backend** | Node.js 18 LTS | Runtime |
| **Backend** | Express.js | Web framework |
| **Backend** | csv-parse | CSV parsing |
| **Backend** | mssql | Database driver |
| **Backend** | multer | File upload |
| **Backend** | cors | CORS middleware |
| **Database** | Azure SQL Server 2022 | Data warehouse |
| **Dashboard** | Grafana | BI visualization |
| **Orchestration** | Docker | Containerization |
| **Registry** | Azure Container Registry | Image storage |
| **Cloud** | Azure Container Apps | Deployment |

---

## 🔐 Security Architecture

```
┌──────────────────────────────────────────────────────┐
│          Security Layers                            │
│                                                     │
│  Layer 1: Network                                   │
│  ├─ HTTPS/TLS 1.2+ (in transit)                     │
│  ├─ Azure Virtual Network                           │
│  └─ NSG (Network Security Groups)                   │
│                                                     │
│  Layer 2: Application                               │
│  ├─ CORS validation                                 │
│  ├─ Input validation (CSV parsing)                  │
│  ├─ Rate limiting (future)                          │
│  └─ Error handling (no sensitive data leakage)      │
│                                                     │
│  Layer 3: Database                                  │
│  ├─ SQL parameterized queries                       │
│  ├─ Connection encryption (TLS)                     │
│  ├─ SQL Authentication                              │
│  └─ Azure SQL firewall rules                        │
│                                                     │
│  Layer 4: Secrets Management                        │
│  ├─ Environment variables (Container Apps)          │
│  ├─ Azure Key Vault (future)                        │
│  └─ Secret markings in pipelines                    │
│                                                     │
└──────────────────────────────────────────────────────┘
```

---

## 📈 Scaling Strategy

```
Current State (Horizontal Scalability):
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ bi-portal 1 │  │ bi-portal 2 │  │ bi-portal N │
└────┬────────┘  └────┬────────┘  └────┬────────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
              ┌───────▼────────┐
              │  Load Balancer │
              │   (Azure LB)   │
              └────────────────┘

Backend API:
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ bi-loader-api 1  │  │ bi-loader-api 2  │  │ bi-loader-api N  │
└────┬─────────────┘  └────┬─────────────┘  └────┬─────────────┘
     │                      │                      │
     └──────────────────────┼──────────────────────┘
                            │
                ┌───────────▼──────────────┐
                │   SQL Server Connection │
                │   Pool (Connection limit)│
                └────────────────────────┘

Database:
┌───────────────────────────────────────┐
│ Azure SQL Server (Single write point)  │
│ • Primary: Hot-active                  │
│ • Replicas: Read-only (future)         │
└───────────────────────────────────────┘
```

---

## 🚀 Deployment Pipeline

```
Git Push (main branch)
    │
    ├─ app/ changed → frontend.yml pipeline
    │   ├─ Build Docker image
    │   ├─ Push to ACR
    │   └─ Deploy to bi-portal Container App
    │
    └─ api/ changed → backend.yml pipeline
        ├─ Build Docker image
        ├─ Push to ACR
        └─ Deploy to bi-loader-api Container App

Both pipelines can run in parallel
Deployment time: ~3-5 minutes per container
```

---

## 📊 Database Schema

```
BI_CargaArchivo (Upload metadata)
├─ intID (PK)
├─ strNombreArchivo
├─ intRegistrosRecibidos
├─ intRegistrosValidos
├─ intRegistrosError
├─ strEstado (PENDIENTE|PROCESADA|PROCESADA CON ERRORES)
├─ strUsuarioCarga
└─ dtFechaCarga

BI_CargaVentas_Staging (Staging area)
├─ intID (PK)
├─ intCargaID (FK → BI_CargaArchivo)
├─ intFilaArchivo
├─ dtFechaVenta
├─ strPais
├─ strGrupoTerritorial
├─ strCategoria
├─ strSubcategoria
├─ strProducto
├─ intCantidad
├─ sinTotalVenta
├─ strMoneda
├─ strEstadoValidacion (VALIDO|ERROR)
├─ strMensajeValidacion
└─ dtFechaRegistro

BI_VentasManual (Final data)
├─ intID (PK)
├─ intCargaID (FK)
├─ dtFechaVenta
├─ strPais
├─ ... (same fields as staging)
└─ dtFechaInsertado
```

---

## 📋 Recomendaciones para Diagrama C4 Adicional

Para complementar este modelo C4, se recomienda generar:

1. **C4 Level 4 (Code Level)**
   - Clases y métodos principales
   - Interfaces y contratos
   - Patrones de diseño (Service pattern, etc)

2. **Architecture Decision Records (ADR)**
   - Por qué Express.js vs alternatives
   - Por qué Container Apps vs App Service
   - Por qué csv-parse vs alternatives

3. **Sequence Diagrams**
   - Upload CSV flow
   - Process data flow
   - Delete operation flow

4. **State Diagrams**
   - Estados de una carga (PENDIENTE → PROCESADA → COMPLETADA)
   - Estados de validación (VALIDO/ERROR)

5. **Deployment Architecture**
   - CI/CD pipeline en detalle
   - Azure services usadas
   - Monitoring y alertas

---

**Generado para**: Arquitecto de Software  
**Fecha**: 13 de mayo de 2026  
**Versión**: 1.0 (Post CSV Parsing Fix)
