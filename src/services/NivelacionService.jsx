// src/services/NivelacionService.jsx

const API_URL = '/api/nivelacion';

const normalizeId = (optOrId) => {
  if (!optOrId) return null;
  if (typeof optOrId === 'object') return optOrId.value ?? null;
  return optOrId;
};

const NivelacionService = {
  async getNivelacion(sucursal, productoId) {
    try {
      const sucursalId = normalizeId(sucursal);
      const pid = normalizeId(productoId);
      const params = new URLSearchParams();
      if (sucursalId) params.set('sucursal', String(sucursalId));
      if (pid) params.set('productoId', String(pid));
      const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;
      const res = await fetch(url);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = json?.error || json?.message || 'Error al obtener nivelación';
        return { success: false, message, nivelacion: [] };
      }
      const nivelacion = Array.isArray(json?.nivelacion) ? json.nivelacion : [];
      return { success: true, nivelacion };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión', nivelacion: [] };
    }
  },

  async saveNivelacion({ sucursal, productoId, minimo, maximo }) {
    try {
      const body = {
        sucursal_id: normalizeId(sucursal),
        producto_id: normalizeId(productoId),
        minimo,
        maximo,
      };
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = json?.error || json?.message || 'Error al guardar nivelación';
        return { success: false, message };
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }
};

export default NivelacionService;
