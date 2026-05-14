# Guía de Setup - Arquitectura Frontend + Backend + Pipeline

## 📁 Estructura del Proyecto

```
Business_Intelligence/
├── app/                           # Frontend (Nginx + HTML/CSS/JS)
│   ├── Dockerfile                # Build estático
│   ├── nginx.conf                # Config de Nginx
│   ├── index.html                # Landing page
│   ├── assets/                   # CSS, JS, imágenes
│   └── .dockerignore
│
├── api/                           # Backend (Node.js + Express)
│   ├── Dockerfile                # Multi-stage build
│   ├── package.json              # Dependencias
│   ├── .env.example              # Variables de entorno
│   ├── .dockerignore
│   └── src/
│       ├── server.js             # Servidor Express
│       ├── services/
│       │   ├── db.js             # Conexión Azure SQL
│       │   └── cargaService.js   # Lógica de negocio
│       └── routes/
│           └── cargas.js         # Endpoints API
│
├── azure-pipelines/              # CI/CD
│   ├── frontend.yml              # Pipeline para app/
│   └── backend.yml               # Pipeline para api/
│
└── grafana/                      # (ya existente)
```

---

## 🚀 Pasos para Desplegar

### **Paso 1: Configurar Azure Container Registry (ACR)**
```bash
# Ya debes tener: acrbistudentdev01

# Verificar login
az acr login --name acrbistudentdev01
```

### **Paso 2: Crear las nuevas Container Apps en Azure**

#### Para el Backend (bi-loader-api):
```bash
az containerapp create \
  --name bi-loader-api \
  --resource-group rg-bi-student-dev \
  --environment cae-bi-student-dev \
  --image acrbistudentdev01.azurecr.io/bi-loader-api:latest \
  --target-port 3000 \
  --ingress external \
  --secrets \
    db-server="sql-bi-student-dev.database.windows.net" \
    db-password="YourPassword123!" \
  --env-vars \
    DB_SERVER=sql-bi-student-dev.database.windows.net \
    DB_PORT=1433 \
    DB_NAME=AdventureWorksDW2022_imp \
    DB_USER=sa \
    DB_PASSWORD=secretref:db-password \
    NODE_ENV=production \
    CORS_ORIGIN=https://bi-portal.redcoast-1960ce03.southcentralus.azurecontainerinstances.io
```

#### Para el Frontend (ya existe bi-portal):
- Solo actualizar la imagen cuando hagas `git push`

---

### **Paso 3: Configurar Azure Pipelines**

1. **Ve a Azure DevOps** → Tu proyecto → Pipelines
2. **Crear nuevo pipeline:**
   - Selecciona: Azure Repos Git
   - Selecciona tu repo
   - Path: `azure-pipelines/frontend.yml` → Guardar

3. **Repetir para backend:**
   - Path: `azure-pipelines/backend.yml` → Guardar

---

### **Paso 4: Variables de Pipeline (secrets)**

En Azure DevOps → Pipelines → Library → Variable groups

Crear grupo `bi-loader-api-vars`:
```
DB_SERVER = sql-bi-student-dev.database.windows.net
DB_PORT = 1433
DB_NAME = AdventureWorksDW2022_imp
DB_USER = sa
DB_PASSWORD = YourPassword123! (marcar como secret)
CORS_ORIGIN = https://bi-portal.redcoast-1960ce03.southcentralus.azurecontainerinstances.io
```

Luego en `backend.yml`, agregar:
```yaml
variables:
  - group: bi-loader-api-vars
```

---

## 🔄 Flujo de Trabajo con Git

### **1. Hacer cambios en el frontend:**
```bash
cd app
# Editar index.html, CSS, JS...
git add app/
git commit -m "feat: agregar formulario de carga"
git push origin main
```
→ **Se dispara** `frontend.yml`
→ Build, push a ACR, deploy a `bi-portal`

### **2. Hacer cambios en el backend:**
```bash
cd api
# Editar server.js, routes, etc...
git add api/
git commit -m "feat: agregar validación de CSV"
git push origin main
```
→ **Se dispara** `backend.yml`
→ Build, push a ACR, deploy a `bi-loader-api`

### **3. Si cambias ambos:**
```bash
git add app/ api/
git commit -m "feat: nueva funcionalidad"
git push origin main
```
→ **Se disparan ambos pipelines en paralelo**

---

## 🧪 Testing Local

### **Backend:**
```bash
cd api
npm install
npm run dev
```
Luego probar:
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/cargas
```

### **Frontend:**
```bash
cd app
docker build -t bi-portal:test .
docker run -p 8080:80 bi-portal:test
```
Luego: `http://localhost:8080`

---

## 📊 Endpoints del Backend

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/cargas` | Listar cargas |
| GET | `/api/cargas/:id/detalle` | Detalle de una carga |
| POST | `/api/cargas/upload` | Subir CSV |
| POST | `/api/cargas/:id/procesar` | Procesar carga |

---

## ⚙️ Configuración Importante

### **CORS (Cross-Origin Resource Sharing)**
El frontend (bi-portal) necesita comunicarse con el backend (bi-loader-api).

En `api/src/server.js`:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
```

El valor `CORS_ORIGIN` debe ser la URL pública del frontend en Azure.

### **Base de Datos**
- Asegúrate que en tu Azure SQL existan las tablas:
  - `BI_CargaArchivo`
  - `BI_CargaVentas_Staging`
  - `BI_VentasManual` (o equivalente)

---

## 🔐 Seguridad

✅ **Credenciales:** Usar Azure Key Vault o Secrets de Container Apps
✅ **SSL/TLS:** Azure Container Apps proporciona certificados automáticos
✅ **CORS:** Configurado solo para dominios permitidos
✅ **HTTPS:** Los endpoints públicos usan HTTPS automáticamente

---

## 📝 Próximos Pasos

1. ✅ Backend API creado y listo
2. ⬜ Modificar `index.html` para consumir endpoints del API
3. ⬜ Crear rutas adicionales si es necesario
4. ⬜ Agregar autenticación si lo requieres
5. ⬜ Monitoear con Application Insights

---

## 🆘 Troubleshooting

**¿El pipeline no se dispara?**
- Verifica que el archivo yml esté en `azure-pipelines/`
- Verifica que la rama sea `main`
- Verifica que los cambios sean en las carpetas correctas

**¿El container no arranca?**
- Ver logs: `az containerapp logs show -n bi-loader-api -g rg-bi-student-dev`
- Verificar variables de entorno

**¿El frontend no conecta con el backend?**
- Verificar CORS_ORIGIN en Container App
- Usar DevTools del navegador (pestaña Network)
- Verificar que bi-loader-api esté levantado
