const API_URL = '/api/unidades';

export const getUnidades = async () => {
  try {
    const res = await fetch(API_URL, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error('Error al obtener unidades');
    return await res.json();
  } catch (err) {
    console.error('getUnidades error:', err);
    throw err;
  }
}

export const createUnidad = async (payload) => {
  try {
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.message || 'Error creando unidad');
    return data;
  } catch (err) {
    console.error('createUnidad error:', err);
    throw err;
  }
}

export const editUnidad = async (payload) => {
  try {
    const res = await fetch(API_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.message || 'Error actualizando unidad');
    return data;
  } catch (err) {
    console.error('editUnidad error:', err);
    throw err;
  }
}

export const deleteUnidad = async (payload) => {
  try {
    const res = await fetch(API_URL, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.message || 'Error eliminando unidad');
    return data;
  } catch (err) {
    console.error('deleteUnidad error:', err);
    throw err;
  }
}

export default {
  getUnidades,
  createUnidad,
  editUnidad,
  deleteUnidad
}
