# Business Intelligence - Arquitectura Frontend + Backend (Actualizado)

## 🎯 Cambios Realizados (Última Actualización: 13 de Mayo de 2026)

Se ha implementado una arquitectura escalable con separación de responsabilidades **completa**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Azure Container Environment                        │
├─────────────────────┬──────────────────────┬──────────────────────────┤
│  bi-portal          │   bi-loader-api ⭐   │   bi-grafana             │
│  (Frontend Nginx)   │   (Backend Node.js)  │   (Analytics/Dashboard)  │
├─────────────────────┼──────────────────────┼──────────────────────────┤
│ Nginx Alpine        │ Express.js + Node18  │ Grafana                  │
│                     │                      │                          │
│ • Upload Form       │ • CSV Parser         │ • Dashboards             │
│ • Cargas Table      │ • Process Data       │ • Real-time Metrics      │
│ • Detail Popup      │ • API Endpoints      │ • User Auth              │
│ • History View      │ • File Upload        │                          │
│                     │ • Validation         │                          │
│ Puerto: 80/443      │ Puerto: 3000         │ Puerto: 3000             │
└─────────────────────┼──────────────────────┼──────────────────────────┘
         ▲            │            ▲         │         ▲
         │ HTTPS      │            │ HTTPS   │         │ SQL (TLS)
         └────────────┼────────────┘         │         │
                      │                      │         │
                  [INTERNET]                 │         │
                      │                      │         │
         ┌────────────────────────────────────────────────┐
         │      Azure Virtual Network                     │
         │  ┌────────────────────────────────────────┐    │
         │  │    Azure SQL Server 2022               │    │
         │  │  • Database: AdventureWorksDW2022_imp  │◄───┘
         │  │  • Tables: BI_Carga*, DW tables        │
         │  │  • Connection Pool: TLS Encrypted      │
         │  │  • Port: 1433                          │
         │  └────────────────────────────────────────┘
         └────────────────────────────────────────────────┘
```

---

## 📦 Estructura Completa del Proyecto

### Backend (`api/`) ⭐ NUEVO

```
api/
├── Dockerfile                 # Multi-stage build optimizado
├── package.json              # Dependencias: express, mssql, csv-parse, cors, multer
├── package-lock.json         # Lock file para reproducibilidad
├── .env.example              # Plantilla de variables de entorno
├── .dockerignore             # Optimización de imagen (excluye node_modules)
├── .gitignore                # Git ignore para el backend
└── src/
    ├── server.js             # Express server, CORS, health check
    ├── services/
    │   ├── db.js             # Pool de conexión Azure SQL (TLS)
    │   └── cargaService.js   # Lógica de negocio principal
    │       ├─ obtenerCargas()
    │       ├─ obtenerDetalleCarga(id)
    │       ├─ crearCargaArchivo()
    │       ├─ insertarFilasStaging()  ◄── CSV PARSING MEJORADO
    │       ├─ procesarCarga()
    │       └─ eliminarCarga()
    └── routes/
        └── cargas.js         # 6 endpoints REST
            ├─ GET    /api/health
            ├─ GET    /api/cargas
            ├─ GET    /api/cargas/:id/detalle
            ├─ POST   /api/cargas/upload
            ├─ POST   /api/cargas/:id/procesar
            └─ DELETE /api/cargas/:id
```

**Mejoras al CSV Parsing (Nuevas):**
- `normalizeHeader()` - Normaliza nombres de columnas
- `detectDelimiter()` - Detecta automáticamente , o ;
- `normalizeWrappedCsvLines()` - Maneja líneas envueltas en comillas
- `normalizeKey()` - Normaliza claves para matching flexible
- `getFirstValue()` - Busca valor con múltiples alias
- `parseDecimal()` - Parseo robusto de decimales
- `parseDateValue()` - Parseo inteligente de fechas

### Frontend (`app/`)

```
app/
├── Dockerfile                # Nginx Alpine optimizado
├── nginx.conf               # Config avanzada (gzip, cache, SPA)
├── .dockerignore            # Optimización
├── index.html               # Portal web principal
├── index_EXAMPLE.html       # Template mejorado con ejemplos
└── assets/
    └── js/
        ├── api.js           # Cliente HTTP (BiLoaderAPIClient)
        │   ├─ obtenerCargas()
        │   ├─ obtenerDetalleCarga(id)
        │   ├─ subirArchivo(archivo)
        │   ├─ procesarCarga(id)
        │   ├─ eliminarCarga(id)
        │   └─ verificarSalud()
        │
        └── cargas.js        # Lógica de UI e integración
            ├─ cargarListaCargas()
            ├─ subirArchivo()
            ├─ verDetalle()      ◄── MEJORADO: muestra errores de validación
            ├─ procesarCarga()
            ├─ eliminarCarga()
            └─ mostrarEstado()
