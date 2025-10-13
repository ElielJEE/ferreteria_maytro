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
    return json;
  },
  async getMovimientos(sucursal) {
    const res = await fetch(`${API_URL}?tab=Movimientos&sucursal=${encodeURIComponent(sucursal)}`);
    if (!res.ok) throw new Error('Error al obtener movimientos');
    return res.json();
  },
  async getAlertas(sucursal) {
    const res = await fetch(`${API_URL}?tab=Alertas&sucursal=${encodeURIComponent(sucursal)}`);
    if (!res.ok) throw new Error('Error al obtener alertas');
    return res.json();
  },
  async getDanados(sucursal) {
    const res = await fetch(`${API_URL}?tab=Dañados&sucursal=${encodeURIComponent(sucursal)}`);
    if (!res.ok) throw new Error('Error al obtener dañados');
    return res.json();
  },
  async getReservados(sucursal) {
    const res = await fetch(`${API_URL}?tab=Reservados&sucursal=${encodeURIComponent(sucursal)}`);
    if (!res.ok) throw new Error('Error al obtener reservados');
    return res.json();
  },
  async registrarMovimiento(data) {
    // If frontend sends ids instead of names, forward them as producto_id/sucursal_id
    const payload = { ...data };
    if (data.producto && typeof data.producto === 'object' && data.producto.value) {
      payload.producto_id = data.producto.value;
      payload.producto = undefined;
    }
    if (data.sucursal && typeof data.sucursal === 'object' && data.sucursal.value) {
      payload.sucursal_id = data.sucursal.value;
      payload.sucursal = undefined;
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = json && (json.error || json.message) ? (json.error || json.message) : 'Error al registrar movimiento';
      throw new Error(message);
    }
    return json;
  },
};

export default StockService;
