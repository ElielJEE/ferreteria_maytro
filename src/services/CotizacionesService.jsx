// src/services/CotizacionesService.jsx

const API_URL = '/api/cotizaciones';

export const createQuote = async (payload) => {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error || data?.message || 'Error al crear cotización';
      return { success: false, message };
    }
  return { success: true, ...data, products: data?.products || [] };
  } catch (err) {
    console.error('createQuote error:', err);
    return { success: false, message: err.message };
  }
}

export const getQuotes = async () => {
  try {
    const res = await fetch(API_URL, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error || data?.message || 'Error al obtener cotizaciones';
      return { success: false, message, cotizaciones: [] };
    }
    return { success: true, ...(data || {}), cotizaciones: data?.cotizaciones || [] };
  } catch (err) {
    console.error('getQuotes error:', err);
    return { success: false, message: err.message, cotizaciones: [] };
  }
}

export const getQuoteDetail = async (id) => {
  if (!id) return { success: false, message: 'ID requerido' };
  try {
    const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error || data?.message || 'Error al obtener detalle';
      return { success: false, message };
    }
    return { success: true, cotizacion: data?.cotizacion };
  } catch (err) {
    console.error('getQuoteDetail error:', err);
    return { success: false, message: err.message };
  }
}

export const updateQuote = async (payload) => {
  const id = payload?.id || payload?.cotizacion_id;
  try {
    const url = id ? `${API_URL}?id=${encodeURIComponent(id)}` : API_URL;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error || data?.message || 'Error al actualizar cotización';
      return { success: false, message };
    }
    return { success: true, ...data };
  } catch (err) {
    console.error('updateQuote error:', err);
    return { success: false, message: err.message };
  }
}

export const cancelQuote = async (id) => {
  if (!id) return { success: false, message: 'ID requerido' };
  try {
    const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error || data?.message || 'Error al cancelar cotización';
      return { success: false, message };
    }
    return { success: true, ...data };
  } catch (err) {
    console.error('cancelQuote error:', err);
    return { success: false, message: err.message };
  }
}

export const processQuote = async (id) => {
  if (!id) return { success: false, message: 'ID requerido' };
  try {
    const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}&action=procesar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error || data?.message || 'Error al procesar cotización';
      return { success: false, message };
    }
    return { success: true, facturaId: data?.facturaId };
  } catch (err) {
    console.error('processQuote error:', err);
    return { success: false, message: err.message };
  }
}

export default {
  createQuote,
  getQuotes,
  getQuoteDetail,
  updateQuote,
  cancelQuote,
  processQuote,
};
