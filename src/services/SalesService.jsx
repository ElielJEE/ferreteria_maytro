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

export const updateSale = async (payload) => {
  try {
    const id = payload?.id || payload?.codigo || payload?.facturaId || '';
    const url = id ? `${API_URL}?id=${encodeURIComponent(id)}` : API_URL;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data && (data.error || data.message) ? (data.error || data.message) : 'Error al actualizar la venta';
      console.log(message);
      return { success: false, message };
    }
    return { success: true, ...data };
  } catch (err) {
    console.error('updateSale error:', err);
    throw err;
  }
}

export const deleteSale = async (id) => {
  try {
    if (!id) return { success: false, message: 'ID de venta requerido' };
    const url = `${API_URL}?id=${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data && (data.error || data.message) ? (data.error || data.message) : 'Error al eliminar la venta';
      return { success: false, message };
    }
    return { success: true, ...data };
  } catch (err) {
    console.error('deleteSale error:', err);
    throw err;
  }
}
