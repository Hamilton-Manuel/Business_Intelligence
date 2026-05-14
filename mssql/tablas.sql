/* =========================================================
   1. TABLA MAESTRA DE CARGAS
   ========================================================= */
IF OBJECT_ID('dbo.BI_CargaArchivo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BI_CargaArchivo (
        intID                INT IDENTITY(1,1) NOT NULL,
        strNombreArchivo     NVARCHAR(260) NOT NULL,
        strTipoArchivo       NVARCHAR(20) NULL,
        intRegistrosRecibidos INT NOT NULL DEFAULT 0,
        intRegistrosValidos  INT NOT NULL DEFAULT 0,
        intRegistrosError    INT NOT NULL DEFAULT 0,
        strEstado            NVARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
        strUsuarioCarga      NVARCHAR(150) NULL,
        strObservaciones     NVARCHAR(500) NULL,
        dtFechaCarga         DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT PK_BI_CargaArchivo PRIMARY KEY (intID)
    );
END
GO

/* =========================================================
   2. STAGING DE CARGA MASIVA
   ========================================================= */
IF OBJECT_ID('dbo.BI_CargaVentas_Staging', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BI_CargaVentas_Staging (
        intID                 INT IDENTITY(1,1) NOT NULL,
        intCargaID            INT NOT NULL,
        intFilaArchivo        INT NOT NULL,

        dtFechaVenta          DATE NULL,
        strPais               NVARCHAR(100) NULL,
        strGrupoTerritorial   NVARCHAR(100) NULL,
        strCategoria          NVARCHAR(100) NULL,
        strSubcategoria       NVARCHAR(100) NULL,
        strProducto           NVARCHAR(200) NULL,
        intCantidad           INT NULL,
        sinTotalVenta         DECIMAL(18,2) NULL,
        strMoneda             NVARCHAR(10) NOT NULL DEFAULT 'USD',

        strEstadoValidacion   NVARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        strMensajeValidacion  NVARCHAR(500) NULL,
        dtFechaRegistro       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT PK_BI_CargaVentas_Staging PRIMARY KEY (intID),
        CONSTRAINT FK_BI_CargaVentas_Staging_CargaArchivo
            FOREIGN KEY (intCargaID) REFERENCES dbo.BI_CargaArchivo(intID),
        CONSTRAINT CHK_BI_CargaVentas_Staging_Cantidad
            CHECK (intCantidad IS NULL OR intCantidad >= 0),
        CONSTRAINT CHK_BI_CargaVentas_Staging_Total
            CHECK (sinTotalVenta IS NULL OR sinTotalVenta >= 0)
    );
END
GO

/* =========================================================
   3. TABLA FINAL ANALITICA
   ========================================================= */
IF OBJECT_ID('dbo.BI_VentasManual', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BI_VentasManual (
        intID                 INT IDENTITY(1,1) NOT NULL,
        intCargaID            INT NOT NULL,

        dtFechaVenta          DATE NOT NULL,
        intAnio               AS YEAR(dtFechaVenta) PERSISTED,
        intMes                AS MONTH(dtFechaVenta) PERSISTED,

        strPais               NVARCHAR(100) NOT NULL,
        strGrupoTerritorial   NVARCHAR(100) NULL,
        strCategoria          NVARCHAR(100) NOT NULL,
        strSubcategoria       NVARCHAR(100) NULL,
        strProducto           NVARCHAR(200) NOT NULL,
        intCantidad           INT NOT NULL,
        sinTotalVenta         DECIMAL(18,2) NOT NULL,
        strMoneda             NVARCHAR(10) NOT NULL DEFAULT 'USD',

        strFuente             NVARCHAR(30) NOT NULL DEFAULT 'MANUAL',
        dtFechaInsercion      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT PK_BI_VentasManual PRIMARY KEY (intID),
        CONSTRAINT FK_BI_VentasManual_CargaArchivo
            FOREIGN KEY (intCargaID) REFERENCES dbo.BI_CargaArchivo(intID),
        CONSTRAINT CHK_BI_VentasManual_Cantidad
            CHECK (intCantidad >= 0),
        CONSTRAINT CHK_BI_VentasManual_Total
            CHECK (sinTotalVenta >= 0)
    );
END
GO

/* =========================================================
   4. INDICES PARA CONSULTAS / REPORTES
   ========================================================= */
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BI_VentasManual_Fecha'
      AND object_id = OBJECT_ID('dbo.BI_VentasManual')
)
BEGIN
    CREATE INDEX IX_BI_VentasManual_Fecha
        ON dbo.BI_VentasManual (dtFechaVenta, intAnio, intMes);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BI_VentasManual_Pais'
      AND object_id = OBJECT_ID('dbo.BI_VentasManual')
)
BEGIN
    CREATE INDEX IX_BI_VentasManual_Pais
        ON dbo.BI_VentasManual (strPais);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BI_VentasManual_Categoria'
      AND object_id = OBJECT_ID('dbo.BI_VentasManual')
)
BEGIN
    CREATE INDEX IX_BI_VentasManual_Categoria
        ON dbo.BI_VentasManual (strCategoria);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BI_VentasManual_Producto'
      AND object_id = OBJECT_ID('dbo.BI_VentasManual')
)
BEGIN
    CREATE INDEX IX_BI_VentasManual_Producto
        ON dbo.BI_VentasManual (strProducto);
