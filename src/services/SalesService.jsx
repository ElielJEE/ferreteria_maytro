// src/services/SalesService.jsx

const API_URL = '/api/ventas';

export const createSale = async (payload) => {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data && (data.error || data.message) ? (data.error || data.message) : 'Error al procesar la venta';
      return { success: false, message, sale: null };
    }
    return data;
  } catch (err) {
    console.error('createSale error:', err);
    throw err;
  }
}

export const getSalesHistory = async (sucursalId) => {
  try {
    const url = sucursalId ? `${API_URL}?sucursal=${encodeURIComponent(sucursalId)}` : API_URL;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data && (data.error || data.message) ? (data.error || data.message) : 'Error al obtener el historial de ventas';
      return { success: false, message, ventas: [] };
    }
    return data;
  } catch (err) {
    console.error('getSalesHistory error:', err);
    throw err;
  }
}

export const getSaleDetail = async (id) => {
  if (!id) return null;
  try {
    const res = await fetch(`${API_URL}?id=${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data && (data.error || data.message) ? (data.error || data.message) : 'Error al obtener detalle de la venta';
      return { success: false, message, factura: null };
    }
    return { success: true, factura: data.factura || null };
  } catch (err) {
    console.error('getSaleDetail error:', err);
    return { success: false, message: err.message, factura: null };
  }
};
