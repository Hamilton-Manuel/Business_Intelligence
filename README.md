# Business Intelligence Platform - Arquitectura Moderna

**Versión:** 2.0 (Post CSV Parsing Enhancements)  
**Estado:** Producción - Listo para Deploy  
**Última Actualización:** 13 de mayo de 2026

## 📋 Descripción General

Plataforma de **Business Intelligence escalable** que integra:
- **Portal web interactivo** (bi-portal) para cargar y procesar datos
- **API REST backend** (bi-loader-api) para gestionar cargas de CSV
- **Dashboards de visualización** (bi-grafana) en tiempo real
- **Data warehouse** (Azure SQL Server 2022) con datos consolidados

### Arquitectura Completa
```
┌────────────┐  HTTPS  ┌──────────────┐  SQL   ┌──────────────┐
│ bi-portal  │◄------->│bi-loader-api │◄----->│ Azure SQL    │
│ (Nginx)    │ REST    │ (Express)    │ TLS   │ Server 2022  │
└────────────┘         └──────────────┘       └──────────────┘
       │                       │                      │
       │                       │                      │
       └───────────────────────┴──────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  bi-grafana      │
              │ (Dashboards)     │
              └──────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Desktop
- Node.js 18+ (para desarrollo local)
- Azure CLI (para deploy)
- Git

### Opción 1: Desarrollo Local

```bash
# Backend
cd api
npm install
npm run dev          # http://localhost:3000/api

# Frontend (en otra terminal)
cd app
docker build -t bi-portal .
docker run -p 8080:80 bi-portal  # http://localhost:8080
```

### Opción 2: Docker Compose (Completo con SQL Server)

```bash
docker-compose up -d
# SQL Server:  localhost:1433
# Frontend:    localhost:8080
# Backend:     localhost:3000
# Grafana:     localhost:3000 (antiguo)
```

### Opción 3: Azure Deployment

```bash
# 1. Build y push
docker build -t acrbistudentdev01.azurecr.io/bi-loader-api:1.6 ./api
docker push acrbistudentdev01.azurecr.io/bi-loader-api:1.6

# 2. Update Container App
az containerapp update \
  --name bi-loader-api \
  --resource-group rg-bi-student-dev \
  --image acrbistudentdev01.azurecr.io/bi-loader-api:1.6
```

---

## 📦 Estructura del Proyecto

```
Business_Intelligence/
│
├── app/                          # Frontend (Nginx + HTML/CSS/JS)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   └── assets/js/
│       ├── api.js
│       └── cargas.js
│
├── api/                          # Backend (Node.js + Express) ⭐
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── services/
│       │   ├── db.js
│       │   └── cargaService.js
│       └── routes/
│           └── cargas.js
│
├── azure-pipelines/              # CI/CD ⭐
│   ├── frontend.yml
│   └── backend.yml
│
├── grafana/                      # Dashboards
├── mssql/                        # SQL Server volumes
├── C4_MODEL.md                   # ⭐ Diagramas C4
├── ARQUITECTURA.md               # Documentación técnica
├── SETUP_ARCHITECTURE.md         # Guía instalación
└── docker-compose.yml
```

---

## 🔌 REST API Endpoints

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/cargas` | Listar cargas |
| `GET` | `/api/cargas/:id/detalle` | Detalle + validación |
| `POST` | `/api/cargas/upload` | Upload CSV |
| `POST` | `/api/cargas/:id/procesar` | Procesar carga |
| `DELETE` | `/api/cargas/:id` | Eliminar carga |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend Server | Nginx alpine |
| Frontend App | HTML5 + CSS3 + Vanilla JS |
| Backend Runtime | Node.js 18 LTS |
| Backend Framework | Express.js 4.18+ |
| CSV Parsing | csv-parse 5.4+ |
| Database Driver | mssql 9.1+ |
| Database | Azure SQL Server 2022 |
| Analytics | Grafana |
| Container Registry | Azure Container Registry |

---

## 📊 Nuevas Características (CSV Parsing)

✅ **Detección de delimitadores** - Automático , o ;  
✅ **Líneas envueltas en comillas** - Manejo correcto  
✅ **Productos con comas** - `"Mountain-200 Black, 38"` soportado  
✅ **Validación flexible** - Múltiples alias de columnas  
✅ **Parseo inteligente** - Decimales y fechas automáticos  
✅ **Feedback de errores** - Mensajes específicos por fila  

---

## 🚀 CI/CD Pipeline

```
Git Push → Docker Build → Push to ACR → Deploy to Container App
(~3.5 min total)
```

**Pipelines:**
- `frontend.yml` - Trigger: cambios en `app/`
- `backend.yml` - Trigger: cambios en `api/`

---

## 📚 Documentación Completa

| Documento | Propósito |
|-----------|-----------|
| **C4_MODEL.md** | ⭐ Diagramas C4 para arquitecto |
| **ARQUITECTURA.md** | Visión técnica completa |
| **SETUP_ARCHITECTURE.md** | Guía instalación |
| **CHECKLIST_FINAL.md** | Validaciones |

---

## 🔒 Seguridad

✅ HTTPS/TLS 1.2+  
✅ CORS configurado  
✅ SQL parameterized queries  
✅ Connection pool con TLS  
✅ Input validation  
✅ Error handling seguro  

---

## 📈 Escalabilidad

**Horizontal:** Frontend y Backend stateless (múltiples instancias con Load Balancer)  
**Vertical:** CPU/Memory escalables por Container  
**Database:** Azure SQL con auto-backup y geo-redundancia  

---

**Versión:** 2.0 | **Estado:** Listo para Producción ✅