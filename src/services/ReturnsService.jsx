const API_URL = '/api/devoluciones';

export const getReturns = async () => {
  const res = await fetch(API_URL, { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || 'Error al obtener devoluciones');
  return data;
};

export const getReturnById = async (id) => {
  const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || 'Error al obtener devolución');
  return data;
};

export const createReturn = async (payload) => {
  const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || 'Error al crear devolución');
  return data;
};

export const updateReturn = async (id, payload) => {
  const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || 'Error al actualizar devolución');
  return data;
};

export const deleteReturn = async (id) => {
  const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || 'Error al eliminar devolución');
  return data;
};

export default { getReturns, getReturnById, createReturn, updateReturn, deleteReturn };
