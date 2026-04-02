# Business Intelligence con AdventureWorksDW2022, SQL Server, Grafana y Docker

## Descripción
Este proyecto implementa una solución de Business Intelligence en entorno local usando contenedores Docker.  
Se utiliza la base de datos `AdventureWorksDW2022` como Data Warehouse, `Grafana` como herramienta de visualización y una `app web` ligera como portal de acceso.

## Objetivo
Construir una arquitectura modular con 3 contenedores principales:

- SQL Server
- Grafana
- App web

La solución está pensada para correr primero en local y luego migrarse a Azure.

---

## Arquitectura del proyecto

### Contenedores
- **sqlserver**  
  Motor SQL Server 2022 con la base `AdventureWorksDW2022` restaurada desde `.bak`.

- **grafana**  
  Herramienta de visualización conectada por datasource MSSQL provisionado por YAML.

- **app**  
  Portal web ligero montado sobre Nginx para acceder al proyecto, explicar la arquitectura y enlazar dashboards.

---

## Puertos usados

- **1433** → SQL Server
- **3000** → Grafana
- **8080** → App portal

---

## Estructura del proyecto

```text
Business_Intelligence/
├─ docker-compose.yml
├─ README.md
├─ mssql/
│  ├─ backups/
│  ├─ data/
│  ├─ log/
│  └─ secrets/
├─ grafana/
│  ├─ data/
│  ├─ dashboards/
│  │  └─ ventas-resumen.json
│  └─ provisioning/
│     ├─ datasources/
│     │  └─ mssql.yml
│     └─ dashboards/
│        └─ dashboards.yml
└─ app/
   └─ index.html