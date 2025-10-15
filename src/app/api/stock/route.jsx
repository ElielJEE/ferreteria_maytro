import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import StockService from '@/server/services/StockService';

export async function GET(req) {
  try {
    const tab = req.nextUrl.searchParams.get('tab');
    const sucursal = req.nextUrl.searchParams.get('sucursal');

    // Si solicitan la pestaña Movimientos, devolver historial estructurado
    if (tab === 'Movimientos') {
      // Delegar a servicio central
      const rows = await StockService.getMovimientos({ sucursal });

      // Mapear al formato que usa el componente Movements
      const mapTipo = (t) => {
        if (!t) return '';
        const v = t.toString().toLowerCase();
        if (v === 'danado' || v === 'dañado') return 'Dañado';
        if (v === 'reservado' || v === 'reserva') return 'Reserva';
        if (v === 'entrada') return 'Entrada';
        if (v === 'salida') return 'Salida';
        if (v === 'transferencia') return 'Transferencia';
        if (v === 'ajuste' || v === 'ajuste_danado') return 'Ajuste';
        // Fallback: capitalize words
        return (t || '').toString().replace(/_/g, ' ').replace(/(^|\s)\S/g, s => s.toUpperCase());
      };

      const mapped = (rows || []).map(r => ({
        id: r.id,
        fecha: r.fecha,
        hora: r.hora,
        tipo: mapTipo(r.tipo),
        sucursal: r.sucursal || 'Sin Sucursal',
        producto: { nombre: r.producto_nombre || 'Sin nombre', codigo: r.producto_codigo || '' },
        cantidad: Number(r.cantidad || 0),
        stock_anterior: r.stock_anterior == null ? null : Number(r.stock_anterior),
        stock_nuevo: r.stock_nuevo == null ? null : Number(r.stock_nuevo),
        motivo: r.motivo || '',
        usuario: r.usuario || '',
        referencia: r.referencia || null
      }));

      return Response.json({ movimientos: mapped });
    }

    // Si solicitan el resumen, ejecutar la consulta de stock por producto x sucursal
    if (tab === 'Resumen' || !tab) {
      const rows = await StockService.getResumen({ sucursal });
      return Response.json({ resumen: rows });
    }
    if (tab === 'Alertas') {
      // Ejemplo: productos críticos o agotados
      const [rows] = await pool.query(
        `SELECT p.ID_PRODUCT, p.PRODUCT_NAME, st.CANTIDAD, s.NOMBRE_SUCURSAL
         FROM STOCK_SUCURSAL st
         JOIN PRODUCTOS p ON p.ID_PRODUCT = st.ID_PRODUCT
         JOIN SUCURSAL s ON s.ID_SUCURSAL = st.ID_SUCURSAL
         WHERE st.CANTIDAD <= 5`
      );
      return Response.json({ alertas: rows });
    }
    if (tab === 'Dañados') {
      const { rows, summary } = await StockService.getDanados({ sucursal });
      const mapped = (rows || []).map(r => ({
        id: r.id,
        codigo: r.codigo || '',
        producto: r.producto || '',
        sucursal: r.sucursal || 'Sin Sucursal',
        cantidad: Number(r.cantidad || 0),
        tipo_dano: r.tipo_dano || '',
        fecha: r.fecha || null,
        reportado_por: r.reportado_por || '',
        perdida: r.perdida == null ? 0 : Number(r.perdida),
        estado: r.estado || '',
        descripcion: r.descripcion || ''
      }));
      return Response.json({ danados: mapped, resumen: summary });
    }
    if (tab === 'Reservados') {
      const rows = await StockService.getReservados({ sucursal });
      const mapped = (rows || []).map(r => ({
        id: r.id,
        codigo: r.codigo || '',
        producto: r.producto || '',
        sucursal: r.sucursal || 'Sin Sucursal',
        cantidad: Number(r.cantidad || 0),
        telefono: r.telefono || '',
        cliente: { nombre: r.cliente_nombre || '', id: r.cliente_id || '' },
        fecha_reserva: r.fecha_reserva || null,
        fecha_entrega: r.fecha_entrega || null,
        estado: r.estado || 'pendiente',
        reservado_por: r.reservado_por || '',
        notas: r.notas || ''
      }));
      return Response.json({ reservados: mapped });
    }
    return Response.json({ error: 'Parámetro tab inválido' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
  const { tipo, producto, sucursal, producto_id, sucursal_id, cantidad, motivo, referencia, descripcion, tipo_dano, estado_dano } = body;

  // Normalizar el tipo recibido desde la UI a los valores que se almacenan en la BD
  const storedTipo = (() => {
    const t = (tipo || '').toString().toLowerCase();
    if (!t) return null;
    // Normalizar a los valores exactos del ENUM definido en la BD
    if (/entrada/.test(t)) return 'entrada';
    if (/salid/.test(t)) return 'salida';
    // detectar variantes de "dañado"/"danado"/"marcar como dañado"
    if (/(da[nñ]ad|da[nñ]ado|dañado|danado|dañad|marcar como dañ|marcar como danad|marcar como danado)/.test(t)) return 'danado';
    if (/reserv/.test(t)) return 'reservado';
    if (/transfer/.test(t)) return 'transferencia';
    // Si no coincide con ninguno, devolver null para forzar fallback controlado
    return null;
  })();

  // Helper: obtiene valores permitidos por el ENUM tipo_movimiento desde la BD
  const getAllowedTipoMovimiento = async (conn) => {
    try {
      const [rows] = await conn.query(`
        SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MOVIMIENTOS_INVENTARIO' AND COLUMN_NAME = 'tipo_movimiento'
      `);
      const ct = rows && rows[0] && rows[0].COLUMN_TYPE ? String(rows[0].COLUMN_TYPE) : '';
      // ct tiene la forma: "enum('entrada','salida',...)"
      const matches = ct.match(/'([^']+)'/g);
      if (!matches) return [];
      return matches.map(m => m.replace(/'/g, ''));
    } catch (e) {
      console.warn('No se pudo obtener ENUM tipo_movimiento:', e.message);
      return [];
    }
  };

  // Helper: dado un conjunto de valores permitidos y un valor solicitado,
  // intenta devolver el valor solicitado si está permitido; si no, aplica
  // heurísticas (p.ej. mapear 'danado' -> 'ajuste_danado' si existe) o devuelve null.
  const chooseClosestAllowed = (allowed, requested) => {
    if (!allowed || !allowed.length) return null;
    if (!requested) return null;
    if (allowed.includes(requested)) return requested;
    // si pedimos 'reservado' y no existe, quizá 'reserva' no está en enum; fallback null
    // como último recurso, devolver el primer valor permitido (pero llamador puede elegir fallback más específico)
    return null;
  };

  // Obtener usuario desde token o payload (fallback a 1)
  let usuario_id = body.usuario_id ?? 1;
  try {
    const token = req.cookies?.get?.('token')?.value ?? null;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      usuario_id = decoded.id ?? decoded.sub ?? decoded.userId ?? decoded.user_id ?? usuario_id;
    }
  } catch (err) {
    // ignore, usar usuario_id del body o fallback
    usuario_id = body.usuario_id ?? usuario_id;
  }

    if (tipo === 'Entrada (Aumentar Stock)') {
      try {
        const result = await StockService.entrada({
          usuario_id,
          producto: body.producto,
          producto_id: body.producto_id,
          sucursal: body.sucursal,
          sucursal_id: body.sucursal_id,
          cantidad: body.cantidad,
          motivo: body.motivo,
          referencia: body.referencia,
          descripcion: body.descripcion
        });
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    if (tipo === 'Salida (Reducir Stock)') {
      try {
        const result = await StockService.salida({
          usuario_id,
          producto: body.producto,
          producto_id: body.producto_id,
          sucursal: body.sucursal,
          sucursal_id: body.sucursal_id,
          cantidad: body.cantidad,
          motivo: body.motivo,
          referencia: body.referencia,
          descripcion: body.descripcion
        });
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Marcar como Reservado: delegar a servicio central
    if (tipo === 'Marcar como Reservado' || storedTipo === 'reservado') {
      try {
        const result = await StockService.reservar({
          usuario_id,
          producto: body.producto,
          producto_id: body.producto_id,
          sucursal: body.sucursal,
          sucursal_id: body.sucursal_id,
          cantidad: body.cantidad,
          cliente: body.cliente,
          telefono: body.telefono,
          fecha_entrega: body.fecha_entrega,
          notas: body.notas || body.descripcion || body.motivo || ''
        });
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Otros tipos de movimiento (puedes agregar lógica similar para Salida, etc.)
    if (tipo === 'Marcar como Dañado') {
      try {
        const result = await StockService.marcarDanado({
          usuario_id,
          producto: body.producto,
          producto_id: body.producto_id,
          sucursal: body.sucursal,
          sucursal_id: body.sucursal_id,
          cantidad: body.cantidad,
          descripcion: body.descripcion,
          motivo: body.motivo,
          tipo_dano: body.tipo_dano ?? body.tipoDano ?? body.tipoDanoLabel,
          estado_dano: body.estado ?? body.estado_dano ?? body.estadoDano,
          referencia: body.referencia
        });
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    return Response.json({ ok: false, message: 'Tipo de movimiento no implementado' });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
