// src/services/DashboardService.jsx

const API_URL = '/api/dashboard';

const DashboardService = {
  async getOverview(sucursal) {
    const qs = sucursal && sucursal !== 'Todas' ? `?sucursal=${encodeURIComponent(sucursal)}` : '';
    const res = await fetch(`${API_URL}${qs}`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = json?.error || json?.message || 'Error al obtener dashboard';
      return { success: false, message };
    }
    return { success: true, data: json };
  }
};

export default DashboardService;