```

### Pipelines CI/CD (`azure-pipelines/`) ⭐ NUEVO

```
azure-pipelines/
├── frontend.yml              # Trigger: app/ cambios
│   ├─ Build bi-portal image
│   ├─ Push to ACR
│   └─ Deploy to Container App
│
└── backend.yml               # Trigger: api/ cambios
    ├─ Build bi-loader-api image
    ├─ Push to ACR
    └─ Deploy to Container App
```

### Documentación Mejorada

```
├── ARQUITECTURA.md           # Este archivo (visión general)
├── C4_MODEL.md              # NUEVO: Modelos C4 detallados
├── SETUP_ARCHITECTURE.md     # Guía paso a paso
├── CHECKLIST_FINAL.md       # Resumen y validaciones
└── README.md                # Overview general
```

---

## 🚀 Endpoints REST Disponibles

### Health Check
```
GET /api/health
Response: { status: "healthy", timestamp: "...", uptime: ... }
Status: 200
```

### Listar Cargas
```
GET /api/cargas
Response: [{
  idCarga: 1,
  nombreArchivo: "prueba.csv",
  registrosRecibidos: 100,
  registrosValidos: 98,
  registrosError: 2,
  estado: "PENDIENTE",
  usuarioCarga: "bi_loader_user",
  fechaCarga: "2026-05-13T..."
}]
Status: 200
```

### Detalle de Carga (Con Validación)
```
GET /api/cargas/1/detalle
Response: {
  carga: { ... },
  filas: [{
    idStaging: 1,
    idCarga: 1,
    filaArchivo: 1,
    fechaVenta: "2026-05-01",
    pais: "United States",
    categoria: "Bikes",
    producto: "Mountain-200 Black, 38",  ◄── Productos con comas ahora soportados
    cantidad: 3,
    totalVenta: 4500.00,
    estadoValidacion: "VALIDO",           ◄── NUEVO: validación
    mensajeValidacion: null
  }]
}
Status: 200
```

### Upload CSV
```
POST /api/cargas/upload
Content-Type: multipart/form-data
Body: archivo: [CSV file]

Response: {
  success: true,
  data: {
    idCarga: 5,
    nombreArchivo: "ventas-mayo.csv",
    filasInsertadas: 250
  }
}
Status: 200
```

### Procesar Carga
```
POST /api/cargas/1/procesar
Response: {
  success: true,
  message: "Carga 1 procesada correctamente",
  processedRows: 98
}
Status: 200
```

### Eliminar Carga
```
DELETE /api/cargas/1
Response: {
  success: true,
  message: "Carga 1 eliminada correctamente"
}
Status: 200
```

---

## 🔄 Flujo de Despliegue Mejorado

```
Git Push a main (master)
    │
    ├───────────────────────────────────────┐
    │                                       │
    ▼ (app/ cambió)              ▼ (api/ cambió)
┌─────────────┐                ┌──────────────────┐
│ frontend.yml│                │ backend.yml      │
│  Pipeline   │                │  Pipeline        │
├─────────────┤                ├──────────────────┤
│ • npm build │                │ • npm install    │
│ • docker    │                │ • docker build   │
│   build     │                │ • docker push    │
│ • docker    │                │ • az containerapp│
│   push      │  (Paralelo)    │   update         │
│ • az        │                │                  │
│   container │                │                  │
│   app update│                │                  │
└──────┬──────┘                └────────┬─────────┘
       │                               │
       │        Ambos OK               │
       └───────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Deployed to Azure   │
        │  • bi-portal v1.X    │
        │  • bi-loader-api v1.X│
        │  • Available in ACR  │
        └──────────────────────┘

