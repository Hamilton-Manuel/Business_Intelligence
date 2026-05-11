const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const cargaService = require('../services/cargaService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/cargas - Listar todas las cargas
router.get('/', async (req, res) => {
  try {
    const cargas = await cargaService.obtenerCargas();
    res.json({
      success: true,
      data: cargas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/cargas/:id/detalle - Obtener detalle de una carga
router.get('/:id/detalle', async (req, res) => {
  try {
    const { id } = req.params;
    const detalle = await cargaService.obtenerDetalleCarga(parseInt(id, 10));
    
    if (!detalle.carga) {
      return res.status(404).json({
        success: false,
        error: 'Carga no encontrada'
      });
    }

    res.json({
      success: true,
      data: detalle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function removeBom(csvData) {
  if (csvData && csvData.charCodeAt(0) === 0xFEFF) {
    return csvData.slice(1);
  }
  return csvData;
}

function normalizeHeader(header) {
  return removeBom(String(header || ''))
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["]|[']/g, '')
    .replace(/\s+/g, '_');
}

function detectDelimiter(csvData) {
  const firstLine = removeBom(csvData)
    .split(/\r\n|\n|\r/)
    .find(line => line.trim().length > 0) || '';

  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;

  return semicolons > commas ? ';' : ',';
}

function normalizeWrappedCsvLines(csvData) {
  csvData = removeBom(csvData);
  const lines = csvData.split(/\r\n|\n|\r/);
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);

  const allWrapped = nonEmptyLines.length > 0 && nonEmptyLines.every(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('"') && trimmed.endsWith('"');
  });

  if (!allWrapped) {
    return csvData;
  }

  return lines.map(line => {
    const raw = line.trim();

    if (raw.startsWith('"') && raw.endsWith('"')) {
      return raw
        .slice(1, -1)
        .replace(/""/g, '"');
    }

    return line;
  }).join('\n');
}

function parseCsvWithFallback(csvData) {
  const delimiter = detectDelimiter(csvData);

  const defaultOptions = {
    delimiter,
    columns: header => header.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true
  };

  try {
    const parsed = parse(csvData, defaultOptions);

    const isSingleCombinedHeader = parsed.length > 0 &&
      Object.keys(parsed[0]).length === 1 &&
      Object.keys(parsed[0])[0].includes(',');

    if (!isSingleCombinedHeader) {
      return parsed;
    }

    const normalized = normalizeWrappedCsvLines(csvData);
    return parse(normalized, {
      ...defaultOptions,
      delimiter: detectDelimiter(normalized)
    });
  } catch (originalError) {
    const normalized = normalizeWrappedCsvLines(csvData);

    if (normalized === csvData) {
      throw originalError;
    }

    return parse(normalized, {
      ...defaultOptions,
      delimiter: detectDelimiter(normalized)
    });
  }
}

// POST /api/cargas/upload - Subir archivo CSV
router.post('/upload', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    let csvData = req.file.buffer.toString('utf8');
    const records = parseCsvWithFallback(csvData);

    if (!records.length) {
      return res.status(400).json({
        success: false,
        error: 'El archivo CSV no contiene filas válidas'
      });
    }

    const usuarioCarga = req.body.usuarioCarga || 'bi_loader_user';

    const idCarga = await cargaService.crearCargaArchivo(
      req.file.originalname,
      records.length,
      usuarioCarga
    );

    const filasInsertadas = await cargaService.insertarFilasStaging(idCarga, records);

    res.json({
      success: true,
      data: {
        idCarga,
        nombreArchivo: req.file.originalname,
        filasInsertadas
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/cargas/:id/procesar - Procesar una carga
router.post('/:id/procesar', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await cargaService.procesarCarga(parseInt(id, 10));
    
    res.json({
      success: true,
      message: `Carga ${id} procesada correctamente`,
      processedRows: resultado.filasInsertadas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/cargas/:id - Eliminar una carga y sus filas relacionadas
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await cargaService.eliminarCarga(parseInt(id, 10));

    if (!resultado.deleted) {
      return res.status(404).json({
        success: false,
        error: 'Carga no encontrada'
      });
    }

    res.json({
      success: true,
      message: `Carga ${id} eliminada correctamente`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
