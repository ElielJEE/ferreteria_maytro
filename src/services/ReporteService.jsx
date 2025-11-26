const API_URL = "/api/reportes";

// services/reportService.js
export async function getTodayReport(sucursal = "Todas") {
  try {
    const query = new URLSearchParams({ sucursal }).toString();
    const res = await fetch(`${API_URL}/hoy?${query}`);
    if (!res.ok) throw new Error("Error al obtener reporte");
    return await res.json();
  } catch (err) {
    console.error(err);
    return { error: err.message };
  }
}

export async function getMonthReport(sucursal = "Todas") {
  try {
    const query = new URLSearchParams({ sucursal }).toString();
    const res = await fetch(`${API_URL}/mes?${query}`);
    if (!res.ok) throw new Error("Error al obtener reporte");
    return await res.json();
  } catch (err) {
    console.error(err);
    return { error: err.message };
  }
}

export async function getYearReport(sucursal = "Todas") {
  try {
    const query = new URLSearchParams({ sucursal }).toString();
    const res = await fetch(`${API_URL}/anual?${query}`);
    if (!res.ok) throw new Error("Error al obtener reporte");
    return await res.json();
  } catch (err) {
    console.error(err);
    return { error: err.message };
  }
}