Tiempo total: ~3.5 minutos
```

---

## 📊 Flujo de Datos (Upload → Process → Visualize)

```
PASO 1: Usuario sube CSV
┌──────────────┐
│ Usuario      │
│ (navegador)  │
└──────┬───────┘
       │ selecciona prueba_carga.csv
       │
       ▼
┌─────────────────────────┐
│ bi-portal (Frontend)    │
│ Form validation         │
└──────┬──────────────────┘
       │ FormData POST
       │
PASO 2: Backend procesa CSV
       ▼
┌──────────────────────────────────────┐
│ bi-loader-api (Backend)              │
│ POST /api/cargas/upload              │
│                                      │
│ ├─ Multer: save file in memory       │
│ ├─ detectDelimiter(): ','            │
│ ├─ normalizeWrappedLines():          │
│ │  "2026-05-01,US,...,"product, X".. │
│ │  →                                 │
│ │  2026-05-01,US,...,product, X      │
│ │                                    │
│ ├─ csv-parse: parse rows             │
│ ├─ normalizeKey(): "FechaVenta"→...  │
│ ├─ Validación: dates, decimals       │
│ └─ INSERT INTO BI_CargaVentas_Staging│
└──────┬───────────────────────────────┘
       │ response: { idCarga: 1, ... }
       │
       ▼
┌─────────────────────────┐
│ bi-portal (Frontend)    │
│ verDetalle():           │
│ • Fila 1 VALIDO        │
│ • Fila 2 VALIDO        │
│ • Total: 2 OK          │
└─────────────────────────┘

PASO 3: Usuario procesa carga
        │ POST /api/cargas/1/procesar
        │
        ▼
┌──────────────────────────────────────┐
│ bi-loader-api (Backend)              │
│                                      │
│ ├─ SELECT * FROM BI_CargaVentas_... │
│ ├─ WHERE estadoValidacion='VALIDO' │
│ └─ INSERT INTO BI_VentasManual      │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Azure SQL Server        │
│ • BI_VentasManual (OK) │
│ • Status: PROCESADA    │
└────────────────────────┘

PASO 4: Grafana visualiza
        │ SQL Query
        │
        ▼
┌─────────────────────────┐
│ bi-grafana              │
│ • Dashboard: Ventas     │
│ • Total: $4500 + $750.. │
│ • Categoría: Bikes      │
│ • Región: N. America    │
└─────────────────────────┘
```

---

## 🔐 Capas de Seguridad Implementadas

```
┌─ Nivel 1: Network (Ingress)
│  ├─ HTTPS obligatorio (TLS 1.2+)
│  ├─ Azure NSG Rules
│  └─ DDoS Protection (Standard)
│
├─ Nivel 2: API Layer
│  ├─ CORS validation
│  ├─ Input validation (CSV parsing)
│  ├─ Header validation
│  ├─ Rate limiting (future)
│  └─ Error handling sin data leakage
│
├─ Nivel 3: Data Layer
│  ├─ SQL parameterized queries
│  ├─ Connection pool con TLS
│  ├─ SQL Auth (no integrated)
│  ├─ Row-level security (future)
│  └─ Audit logging
│
└─ Nivel 4: Secrets Management
   ├─ Env vars en Container Apps
   ├─ Marked as secrets in pipelines
   ├─ Azure Key Vault (future)
   └─ No secrets in code/images
```

---

## 📈 Capacidades de Escalamiento

### Horizontal (Multi-instancia)
```
Current: 1 instancia de cada contenedor
Target:  N instancias con Load Balancer

Frontend:
  • Nginx es stateless → múltiples instancias
  • Load Balancer (Azure LB) distribuye tráfico
  • Auto-scale basado en CPU/Memory

Backend:
  • Express es stateless → múltiples instancias
  • Connection pool a DB es compartida
  • Auto-scale según demanda
  • Sessions: No aplica (stateless)

Database:
  • Azure SQL: Single write point
  • Replicas read-only: future
  • Backup automático (geo-redundant)
```

### Vertical (Recursos)
```
Frontend (actual):
  • CPU: 0.25 vCPU
  • Memory: 0.5 Gi
  • Escalable a: 2 vCPU, 4 Gi

Backend (actual):
  • CPU: 0.5 vCPU
  • Memory: 1 Gi
  • Escalable a: 4 vCPU, 8 Gi

Database:
  • Tier: Standard S0 (actual)
  • Escalable: Standard/Premium
  • Max: 1000 DTU equivalent
