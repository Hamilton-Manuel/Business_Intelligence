# Technical Specifications - Backend API (bi-loader-api)

**Versión:** 1.6  
**Última Actualización:** 13 de mayo de 2026  
**Destinatario:** Ingenieros backend, DevOps, Arquitecto de Software

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura de Componentes](#arquitectura-de-componentes)
4. [API Endpoints Detallado](#api-endpoints-detallado)
5. [CSV Processing Engine](#csv-processing-engine)
6. [Data Validation](#data-validation)
7. [Database Schema](#database-schema)
8. [Deployment](#deployment)
9. [Monitoring & Logging](#monitoring--logging)
10. [Performance & Optimization](#performance--optimization)

---

## Descripción General

### Propósito
API REST Node.js que gestiona el flujo de carga, validación y procesamiento de archivos CSV hacia Azure SQL Server. Actúa como capa intermedia entre frontend (bi-portal) y datawarehouse.

### Responsabilidades Principales
- ✅ Recibir y parsear archivos CSV
- ✅ Normalizar y validar datos
- ✅ Insertar en tablas staging con validación fila-por-fila
- ✅ Procesar cargas: transferir datos válidos a tablas finales
- ✅ Mantener historial de cargas y validaciones
- ✅ Exponer API REST para operaciones CRUD

### Flujo Típico
```
CSV Upload (Frontend) 
    → Multipart Upload → Parsing → Validation 
    → Insert Staging → Response + ID
    
Detalle Carga (Frontend) 
    → GET request → Query Staging → Response con estado/errores
    
Procesar Carga (Frontend) 
    → POST request → Query Staging → Filter válidos 
    → Insert Final → Update Status → Response
```

---

## Stack Tecnológico

### Runtime & Framework
```
Node.js:        v18 LTS (Alpine Linux image)
Express.js:     4.18.2
Port:           3000
Memory:         1 GB (Container App)
CPU:            0.5 vCPU (Container App)
```

### Dependencias Principales
```json
{
  "express": "^4.18.2",
  "mssql": "^9.1.1",
  "csv-parse": "^5.4.1",
  "multer": "^1.4.5-lts.1",
  "cors": "^2.8.5",
  "dotenv": "^16.0.3"
}
```

### Database Connection
```
Type:           Azure SQL Server
Edition:        Standard (S0-S4)
Authentication: SQL User + Password
TLS:            1.2+ Required
Port:           1433
Connection Pool:
  - Min: 1
  - Max: 10
  - Idle Timeout: 30s
  - Connection Timeout: 30s
  - Request Timeout: 30s
```

### Container Runtime
```
Base Image:     node:18-alpine
Platform:       linux/amd64, linux/arm64
Size:           ~200 MB (optimized)
Startup Time:   ~5 segundos
Healthcheck:    GET /api/health (30s interval)
```

---

## Arquitectura de Componentes

### Estructura de Carpetas
```
api/
├── Dockerfile                 # Multi-stage build
├── .dockerignore              # Exclude: node_modules, .env, *.log
├── package.json               # Dependencies
├── .env.example               # Template variables
├── package-lock.json          # Lock reproducible builds
│
└── src/
    ├── server.js              # Express app + middleware setup
    │
    ├── services/
    │   ├── db.js              # Database connection pool + utilities
    │   └── cargaService.js    # Business logic core
    │
    └── routes/
        └── cargas.js          # REST endpoints router

```

### Componentes Principales

#### 1. **server.js** - Application Bootstrap
```javascript
// Responsibilities:
// ├─ Initialize Express app
// ├─ Register middleware (CORS, body-parser, multer)
// ├─ Register routes
// ├─ Global error handling
// ├─ Health check endpoint
// └─ Listen on port 3000

// Key sections:
app.use(cors())                  // CORS middleware
app.use(express.json())          // JSON body parser
app.use(express.urlencoded())    // Form data parser
app.use(multer.memoryStorage())  // File upload to memory
app.use('/api', cargasRouter)    // Route registration
app.use(errorHandler)            // Global error catch

// Health Check:
GET /api/health → { status, uptime, timestamp }
```

#### 2. **services/db.js** - Database Layer
```javascript
// Responsibilities:
// ├─ Create connection pool
// ├─ Execute SQL queries
// ├─ Handle connection lifecycle
// └─ Provide parameterized query utilities

// Connection Pool:
- Reused across requests
- TLS encryption mandatory
- Handles reconnection logic
- Connection limits: 1-10 active

// Exported functions:
getConnection()                  // Get connected pool
executeQuery(sql, params)        // Execute with parameters
close()                          // Close pool gracefully
```

#### 3. **services/cargaService.js** - Business Logic
```javascript
// Responsibilities:
// ├─ CSV parsing (main logic)
// ├─ Data validation
// ├─ Database transactions
// ├─ Error handling per row
// └─ Status management

// Key methods:

// obtenerCargas()
// ├─ SELECT * FROM BI_CargaArchivo
// ├─ ORDER BY dtFechaCarga DESC
// └─ Returns: [{ idCarga, nombreArchivo, ... }]

// obtenerDetalleCarga(idCarga)
// ├─ SELECT * FROM BI_CargaVentas_Staging
// ├─ WHERE intCargaID = @idCarga
// └─ Returns: [rows with validation status]

// crearCargaArchivo()
// ├─ INSERT INTO BI_CargaArchivo
// ├─ Returns: intID (newCargaID)
// └─ Status: PENDIENTE

// insertarFilasStaging(cargaID, rows, csvFile)
// ├─ Parse CSV with custom engine
// ├─ Validate each row
// ├─ INSERT INTO BI_CargaVentas_Staging per row
// ├─ Track success/error count
// └─ Returns: { validRows, errorRows, detailedErrors }

// procesarCarga(cargaID)
// ├─ SELECT from staging WHERE estadoValidacion='VALIDO'
// ├─ INSERT INTO BI_VentasManual
// ├─ UPDATE BI_CargaArchivo status → PROCESADA
// └─ Returns: { processedCount, statusUpdate }

// eliminarCarga(cargaID)
// ├─ DELETE FROM BI_CargaVentas_Staging
// ├─ DELETE FROM BI_CargaArchivo
// └─ Cascade delete
```

#### 4. **routes/cargas.js** - REST Endpoints
```javascript
// Responsibilities:
// ├─ HTTP request handling
// ├─ Route parameter validation
// ├─ Middleware chaining
// ├─ Response formatting
// └─ Error response mapping

// Endpoints:
GET    /api/health                // System status
GET    /api/cargas                 // List all uploads
GET    /api/cargas/:id/detalle     // Get upload + rows + validation
POST   /api/cargas/upload          // Upload + parse + validate
POST   /api/cargas/:id/procesar    // Process upload
DELETE /api/cargas/:id             // Delete upload
```

---

## API Endpoints Detallado

### 1. GET /api/health

**Purpose:** Health check for monitoring  
**Authentication:** None  
**Parameters:** None  

**Response: 200 OK**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-13T15:30:45.123Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.6.0"
}
```

**Response: 503 Service Unavailable**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection pool failed"
}
```

---

### 2. GET /api/cargas

**Purpose:** List all uploads with summary  
**Authentication:** None (Future: Bearer token)  
**Query Parameters:** 
- `limit` (optional): Default 50, Max 500
- `offset` (optional): Default 0
- `estado` (optional): PENDIENTE | PROCESADA | ERROR

**Response: 200 OK**
```json
{
  "success": true,
  "data": [
    {
      "idCarga": 1,
      "nombreArchivo": "prueba_carga.csv",
      "intRegistrosRecibidos": 3,
      "intRegistrosValidos": 3,
      "intRegistrosError": 0,
      "strEstado": "PENDIENTE",
      "strUsuarioCarga": "bi_loader_user",
      "dtFechaCarga": "2026-05-13T15:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0,
    "pages": 1
  }
}
```

**Error: 500 Internal Server Error**
```json
{
  "success": false,
  "error": "Database query failed",
  "details": "Connection timeout"
}
```

---

### 3. GET /api/cargas/:id/detalle

**Purpose:** Get upload details + row validation data  
**Authentication:** None  
**URL Parameters:**
- `id` (required): intID from BI_CargaArchivo

**Response: 200 OK**
```json
{
  "success": true,
  "carga": {
    "idCarga": 1,
    "nombreArchivo": "prueba_carga.csv",
    "intRegistrosRecibidos": 3,
    "intRegistrosValidos": 3,
    "intRegistrosError": 0,
    "strEstado": "PENDIENTE",
    "strUsuarioCarga": "bi_loader_user",
    "dtFechaCarga": "2026-05-13T15:00:00.000Z"
  },
  "filas": [
    {
      "idStaging": 1,
      "intFilaArchivo": 1,
      "dtFechaVenta": "2026-05-01",
      "strPais": "United States",
      "strGrupoTerritorial": "North America",
      "strCategoria": "Bikes",
      "strSubcategoria": "Mountain Bikes",
      "strProducto": "Mountain-200 Black, 38",
      "intCantidad": 3,
      "sinTotalVenta": 4500.00,
      "strMoneda": "USD",
      "strEstadoValidacion": "VALIDO",
      "strMensajeValidacion": null,
      "dtFechaRegistro": "2026-05-13T15:01:00.000Z"
    },
    {
      "idStaging": 2,
      "intFilaArchivo": 2,
      "dtFechaVenta": "2026-05-02",
      "strPais": "Canada",
      "strGrupoTerritorial": "North America",
      "strCategoria": "Bikes",
      "strSubcategoria": "Road Bikes",
      "strProducto": "Road-350 Red, 48",
      "intCantidad": 2,
      "sinTotalVenta": 750.00,
      "strMoneda": "USD",
      "strEstadoValidacion": "VALIDO",
      "strMensajeValidacion": null,
      "dtFechaRegistro": "2026-05-13T15:01:00.000Z"
    }
  ]
}
```

**Error: 404 Not Found**
```json
{
  "success": false,
  "error": "Carga no encontrada",
  "cargaId": 999
}
```

---

### 4. POST /api/cargas/upload

**Purpose:** Upload, parse, validate CSV file  
**Authentication:** None  
**Content-Type:** multipart/form-data  
**Request Body:**
- `archivo` (required): File multipart with CSV

**CSV Format Expected:**
```
FechaVenta,País,GrupoTerritorial,Categoría,Subcategoría,Producto,Cantidad,TotalVenta,Moneda
2026-05-01,United States,North America,Bikes,Mountain Bikes,"Mountain-200 Black, 38",3,4500.00,USD
```

**Field Aliases Supported:**
```javascript
// FechaVenta aliases: fechaventa, fecha_venta, date, fecha
// País aliases: pais, country, nacion
// Producto aliases: producto, product, nombre_producto
// Cantidad aliases: cantidad, quantity, qty, unidades
// TotalVenta aliases: total_venta, totalventa, total, amount
// Moneda aliases: moneda, currency, coin
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "idCarga": 5,
    "nombreArchivo": "prueba_carga.csv",
    "filasRecibidas": 3,
    "filasValidas": 3,
    "filasError": 0,
    "filasInsertadas": 3,
    "mensaje": "Carga creada exitosamente"
  }
}
```

**Response: 400 Bad Request** (Invalid file)
```json
{
  "success": false,
  "error": "No file uploaded",
  "details": "Expected field: 'archivo'"
}
```

**Response: 422 Unprocessable Entity** (Parsing error)
```json
{
  "success": false,
  "error": "CSV parsing failed",
  "details": "Delimiter detection failed - mixed delimiters detected",
  "rowsProcessed": 0
}
```

---

### 5. POST /api/cargas/:id/procesar

**Purpose:** Process upload (transfer valid rows to final table)  
**Authentication:** None  
**URL Parameters:**
- `id` (required): idCarga

**Request Body:** (Empty)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "idCarga": 1,
    "filasValidas": 3,
    "filasInsertadas": 3,
    "mensaje": "Carga procesada correctamente",
    "statusActual": "PROCESADA"
  }
}
```

**Response: 400 Bad Request** (No valid rows)
```json
{
  "success": false,
  "error": "No valid rows found",
  "details": "Carga 1 has only error rows"
}
```

---

### 6. DELETE /api/cargas/:id

**Purpose:** Delete upload and associated rows  
**Authentication:** None  
**URL Parameters:**
- `id` (required): idCarga

**Request Body:** (Empty)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "idCarga": 1,
    "rowsDeleted": 3,
    "mensaje": "Carga 1 eliminada correctamente"
  }
}
```

**Response: 404 Not Found**
```json
{
  "success": false,
  "error": "Carga no encontrada",
  "cargaId": 999
}
```

---

## CSV Processing Engine

### Architecture
```
Raw CSV File (from Frontend)
    ↓
[Multer] Memory buffer
    ↓
[BOM Removal] Check UTF-8 BOM (EF BB BF)
    ↓
[Delimiter Detection] Auto-detect , or ;
    ↓
[Line Normalization] Handle wrapped lines + escaped quotes
    ↓
[CSV Parser] csv-parse library with normalized input
    ↓
[Header Normalization] Remove accents, lowercase, trim
    ↓
[Row Validation] Field type conversion + business rules
    ↓
[Staging Insert] One transaction per row with error tracking
    ↓
Response with ID
```

### Step 1: BOM Removal
```javascript
// Input: Buffer with possible UTF-8 BOM
// Process: Check first 3 bytes (EF BB BF)
// Output: String without BOM
function removeBom(buffer) {
  if (buffer[0] === 0xEF && 
      buffer[1] === 0xBB && 
      buffer[2] === 0xBF) {
    return buffer.slice(3).toString('utf-8');
  }
  return buffer.toString('utf-8');
}
```

### Step 2: Delimiter Detection
```javascript
// Input: CSV string (first 5000 chars)
// Process: Count commas vs semicolons
// Output: Detected delimiter
function detectDelimiter(csvText) {
  const firstLines = csvText.split('\n').slice(0, 10).join('\n');
  const commaCount = (firstLines.match(/,/g) || []).length;
  const semiCount = (firstLines.match(/;/g) || []).length;
  return commaCount > semiCount ? ',' : ';';
}
```

### Step 3: Line Normalization (🔑 Critical Fix)
```javascript
// Problem: Lines like:
// "2026-05-01,US,North America,Bikes,Mountain Bikes,"Mountain-200 Black, 38",3,4500.00,USD"
// Were parsed as single column because entire line wrapped in quotes

// Solution: Normalize wrapped lines
function normalizeWrappedCsvLines(csvText, delimiter) {
  const lines = csvText.split('\n');
  const allWrapped = lines.every(line => 
    line.trim().startsWith('"') && line.trim().endsWith('"')
  );
  
  if (allWrapped) {
    return lines.map(line => {
      // Remove outer quotes
      let unwrapped = line.trim().slice(1, -1);
      // Convert "" escaped quotes to single "
      unwrapped = unwrapped.replace(/""/g, '"');
      return unwrapped;
    }).join('\n');
  }
  
  return csvText;
}
```

### Step 4: Header Normalization
```javascript
// Input: Headers from CSV (may have accents, spaces, mixed case)
// Examples: "FechaVenta", "fecha venta", "fecha-venta", "Fecha_Venta"
// Output: Normalized header for matching
function normalizeHeader(header) {
  return header
    .toLowerCase()
    .trim()
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[\s_-]+/g, '');  // Remove spaces, _, -
}

// Result: "FechaVenta" → "fechaventa"
// Result: "Fecha Venta" → "fechaventa"
// Result: "fecha-venta" → "fechaventa"
// Result: "fécha_vënta" → "fechaventa"
```

### Step 5: Row Validation

#### Field Aliases
```javascript
const FIELD_ALIASES = {
  fecha: ['fechaventa', 'fecha_venta', 'date', 'fecha'],
  pais: ['pais', 'country', 'nacion', 'destino'],
  categoria: ['categoria', 'category', 'tipo'],
  producto: ['producto', 'product', 'nombre_producto', 'item'],
  cantidad: ['cantidad', 'quantity', 'qty', 'unidades'],
  totalventa: ['total_venta', 'totalventa', 'total', 'amount', 'monto'],
  moneda: ['moneda', 'currency', 'coin', 'divisa']
};
```

#### Type Conversion Functions
```javascript
// parseDecimal(value)
// ├─ Removes currency symbols ($, €, £)
// ├─ Handles European decimal (,) or US (.)
// ├─ Trims spaces
// └─ Returns: number | null
function parseDecimal(value) {
  if (!value) return null;
  value = String(value)
    .replace(/[$€£]/g, '')
    .trim();
  
  // Detect decimal separator
  const hasComma = value.includes(',');
  const hasPeriod = value.includes('.');
  
  if (hasComma && !hasPeriod) {
    // European: 4.500,50 → 4500.50
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && hasPeriod) {
    // Mixed: 4,500.50 → 4500.50
    value = value.replace(/,/g, '');
  }
  
  return parseFloat(value) || null;
}

// parseDateValue(value)
// ├─ Tries DD/MM/YYYY format
// ├─ Falls back to ISO format
// ├─ Validates date range
// └─ Returns: ISO string | null
function parseDateValue(value) {
  if (!value) return null;
  value = String(value).trim();
  
  // Try DD/MM/YYYY
  const ddmmyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (ddmmyy) {
    const [, day, month, year] = ddmmyy;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() == year) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Try ISO YYYY-MM-DD
  const date = new Date(value);
  if (!isNaN(date)) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}
```

### Step 6: Staging Insert Transaction
```javascript
// Pseudo-code
for (each row in parsed CSV) {
  try {
    const validatedRow = {
      intCargaID,
      intFilaArchivo: rowIndex,
      dtFechaVenta: parseDateValue(row['fecha']),
      strPais: row['pais']?.trim(),
      strGrupoTerritorial: row['grupo']?.trim(),
      strCategoria: row['categoria']?.trim(),
      strSubcategoria: row['subcategoria']?.trim(),
      strProducto: row['producto']?.trim(),
      intCantidad: parseInt(row['cantidad']),
      sinTotalVenta: parseDecimal(row['totalventa']),
      strMoneda: row['moneda']?.toUpperCase(),
      strEstadoValidacion: 'VALIDO',
      strMensajeValidacion: null
    };
    
    // Validate business rules
    if (!validatedRow.dtFechaVenta) {
      validatedRow.strEstadoValidacion = 'ERROR';
      validatedRow.strMensajeValidacion = 'Invalid date format';
    }
    if (validatedRow.intCantidad < 0) {
      validatedRow.strEstadoValidacion = 'ERROR';
      validatedRow.strMensajeValidacion = 'Cantidad cannot be negative';
    }
    
    INSERT INTO BI_CargaVentas_Staging (validatedRow)
    validRows++
    
  } catch (error) {
    errorRows++
    logError(rowIndex, error.message)
  }
}

Return { validRows, errorRows }
```

---

## Data Validation

### Validation Rules

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| **FechaVenta** | Date | ✅ | DD/MM/YYYY or ISO, date not in future |
| **País** | String | ✅ | Max 100 chars, not empty |
| **Categoría** | String | ✅ | Max 100 chars, not empty |
| **Producto** | String | ✅ | Max 200 chars (supports commas), not empty |
| **Cantidad** | Integer | ✅ | > 0, <= 10000 |
| **TotalVenta** | Decimal | ✅ | > 0, <= 999999999.99 |
| **Moneda** | String(3) | ✅ | Valid ISO 4217 code |

### Error Messages
```
"Invalid date format: expected DD/MM/YYYY or YYYY-MM-DD"
"Cantidad cannot be negative"
"Producto name too long (max 200 chars)"
"Invalid currency code"
"Amount exceeds maximum allowed"
"Missing required field: País"
```

---

## Database Schema

### BI_CargaArchivo (Header Table)
```sql
CREATE TABLE BI_CargaArchivo (
  intID INT IDENTITY(1,1) PRIMARY KEY,
  strNombreArchivo NVARCHAR(255) NOT NULL,
  intRegistrosRecibidos INT NOT NULL,
  intRegistrosValidos INT NOT NULL,
  intRegistrosError INT NOT NULL DEFAULT 0,
  strEstado NVARCHAR(50) NOT NULL 
    DEFAULT 'PENDIENTE'  -- PENDIENTE, PROCESADA, ERROR
    CHECK (strEstado IN ('PENDIENTE','PROCESADA','PROCESADA CON ERRORES')),
  strUsuarioCarga NVARCHAR(100) NOT NULL DEFAULT 'bi_loader_user',
  dtFechaCarga DATETIME DEFAULT GETUTCDATE(),
  
  INDEX IX_Estado ON strEstado,
  INDEX IX_FechaCarga ON dtFechaCarga DESC
)
```

### BI_CargaVentas_Staging (Staging + Validation)
```sql
CREATE TABLE BI_CargaVentas_Staging (
  intID INT IDENTITY(1,1) PRIMARY KEY,
  intCargaID INT NOT NULL FOREIGN KEY REFERENCES BI_CargaArchivo(intID),
  intFilaArchivo INT NOT NULL,
  dtFechaVenta DATE NOT NULL,
  strPais NVARCHAR(100) NOT NULL,
  strGrupoTerritorial NVARCHAR(100),
  strCategoria NVARCHAR(100) NOT NULL,
  strSubcategoria NVARCHAR(100),
  strProducto NVARCHAR(200) NOT NULL,
  intCantidad INT NOT NULL,
  sinTotalVenta DECIMAL(18,2) NOT NULL,
  strMoneda NVARCHAR(3) NOT NULL,
  strEstadoValidacion NVARCHAR(20) NOT NULL DEFAULT 'VALIDO'
    CHECK (strEstadoValidacion IN ('VALIDO','ERROR')),
  strMensajeValidacion NVARCHAR(500),
  dtFechaRegistro DATETIME DEFAULT GETUTCDATE(),
  
  INDEX IX_CargaID ON intCargaID,
  INDEX IX_Estado ON strEstadoValidacion,
  INDEX IX_FechaVenta ON dtFechaVenta
)
```

### BI_VentasManual (Final Table)
```sql
CREATE TABLE BI_VentasManual (
  intID INT IDENTITY(1,1) PRIMARY KEY,
  intCargaID INT NOT NULL FOREIGN KEY REFERENCES BI_CargaArchivo(intID),
  dtFechaVenta DATE NOT NULL,
  strPais NVARCHAR(100) NOT NULL,
  strGrupoTerritorial NVARCHAR(100),
  strCategoria NVARCHAR(100) NOT NULL,
  strSubcategoria NVARCHAR(100),
  strProducto NVARCHAR(200) NOT NULL,
  intCantidad INT NOT NULL,
  sinTotalVenta DECIMAL(18,2) NOT NULL,
  strMoneda NVARCHAR(3) NOT NULL,
  dtFechaInsertado DATETIME DEFAULT GETUTCDATE(),
  
  INDEX IX_CargaID ON intCargaID,
  INDEX IX_FechaVenta ON dtFechaVenta,
  INDEX IX_Pais ON strPais
)
```

---

## Deployment

### Container Image Build
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY package*.json ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "src/server.js"]
```

### Environment Variables
```bash
# Azure SQL Connection
DB_HOST=sql-bi-student-dev.database.windows.net
DB_PORT=1433
DB_USER=sa_bi_loader
DB_PASSWORD=<secure-password>
DB_NAME=AdventureWorksDW2022_imp
DB_ENCRYPT=true

# Application
NODE_ENV=production
PORT=3000

# CORS
CORS_ORIGIN=https://bi-portal.redcoast-*.azurecontainerinstances.io

# Logging
LOG_LEVEL=info
```

### Azure Deployment Steps
```bash
# 1. Build image locally
docker build -t acrbistudentdev01.azurecr.io/bi-loader-api:1.6 ./api

# 2. Push to ACR
az acr login --name acrbistudentdev01
docker push acrbistudentdev01.azurecr.io/bi-loader-api:1.6

# 3. Update Container App with new image
az containerapp update \
  --name bi-loader-api \
  --resource-group rg-bi-student-dev \
  --image acrbistudentdev01.azurecr.io/bi-loader-api:1.6

# 4. Monitor rollout
az containerapp replica list \
  -n bi-loader-api \
  -g rg-bi-student-dev
```

---

## Monitoring & Logging

### Health Check Endpoint
```
GET /api/health
Response: { status, uptime, timestamp, database }
Interval: 30s from Container App
Timeout: 3s
Retries: 3
```

### Application Logging
```javascript
// Log levels: DEBUG, INFO, WARN, ERROR

// On startup:
console.log('Database config:', {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  encryption: true
});

// On request:
console.info(`${method} ${path} - ${statusCode} - ${duration}ms`);

// On error:
console.error('CSV parsing failed', {
  cargaID,
  error: error.message,
  stack: error.stack
});
```

### Key Metrics to Monitor
- ✅ API response times (p50, p95, p99)
- ✅ CSV parsing duration
- ✅ Database connection pool utilization
- ✅ Error rate (4xx, 5xx responses)
- ✅ File upload size distribution
- ✅ Container memory/CPU usage

---

## Performance & Optimization

### CSV Processing Performance
```
File Size | Parse Time | Rows | Memory Usage | Bottleneck
---------|------------|------|--------------|----------
100 KB   | 50 ms      | 1000 | 5 MB        | CSV parsing
1 MB     | 500 ms     | 10k  | 20 MB       | DB inserts
10 MB    | 5s         | 100k | 80 MB       | Memory limit
```

### Optimization Strategies
1. **Memory Buffer** - Multer keeps file in memory (streaming option for large files)
2. **Connection Pooling** - Reuse DB connections across requests
3. **Batch Inserts** - Insert rows in chunks for staging
4. **Parameterized Queries** - Prevent SQL injection + optimization
5. **Index Optimization** - Indexes on CargaID, Estado for fast queries

### Caching Opportunities (Future)
- Cache delimiter detection result (5 min TTL)
- Cache field aliases normalization (static)
- Cache validation rules (static)
- Redis cache for recent carga IDs

### Scalability Recommendations
- **Horizontal**: Add more Container App replicas (frontend load balancing)
- **Vertical**: Increase CPU/Memory per replica
- **Database**: Connection pool → managed pool service
- **Async Processing**: Move large file processing to background queue (Service Bus)

---

**Documento técnico para ingenieros**  
**Versión:** 1.6 | **Actualizado:** 13 de mayo de 2026
