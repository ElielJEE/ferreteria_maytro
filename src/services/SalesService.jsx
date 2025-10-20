// src/services/SalesService.jsx

const API_URL = '/api/ventas';

export async function createSale(payload) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Error al procesar la venta');
    }
    return data;
  } catch (err) {
    console.error('createSale error:', err);
    throw err;
  }
}

export default { createSale };