```

---

## 🎓 Nuevas Características Post-Fix

✅ **CSV Parsing Robusto**
- Detecta delimitadores automáticamente (`,` o `;`)
- Maneja líneas envueltas en comillas completas
- Convierte `""` escapadas a `"` reales
- Soporta productos con comas: `"Mountain-200 Black, 38"`

✅ **Validación Flexible**
- Múltiples alias por columna (FechaVenta, fechaVenta, fecha, date)
- Parseo inteligente de decimales (maneja `,` y `.`)
- Parseo inteligente de fechas (DD/MM/YYYY y ISO)
- Validación de data types en inserción

✅ **Feedback de Validación**
- Campo `estadoValidacion`: VALIDO | ERROR
- Campo `mensajeValidacion`: Detalles del error
- Frontend muestra errores específicos en popup
- No bloquea carga, solo marca como ERROR

✅ **Observabilidad**
- Health check integrado
- Logs con SQL config al iniciar
- Errors con stack trace en development
- Uptime y timestamps en responses

---

## 📞 URLs Importantes

### Local Development
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000/api`
- Backend Health: `http://localhost:3000/api/health`
- Grafana: `http://localhost:3000` (puerto diferente en Docker)

### Azure (Production)
- Frontend: `https://bi-portal.redcoast-1960ce03.southcentralus.azurecontainerinstances.io`
- Backend: `https://bi-loader-api.redcoast-1960ce03.southcentralus.azurecontainerinstances.io/api`
- ACR: `acrbistudentdev01.azurecr.io`
- DevOps: `https://dev.azure.com/[org]/[project]`

---

## ✨ Beneficios de esta Arquitectura

✅ **Separación de responsabilidades** - Frontend, Backend, Dashboard independientes
✅ **Escalabilidad horizontal** - Cada servicio escala según demanda
✅ **CI/CD automatizado** - Git push = Deploy automático
✅ **Fault isolation** - Un servicio caído no afecta otros
✅ **Tecnologías apropiadas** - Cada capa usa lo mejor para su caso
✅ **Seguridad en capas** - Network, API, Data, Secrets
✅ **Monitoreo integrado** - Health checks, logs, métricas
✅ **Reproducibilidad** - Docker garantiza mismo ambiente local/prod
✅ **Cost-effective** - Container Apps paga solo por uso
✅ **Mantenibilidad** - Código modular y documentado

---

**Última actualización:** 13 de mayo de 2026  
**Estado:** Documentación completa y C4 Models listos
**Siguiente paso:** Presentar a arquitecto de software para revisión y diagrama de alto nivel

---

## 📦 Archivos Creados

### Backend (`api/`)
```
api/
├── Dockerfile                 # Multi-stage build optimizado
├── package.json              # Dependencias Node.js
├── .env.example              # Variables de entorno
├── .dockerignore
└── src/
    ├── server.js             # Express server con CORS
    ├── services/
    │   ├── db.js             # Pool de conexión Azure SQL
    │   └── cargaService.js   # Lógica de negocio
    └── routes/
        └── cargas.js         # 5 endpoints REST
```

**Endpoints del Backend:**
- `GET /api/health` - Health check
- `GET /api/cargas` - Listar cargas
- `GET /api/cargas/:id/detalle` - Detalle de carga
- `POST /api/cargas/upload` - Subir CSV
- `POST /api/cargas/:id/procesar` - Procesar carga

### Frontend (`app/`)
```
app/
├── Dockerfile                # Nginx optimizado
├── nginx.conf               # Configuración web server
├── .dockerignore
├── index.html               # HTML existente
└── assets/
    └── js/
        ├── api.js           # Cliente HTTP para el backend
        └── cargas.js        # Ejemplo de consumo
```

### Pipelines CI/CD (`azure-pipelines/`)
```
azure-pipelines/
├── frontend.yml             # Pipeline para bi-portal
│   - Dispara al cambiar app/
│   - Build → Push ACR → Deploy
│
└── backend.yml              # Pipeline para bi-loader-api
    - Dispara al cambiar api/
    - Build → Push ACR → Deploy
```

### Documentación
- `SETUP_ARCHITECTURE.md` - Guía paso a paso de despliegue
- `README.md` - Este archivo

---

