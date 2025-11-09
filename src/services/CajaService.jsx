const API_URL = "/api/caja";

const parse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Error de caja");
  return data;
};

export const getEstado = async (sucursalId) => {
  const url = sucursalId ? `${API_URL}?sucursal=${encodeURIComponent(sucursalId)}` : API_URL;
  const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
  return parse(res);
};

export const getHistorial = async ({ sucursalId, limit = 10 } = {}) => {
  const params = new URLSearchParams({ historial: '1', limit: String(limit) });
  if (sucursalId) params.set('sucursal', sucursalId);
  const res = await fetch(`${API_URL}?${params.toString()}`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
  return parse(res);
};

export const abrirCaja = async ({ sucursal_id, monto_inicial, observaciones }) => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sucursal_id, monto_inicial, observaciones })
  });
  return parse(res);
};

export const cerrarCaja = async ({ sesion_id, sucursal_id, monto_final, observaciones }) => {
  const payload = { monto_final };
  if (sesion_id) payload.sesion_id = sesion_id;
  if (sucursal_id) payload.sucursal_id = sucursal_id;
  if (observaciones) payload.observaciones = observaciones;
  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parse(res);
};
