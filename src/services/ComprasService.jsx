const API_URL = "/api/compras";

export const createCompra = async (compra) => {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compra),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || data?.message || res.statusText || 'Error creating compra');
    }

    return data;
  } catch (error) {
    console.error('createCompra error:', error);
    throw error;
  }
}

export const listCompras = async () => {
  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error('Error fetching compras');
    return await res.json();
  } catch (error) {
    console.error('listCompras error:', error);
    throw error;
  }
}
export const getCompra = async (id) => {
  try {
    const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'GET' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Error fetching compra');
    return data;
  } catch (error) {
    console.error('getCompra error:', error);
    throw error;
  }
};

export const deleteDetalle = async (detalleId) => {
  try {
    const res = await fetch(`${API_URL}?detalleId=${encodeURIComponent(detalleId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Error deleting detalle');
    return data;
  } catch (error) {
    console.error('deleteDetalle error:', error);
    throw error;
  }
};
