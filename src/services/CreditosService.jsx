const API_URL = '/api/creditos';

export const createCredit = async (payload) => {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data && (data.error || data.message) ? (data.error || data.message) : 'Error al crear el crédito';
      return { success: false, message };
    }
    return { success: true, ...data };
  } catch (err) {
    console.error('createCredit error:', err);
    throw err;
  }
}

export const getCredits = async () => {
  try {
    const res = await fetch(API_URL, { method: 'GET', credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: data?.error || 'Error al obtener creditos' };
    return { success: true, ...data };
  } catch (err) {
    console.error('getCredits error:', err);
    return { success: false, message: err?.message || 'Error de conexión' };
  }
}

export const updateCredit = async (payload) => {
  try {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: data?.error || 'Error actualizando crédito' };
    return { success: true, ...data };
  } catch (e) {
    console.error('updateCredit error:', e);
    return { success: false, message: e?.message || 'Error de conexión' };
  }
}

export const payCredit = async (payload) => {
  try {
    const res = await fetch(API_URL + '/pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: data?.error || 'Error registrando pago' };
    return { success: true, ...data };
  } catch (e) {
    console.error('payCredit error:', e);
    return { success: false, message: e?.message || 'Error de conexión' };
  }
}

export default { createCredit, getCredits, updateCredit, payCredit };
