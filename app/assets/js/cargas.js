/**
 * Ejemplo de uso del cliente API
 * Incluir en index.html después de api.js
 */

// Inicializar cliente
const apiClient = new BiLoaderAPIClient();

// Elementos del DOM
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const cargasTable = document.getElementById('cargasTable');
const statusDiv = document.getElementById('status');

/**
 * Mostrar mensaje de estado
 */
function mostrarEstado(mensaje, tipo = 'info') {
  if (statusDiv) {
    statusDiv.innerHTML = `<div class="alert alert-${tipo}">${mensaje}</div>`;
    setTimeout(() => {
      statusDiv.innerHTML = '';
    }, 5000);
  }
}

/**
 * Cargar lista de cargas
 */
async function cargarListaCargas() {
  try {
    const resultado = await apiClient.obtenerCargas();
    
    if (!resultado.success) {
      mostrarEstado('Error al cargar lista de cargas', 'error');
      return;
    }

    const cargas = resultado.data;
    console.log('Cargas recibidas del API:', cargas);

    if (!Array.isArray(cargas)) {
      mostrarEstado('Error: respuesta inválida de cargas', 'error');
      return;
    }

    if (cargasTable) {
      const normalizeDate = fecha => {
        const parsed = new Date(fecha);
        return isNaN(parsed.getTime()) ? 'Invalid Date' : parsed.toLocaleString();
      };

      const html = cargas.map(carga => {
        const idCarga = carga.idCarga;
        const fechaCarga = carga.fechaCarga;
        const estado = carga.estado;

        return `
        <tr>
          <td>${idCarga ?? 'N/A'}</td>
          <td>${carga.nombreArchivo ?? 'N/A'}</td>
          <td>${carga.registrosRecibidos ?? 'N/A'}</td>
          <td>${normalizeDate(fechaCarga)}</td>
          <td><span class="badge">${estado ?? 'N/A'}</span></td>
          <td>
            <button onclick="verDetalle(${idCarga})" class="btn btn-sm">Ver</button>
            ${ estado === 'PENDIENTE' ? `
              <button onclick="procesarCarga(${idCarga})" class="btn btn-sm btn-success">Procesar</button>
            ` : ''}
            <button onclick="eliminarCarga(${idCarga})" class="btn btn-sm btn-danger">Eliminar</button>
          </td>
        </tr>
      `;
      }).join('');
      
      cargasTable.innerHTML = html;
    }
  } catch (error) {
    mostrarEstado(`Error: ${error.message}`, 'error');
  }
}

/**
 * Subir archivo CSV
 */
async function subirArchivo() {
  if (!fileInput || !fileInput.files.length) {
    mostrarEstado('Selecciona un archivo', 'warning');
    return;
  }

  const archivo = fileInput.files[0];
  
  if (!archivo.name.endsWith('.csv')) {
    mostrarEstado('Solo se permiten archivos CSV', 'error');
    return;
  }

  try {
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Subiendo...';
    
    mostrarEstado('Subiendo archivo...', 'info');
    const resultado = await apiClient.subirArchivo(archivo);
    
    if (resultado.success) {
      mostrarEstado(
        `Archivo subido: ${resultado.data.filasInsertadas} filas (ID: ${resultado.data.idCarga})`,
        'success'
      );
      fileInput.value = '';
      cargarListaCargas();
    } else {
      mostrarEstado(`Error: ${resultado.error}`, 'error');
    }
  } catch (error) {
    mostrarEstado(`Error: ${error.message}`, 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Subir CSV';
  }
}

/**
 * Ver detalle de una carga
 */
async function verDetalle(idCarga) {
  if (idCarga === undefined || idCarga === null) {
    mostrarEstado('Error: id de carga inválido', 'error');
    return;
  }

  try {
    const resultado = await apiClient.obtenerDetalleCarga(idCarga);
    
    if (resultado.success) {
      const { carga, filas } = resultado.data;
      alert(`
Carga ID: ${carga.idCarga}
Archivo: ${carga.nombreArchivo}
Filas: ${carga.registrosRecibidos}
Estado: ${carga.estado}
Fecha: ${new Date(carga.fechaCarga).toLocaleString()}

Primeras 5 filas:
${filas.slice(0, 5).map(f =>
  `- Fila ${f.filaArchivo ?? 'N/A'} | ${f.categoria || 'N/A'} / ${f.subcategoria || 'N/A'} / ${f.producto || 'N/A'} / ${f.cantidad ?? 'N/A'} unidades / $${f.totalVenta ?? 0} | Estado: ${f.estadoValidacion || 'N/A'}${f.mensajeValidacion ? ` | Msg: ${f.mensajeValidacion}` : ''}`
).join('\n')}
      `);
    }
  } catch (error) {
    mostrarEstado(`Error: ${error.message}`, 'error');
  }
}

/**
 * Procesar una carga
 */
async function procesarCarga(idCarga) {
  if (!confirm('¿Procesar esta carga?')) return;

  try {
    mostrarEstado('Procesando...', 'info');
    const resultado = await apiClient.procesarCarga(idCarga);
    
    if (resultado.success) {
      mostrarEstado(resultado.message, 'success');
      cargarListaCargas();
    } else {
      mostrarEstado(`Error: ${resultado.error}`, 'error');
    }
  } catch (error) {
    mostrarEstado(`Error: ${error.message}`, 'error');
  }
}

async function eliminarCarga(idCarga) {
  if (!confirm('¿Eliminar esta carga y sus datos relacionados?')) return;

  try {
    mostrarEstado('Eliminando carga...', 'info');
    const resultado = await apiClient.eliminarCarga(idCarga);

    if (resultado.success) {
      mostrarEstado(resultado.message, 'success');
      cargarListaCargas();
    } else {
      mostrarEstado(`Error: ${resultado.error}`, 'error');
    }
  } catch (error) {
    mostrarEstado(`Error: ${error.message}`, 'error');
  }
}

/**
 * Verificar salud del API al cargar
 */
async function verificarConexion() {
  try {
    const esSalud = await apiClient.verificarSalud();
    if (esSalud) {
      mostrarEstado('✅ Conectado al backend', 'success');
      cargarListaCargas();
    } else {
      mostrarEstado('⚠️ Backend no disponible', 'warning');
    }
  } catch (error) {
    console.error('Error verificando conexión:', error);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  verificarConexion();
  
  if (uploadBtn) {
    uploadBtn.addEventListener('click', subirArchivo);
  }
});