## 🚀 Siguientes Pasos

### 1️⃣ Preparar tu entorno local (testing)
```bash
# Backend
cd api
npm install
npm run dev          # Puerto 3000

# Frontend
cd app
docker build -t bi-portal .
docker run -p 8080:80 bi-portal
```

### 2️⃣ Crear Container App para el backend en Azure
```bash
az containerapp create \
  --name bi-loader-api \
  --resource-group rg-bi-student-dev \
  --environment cae-bi-student-dev \
  --image acrbistudentdev01.azurecr.io/bi-loader-api:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars DB_SERVER=... DB_USER=... DB_PASSWORD=...
```

### 3️⃣ Configurar Azure Pipelines
- Ve a Azure DevOps → Pipelines → Nuevo Pipeline
- Path: `azure-pipelines/frontend.yml` ✅
- Path: `azure-pipelines/backend.yml` ✅

### 4️⃣ Conectar frontend con backend
En `index.html`, incluir:
```html
<script src="assets/js/api.js"></script>
<script src="assets/js/cargas.js"></script>
```

### 5️⃣ Git push para desencadenar pipelines
```bash
git add .
git commit -m "feat: nueva arquitectura frontend+backend"
git push origin main
```

---

## 📊 Flujo de Despliegue

```
┌────────────────────────────────────────────────┐
│  Git Push a main (app/ o api/)                 │
└──────────────────┬─────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    app/ cambió           api/ cambió
        │                     │
    ┌───▼───┐             ┌───▼───┐
    │Build  │             │Build  │
    │app    │             │API    │
    └───┬───┘             └───┬───┘
        │                     │
    ┌───▼───┐             ┌───▼───┐
    │Push   │             │Push   │
    │ACR    │             │ACR    │
    └───┬───┘             └───┬───┘
        │                     │
    ┌───▼───────────────────┐ │
    │ Deploy bi-portal  ←───┘ │
    └─────────────────────────┘
        │
    ┌───▼───────────────────┐
    │ Deploy bi-loader-api  │
    └─────────────────────────┘
```

---

## 🔐 Configuración de Secretos

### En Azure Container Apps:
```
DB_SERVER = sql-bi-student-dev.database.windows.net
DB_PORT = 1433
DB_NAME = AdventureWorksDW2022_imp
DB_USER = sa
DB_PASSWORD = [del Key Vault]
CORS_ORIGIN = https://bi-portal.redcoast-xxx.azurecontainerinstances.io
NODE_ENV = production
```

### En Azure DevOps (Pipeline):
Crear Variable Group → `bi-loader-api-vars`
- Incluir los mismos valores
- Marcar DB_PASSWORD como "secret"

---

## ✅ Checklist Final

- [ ] Backend API creado en `api/`
- [ ] Pipelines creados en `azure-pipelines/`
- [ ] npm install en `api/` (local testing)
- [ ] Container App `bi-loader-api` creada en Azure
- [ ] Variables configuradas en pipelines
- [ ] Frontend conectado al backend (js/api.js)
- [ ] Primera subida a Git (main branch)
- [ ] Pipelines se disparan correctamente
- [ ] Verificar logs en Azure DevOps

---

## 📞 Documentación Completa

Ver `SETUP_ARCHITECTURE.md` para:
- Instrucciones detalladas paso a paso
- Comandos Azure CLI
- Troubleshooting
- Endpoints REST con ejemplos
- Configuración de CORS

---

## 🎓 Estructura de Datos (SQL Server)

El backend espera estas tablas:

```sql
CREATE TABLE BI_CargaArchivo (
    Id_Carga INT PRIMARY KEY IDENTITY(1,1),
    Nombre_Archivo NVARCHAR(255),
    Cantidad_Filas INT,
    Fecha_Carga DATETIME2,
    Estado NVARCHAR(50)
);

CREATE TABLE BI_CargaVentas_Staging (
    Id_Staging INT PRIMARY KEY IDENTITY(1,1),
    Id_Carga INT,
    Cantidad INT,
    Monto DECIMAL(18,2),
    Fecha DATETIME2,
    Categoria NVARCHAR(100),
    FOREIGN KEY (Id_Carga) REFERENCES BI_CargaArchivo(Id_Carga)
);
```

---

**¿Necesitas ayuda en alguno de estos pasos?** 🚀
