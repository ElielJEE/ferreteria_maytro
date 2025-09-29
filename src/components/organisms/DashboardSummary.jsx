// src/components/DashboardSummary.jsx
"use client";

import { useEffect, useState } from "react";

export default function DashboardSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Error en la respuesta");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError(e.message || "Error");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Cargando dashboard…</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No hay datos</div>;

  return (
    <div>
      <h2>Resumen</h2>
      <div>Total hoy: C{Number(data.totalRevenueToday ?? 0).toFixed(2)}</div>
      <div>Ventas hoy: {data.totalSalesToday ?? 0}</div>
      <div>Ingresos mes: C{Number(data.totalRevenueMonth ?? 0).toFixed(2)}</div>
      <div>Facturas (mes): {data.invoicesThisMonth ?? 0}</div>

      <h3>Stock bajo</h3>
      <ul>
        {(data.lowStockProducts || []).map((p) => (
          <li key={p.ID_PRODUCT ?? p.id}>
            {p.PRODUCT_NAME ?? p.NOMBRE} — {p.CANTIDAD ?? p.stock}
          </li>
        ))}
      </ul>

      <h3>Últimas ventas</h3>
      <ul>
        {(data.recentSales || []).map((s) => (
          <li key={s.ID_FACTURA ?? s.id}>
            {s.FECHA ?? s.fecha} — #{s.ID_FACTURA ?? s.id} — C
            {Number(s.TOTAL ?? s.total ?? 0).toFixed(2)} —{" "}
            {s.cliente ?? s.NOMBRE_CLIENTE ?? "Cliente general"}
          </li>
        ))}
      </ul>
    </div>
  );
}
