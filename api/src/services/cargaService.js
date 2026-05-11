const { getConnection, sql } = require('./db');

function normalizeField(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value).trim();
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["]|[']/g, '')
    .replace(/[\s\-\/]+/g, '_');
}

function getFirstValue(raw, aliases) {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    const value = raw[key];

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return normalizeField(value);
    }
  }
  return null;
}

function parseDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let strValue = String(value).trim();
  strValue = strValue.replace(/\$/g, '').replace(/\s/g, '');

  if (strValue.includes(',') && strValue.includes('.')) {
    strValue = strValue.replace(/,/g, '');
  } else if (strValue.includes(',') && !strValue.includes('.')) {
    strValue = strValue.replace(',', '.');
  }

  const num = parseFloat(strValue);
  return Number.isNaN(num) ? null : num;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const strValue = String(value).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(strValue)) {
    const [day, month, year] = strValue.split('/');
    const dt = new Date(`${year}-${month}-${day}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(strValue);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseBooleanValid(value) {
  return ['true', '1', 'si', 'sí', 'valid', 'valido', 'válido'].includes(String(value).trim().toLowerCase());
}

class CargaService {
  async obtenerCargas() {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .query(`
          SELECT TOP 100
            intID AS idCarga,
            strNombreArchivo AS nombreArchivo,
            intRegistrosRecibidos AS registrosRecibidos,
            intRegistrosValidos AS registrosValidos,
            intRegistrosError AS registrosError,
            strEstado AS estado,
            strUsuarioCarga AS usuarioCarga,
            dtFechaCarga AS fechaCarga
          FROM dbo.BI_CargaArchivo
          ORDER BY dtFechaCarga DESC
        `);
      return result.recordset;
    } catch (error) {
      console.error('Error obtaining cargas:', error);
      throw error;
    }
  }

  async obtenerDetalleCarga(idCarga) {
    try {
      const pool = await getConnection();
      
      const headerResult = await pool.request()
        .input('idCarga', sql.Int, idCarga)
        .query(`
          SELECT 
            intID AS idCarga,
            strNombreArchivo AS nombreArchivo,
            strTipoArchivo AS tipoArchivo,
            intRegistrosRecibidos AS registrosRecibidos,
            intRegistrosValidos AS registrosValidos,
            intRegistrosError AS registrosError,
            strEstado AS estado,
            strUsuarioCarga AS usuarioCarga,
            strObservaciones AS observaciones,
            dtFechaCarga AS fechaCarga
          FROM dbo.BI_CargaArchivo
          WHERE intID = @idCarga
        `);

      const rowsResult = await pool.request()
        .input('idCarga', sql.Int, idCarga)
        .query(`
          SELECT TOP 100
            intID AS idStaging,
            intCargaID AS idCarga,
            intFilaArchivo AS filaArchivo,
            dtFechaVenta AS fechaVenta,
            strPais AS pais,
            strGrupoTerritorial AS grupoTerritorial,
            strCategoria AS categoria,
            strSubcategoria AS subcategoria,
            strProducto AS producto,
            intCantidad AS cantidad,
            sinTotalVenta AS totalVenta,
            strMoneda AS moneda,
            strEstadoValidacion AS estadoValidacion,
            strMensajeValidacion AS mensajeValidacion,
            dtFechaRegistro AS fechaRegistro
          FROM dbo.BI_CargaVentas_Staging
          WHERE intCargaID = @idCarga
          ORDER BY intFilaArchivo ASC
        `);

      return {
        carga: headerResult.recordset[0],
        filas: rowsResult.recordset
      };
    } catch (error) {
      console.error('Error obtaining carga detail:', error);
      throw error;
    }
  }

  async crearCargaArchivo(nombreArchivo, cantidadFilas, usuarioCarga) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('nombreArchivo', sql.NVarChar(260), nombreArchivo)
        .input('tipoArchivo', sql.NVarChar(20), 'CSV')
        .input('registrosRecibidos', sql.Int, cantidadFilas)
        .input('usuarioCarga', sql.NVarChar(150), usuarioCarga || 'bi_loader_api')
        .query(`
          INSERT INTO dbo.BI_CargaArchivo (
            strNombreArchivo,
            strTipoArchivo,
            intRegistrosRecibidos,
            intRegistrosValidos,
            intRegistrosError,
            strEstado,
            strUsuarioCarga
          )
          OUTPUT INSERTED.intID
          VALUES (
            @nombreArchivo,
            @tipoArchivo,
            @registrosRecibidos,
            0,
            0,
            'PENDIENTE',
            @usuarioCarga
          )
        `);
      return result.recordset[0].intID;
    } catch (error) {
      console.error('Error creating carga:', error);
      throw error;
    }
  }

  async insertarFilasStaging(idCarga, filas) {
    try {
      const pool = await getConnection();
      const request = pool.request();
      const columns = [
        'intCargaID',
        'intFilaArchivo',
        'dtFechaVenta',
        'strPais',
        'strGrupoTerritorial',
        'strCategoria',
        'strSubcategoria',
        'strProducto',
        'intCantidad',
        'sinTotalVenta',
        'strMoneda',
        'strEstadoValidacion',
        'strMensajeValidacion'
      ];

      const rowsSql = [];
      const today = new Date();

      filas.forEach((fila, index) => {
        const raw = Object.fromEntries(
          Object.entries(fila).map(([key, value]) => [normalizeKey(key), normalizeField(value)])
        );

        const fechaVenta = getFirstValue(raw, [
          'dtFechaVenta',
          'fechaVenta',
          'fecha',
          'fecha_venta',
          'date'
        ]);

        const cantidad = getFirstValue(raw, [
          'intCantidad',
          'cantidad',
          'qty',
          'quantity',
          'unidades'
        ]);

        const totalVenta = getFirstValue(raw, [
          'sinTotalVenta',
          'totalVenta',
          'total_venta',
          'total',
          'monto',
          'amount',
          'importe'
        ]);

        const pais = getFirstValue(raw, [
          'strPais',
          'pais',
          'country',
          'país'
        ]);

        const grupoTerritorial = getFirstValue(raw, [
          'strGrupoTerritorial',
          'grupoTerritorial',
          'grupo_territorial',
          'region',
          'territorio'
        ]);

        const categoria = getFirstValue(raw, [
          'strCategoria',
          'categoria',
          'category'
        ]);

        const subcategoria = getFirstValue(raw, [
          'strSubcategoria',
          'subcategoria',
          'sub_category',
          'subcategory'
        ]);

        const producto = getFirstValue(raw, [
          'strProducto',
          'producto',
          'product',
          'product_name',
          'nombre_producto'
        ]);

        const moneda = getFirstValue(raw, [
          'strMoneda',
          'moneda',
          'currency'
        ]) || 'USD';

        const fecha = parseDateValue(fechaVenta);
        const cantidadNum = cantidad !== null ? parseInt(cantidad, 10) : null;
        const totalNum = parseDecimal(totalVenta);

        const validaciones = [];
        let estadoValidacion = 'VALIDO';
        let mensajeValidacion = null;

        if (!fecha || Number.isNaN(fecha.getTime())) {
          validaciones.push('Fecha inválida');
        }
        if (cantidadNum === null || Number.isNaN(cantidadNum) || cantidadNum < 0) {
          validaciones.push('Cantidad inválida');
        }
        if (totalNum === null || Number.isNaN(totalNum) || totalNum < 0) {
          validaciones.push('Total de venta inválido');
        }
        if (!producto) {
          validaciones.push('Producto faltante');
        }
        if (!categoria) {
          validaciones.push('Categoría faltante');
        }

        if (validaciones.length > 0) {
          estadoValidacion = 'ERROR';
          mensajeValidacion = validaciones.join('; ');
        }

        rowsSql.push(`(@idCarga, @fila${index}, @fecha${index}, @pais${index}, @grupo${index}, @categoria${index}, @subcategoria${index}, @producto${index}, @cantidad${index}, @total${index}, @moneda${index}, @estadoVal${index}, @mensaje${index})`);

        request.input(`fila${index}`, sql.Int, index + 1);
        request.input(`fecha${index}`, sql.Date, fecha || null);
        request.input(`pais${index}`, sql.NVarChar(100), pais || null);
        request.input(`grupo${index}`, sql.NVarChar(100), grupoTerritorial || null);
        request.input(`categoria${index}`, sql.NVarChar(100), categoria || null);
        request.input(`subcategoria${index}`, sql.NVarChar(100), subcategoria || null);
        request.input(`producto${index}`, sql.NVarChar(200), producto || null);
        request.input(`cantidad${index}`, sql.Int, Number.isNaN(cantidadNum) ? null : cantidadNum);
        request.input(`total${index}`, sql.Decimal(18, 2), Number.isNaN(totalNum) ? null : totalNum);
        request.input(`moneda${index}`, sql.NVarChar(10), moneda || 'USD');
        request.input(`estadoVal${index}`, sql.NVarChar(20), estadoValidacion);
        request.input(`mensaje${index}`, sql.NVarChar(500), mensajeValidacion || null);
      });

      request.input('idCarga', sql.Int, idCarga);

      const sqlQuery = `INSERT INTO dbo.BI_CargaVentas_Staging (
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
      ) VALUES ${rowsSql.join(', ')}`;

      await request.query(sqlQuery);
      return filas.length;
    } catch (error) {
      console.error('Error inserting staging rows:', error);
      throw error;
    }
  }

  async procesarCarga(idCarga) {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();
      const request = transaction.request();
      request.input('idCarga', sql.Int, idCarga);

      const insertResult = await request.query(`
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
        WHERE intCargaID = @idCarga
          AND strEstadoValidacion = 'VALIDO'
      `);

      await request.query(`
        UPDATE dbo.BI_CargaArchivo
        SET
          intRegistrosValidos = ISNULL((SELECT COUNT(1) FROM dbo.BI_CargaVentas_Staging WHERE intCargaID = @idCarga AND strEstadoValidacion = 'VALIDO'), 0),
          intRegistrosError = ISNULL((SELECT COUNT(1) FROM dbo.BI_CargaVentas_Staging WHERE intCargaID = @idCarga AND strEstadoValidacion = 'ERROR'), 0),
          strEstado = CASE
            WHEN EXISTS(SELECT 1 FROM dbo.BI_CargaVentas_Staging WHERE intCargaID = @idCarga AND strEstadoValidacion = 'ERROR') THEN 'PROCESADA CON ERRORES'
            ELSE 'PROCESADA'
          END
        WHERE intID = @idCarga
      `);

      await transaction.commit();
      return {
        filasInsertadas: insertResult.rowsAffected[0]
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error processing carga:', error);
      throw error;
    }
  }

  async eliminarCarga(idCarga) {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();
      const request = transaction.request();
      request.input('idCarga', sql.Int, idCarga);

      await request.query(`
        DELETE FROM dbo.BI_VentasManual
        WHERE intCargaID = @idCarga;

        DELETE FROM dbo.BI_CargaVentas_Staging
        WHERE intCargaID = @idCarga;

        DELETE FROM dbo.BI_CargaArchivo
        WHERE intID = @idCarga;
      `);

      await transaction.commit();
      return {
        deleted: true
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting carga:', error);
      throw error;
    }
  }
}

module.exports = new CargaService();