END
GO

/* Prueba rápida con datos */
INSERT INTO dbo.BI_CargaArchivo (
    strNombreArchivo,
    strTipoArchivo,
    intRegistrosRecibidos,
    strEstado,
    strUsuarioCarga,
    strObservaciones
)
VALUES (
    'ventas_prueba.csv',
    'CSV',
    2,
    'PENDIENTE',
    'adminazurebi',
    'Carga de prueba inicial'
);
GO
/*Insertar a staging*/
INSERT INTO dbo.BI_CargaVentas_Staging (
    intCargaID,
    intFilaArchivo,
    dtFechaVenta,
    strPais,
    strGrupoTerritorial,
    strCategoria,
    strSubcategoria,
    strProducto,
    intCantidad,
    sinTotalVenta,
    strMoneda,
    strEstadoValidacion,
    strMensajeValidacion
)
VALUES
(1, 1, '2024-01-15', 'United States', 'North America', 'Bikes', 'Mountain Bikes', 'Mountain-200 Black, 38', 3, 4500.00, 'USD', 'VALIDO', NULL),
(1, 2, '2024-01-20', 'Canada', 'North America', 'Accessories', 'Helmets', 'Sport-100 Helmet, Red', 5, 750.00, 'USD', 'VALIDO', NULL);
GO

/*Pasar a tabla final*/
INSERT INTO dbo.BI_VentasManual (
    intCargaID,
    dtFechaVenta,
    strPais,
    strGrupoTerritorial,
    strCategoria,
    strSubcategoria,
    strProducto,
    intCantidad,
    sinTotalVenta,
    strMoneda
)
SELECT
    intCargaID,
    dtFechaVenta,
    strPais,
    strGrupoTerritorial,
    strCategoria,
    strSubcategoria,
    strProducto,
    intCantidad,
    sinTotalVenta,
    strMoneda
FROM dbo.BI_CargaVentas_Staging
WHERE intCargaID = 1
  AND strEstadoValidacion = 'VALIDO';
GO

/* =========================================================
   USUARIO CONTENIDO PARA BACKEND EN AZURE SQL DATABASE
   ========================================================= */
IF NOT EXISTS (
    SELECT 1
    FROM sys.database_principals
    WHERE name = 'bi_loader_user'
)
BEGIN
    CREATE USER bi_loader_user
    WITH PASSWORD = 'CargaMasiva94Nube.';
END
GO

/* =========================================================
   PERMISOS MINIMOS PARA CARGA
   ========================================================= */


/* Cabecera de carga */
GRANT INSERT, UPDATE
ON dbo.BI_CargaArchivo
TO bi_loader_user;
GO

GRANT SELECT
ON dbo.BI_CargaArchivo
TO bi_loader_user;
GO

/* Staging */
GRANT INSERT, UPDATE
ON dbo.BI_CargaVentas_Staging
TO bi_loader_user;
GO

GRANT SELECT
ON dbo.BI_CargaVentas_Staging
TO bi_loader_user;
GO

GRANT SELECT, INSERT, UPDATE
ON dbo.BI_VentasManual
TO bi_loader_user;
GO