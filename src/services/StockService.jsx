// src/services/StockService.jsx

const API_URL = '/api/stock';

const StockService = {
  async getResumen(sucursal) {
    let url = `${API_URL}?tab=Resumen`;
    if (sucursal && sucursal !== 'Todas') url += `&sucursal=${encodeURIComponent(sucursal)}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = json && (json.error || json.message) ? (json.error || json.message) : 'Error al obtener resumen de stock';
      throw new Error(message);
    }
    // Normalizar: la API puede devolver { resumen: [...] } o directamente un array
    if (Array.isArray(json)) {
      return { resumen: json };
    }
    if (json && Array.isArray(json.resumen)) {
      return json;
    }
    // Fallback seguro
    return { resumen: [] };
  },
  async getMovimientos(sucursal) {
    try {
      const res = await fetch(`${API_URL}?tab=Movimientos&sucursal=${encodeURIComponent(sucursal)}`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message = json?.error || json?.message || 'No se pudieron obtener los movimientos';
        return { success: false, message, movimientos: [] };
      }

      // Normaliza la respuesta: puede ser un array directo o dentro de json.movimientos
      if (Array.isArray(json)) return { success: true, movimientos: json };
      if (json && Array.isArray(json.movimientos)) return { success: true, movimientos: json.movimientos };

      return { success: true, movimientos: [] }; // fallback seguro
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión', movimientos: [] };
    }
  },

  async getAlertas(sucursal) {
    try {
      const res = await fetch(`${API_URL}?tab=Alertas&sucursal=${encodeURIComponent(sucursal)}`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message = json?.error || json?.message || 'No se pudieron obtener las alertas';
        return { success: false, message, alertas: [] };
      }

      if (Array.isArray(json)) return { success: true, alertas: json };
      if (json && Array.isArray(json.alertas)) return { success: true, alertas: json.alertas };

      return { success: true, alertas: [] };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión', alertas: [] };
    }
  },

  async getDanados(sucursal) {
    try {
      const res = await fetch(`${API_URL}?tab=Dañados&sucursal=${encodeURIComponent(sucursal)}`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message = json?.error || json?.message || 'No se pudieron obtener los productos dañados';
        return { success: false, message, danados: [] };
      }

      if (Array.isArray(json)) return { success: true, danados: json };
      if (json && Array.isArray(json.danados)) return { success: true, danados: json.danados };

      return { success: true, danados: [] };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión', danados: [] };
    }
  },

  async getReservados(sucursal) {
    try {
      const res = await fetch(`${API_URL}?tab=Reservados&sucursal=${encodeURIComponent(sucursal)}`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message = json?.error || json?.message || 'No se pudieron obtener los productos reservados';
        return { success: false, message, reservados: [] };
      }

      if (Array.isArray(json)) return { success: true, reservados: json };
      if (json && Array.isArray(json.reservados)) return { success: true, reservados: json.reservados };

      return { success: true, reservados: [] };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión', reservados: [] };
    }
  },

  async registrarMovimiento(data) {
    const payload = { ...data };

    if (data.producto?.value) {
      payload.producto_id = data.producto.value;
      delete payload.producto;
    }
    if (data.sucursal?.value) {
      payload.sucursal_id = data.sucursal.value;
      delete payload.sucursal;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message = json?.error || json?.message || 'Error al registrar movimiento';
        return { success: false, message };
      }

      return { success: true, data: json };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }
};

export default StockService;
