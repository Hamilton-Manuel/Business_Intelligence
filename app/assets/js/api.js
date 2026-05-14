/**
 * API Client para bi-loader-api
 * Consume los endpoints del backend
 */

const API_BASE_URL = window.API_URL || 'https://bi-loader-api.redcoast-1960ce03.southcentralus.azurecontainerapps.io/api';

class BiLoaderAPIClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Métodos de Cargas
  async obtenerCargas() {
    return this.request('/cargas');
  }

  async obtenerDetalleCarga(idCarga) {
    return this.request(`/cargas/${idCarga}/detalle`);
  }

  async subirArchivo(archivo) {
    const formData = new FormData();
    formData.append('archivo', archivo);

    const url = `${this.baseUrl}/cargas/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async procesarCarga(idCarga) {
    return this.request(`/cargas/${idCarga}/procesar`, {
      method: 'POST'
    });
  }

  async eliminarCarga(idCarga) {
    return this.request(`/cargas/${idCarga}`, {
      method: 'DELETE'
    });
  }

  // Health Check
  async verificarSalud() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Exportar para usar en otros scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BiLoaderAPIClient;
}

// O usar globalmente
window.BiLoaderAPIClient = BiLoaderAPIClient;
