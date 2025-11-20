import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getUserSucursalContext } from '@/lib/auth/getUserSucursal';

async function ensureEntregadoColumn() {
  // Ensure detalles_compra.ENTREGADO exists (idempotent)
  try {
    const [cols] = await pool.query("SELECT COUNT(1) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalles_compra' AND COLUMN_NAME = 'ENTREGADO'");
    if (cols && cols.length > 0 && Number(cols[0].cnt || 0) === 0) {
      await pool.query("ALTER TABLE detalles_compra ADD COLUMN ENTREGADO TINYINT(1) NOT NULL DEFAULT 0");
    }
  } catch (e) {
    // If alter fails, log and continue; callers should handle missing column gracefully.
    console.warn('Could not ensure ENTREGADO column on detalles_compra', e?.message || e);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      proveedorId,
      usuarioId,
      id_sucursal,
      fecha_pedido,
      fecha_entrega,
      total,
      items
    } = body;

    // Validar fecha_entrega obligatoria (formato YYYY-MM-DD)
    if (!fecha_entrega || typeof fecha_entrega !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_entrega)) {
      return Response.json({ error: 'fecha_entrega requerida (YYYY-MM-DD)' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'items requeridos' }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Logear el body para depuración (será visible en la consola del server)
      try { console.debug('POST /api/compras body:', body); } catch(e) {}

      // Resolver o crear proveedor si es necesario
      let proveedorIdResolved = proveedorId || null;
      if (!proveedorIdResolved) {
        const provNombre = body.proveedorNombre || (body.proveedor && body.proveedor.nombre) || null;
        const provTelefono = body.proveedorTelefono || (body.proveedor && body.proveedor.telefono) || null;
        const provEmpresa = body.proveedorEmpresa || (body.proveedor && body.proveedor.empresa) || null;
        if (provNombre) {
          // Buscar proveedor por nombre (case-insensitive)
          const [existing] = await conn.query(
            'SELECT ID_PROVEEDOR, TELEFONO_PROVEEDOR, EMPRESA_PROVEEDOR FROM PROVEEDOR WHERE LOWER(NOMBRE_PROVEEDOR) = LOWER(?) LIMIT 1',
            [provNombre]
          );
          if (existing && existing.length > 0) {
            proveedorIdResolved = existing[0].ID_PROVEEDOR;

            const updates = [];
            const params = [];
            const currentTelefono = existing[0].TELEFONO_PROVEEDOR || '';
            const currentEmpresa = existing[0].EMPRESA_PROVEEDOR || '';

            if (provTelefono && !currentTelefono.trim()) {
              updates.push('TELEFONO_PROVEEDOR = ?');
              params.push(provTelefono);
            }
            if (provEmpresa && !currentEmpresa.trim()) {
              updates.push('EMPRESA_PROVEEDOR = ?');
              params.push(provEmpresa);
            }
            if (updates.length > 0) {
              await conn.query(`UPDATE PROVEEDOR SET ${updates.join(', ')} WHERE ID_PROVEEDOR = ?`, [...params, proveedorIdResolved]);
            }
          } else {
            const [insProv] = await conn.query(
              'INSERT INTO PROVEEDOR (NOMBRE_PROVEEDOR, TELEFONO_PROVEEDOR, EMPRESA_PROVEEDOR) VALUES (?, ?, ?)',
              [provNombre, provTelefono || null, provEmpresa || null]
            );
            proveedorIdResolved = insProv.insertId;
          }
        }
      }

      // Resolver usuarioId e id_sucursal si no vienen en el body
      let usuarioIdResolved = typeof usuarioId !== 'undefined' ? usuarioId : null;
      let idSucursalResolved = typeof id_sucursal !== 'undefined' ? id_sucursal : null;

      // Si no se recibió usuarioId en el body, intentar extraerlo desde el token en las cookies
      if (!usuarioIdResolved) {
        try {
          const cookieHeader = request.headers.get('cookie') || '';
          const tokenPair = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
          if (tokenPair) {
            const token = tokenPair.split('=')[1];
            if (token) {
              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              usuarioIdResolved = decoded?.id ?? decoded?.ID ?? null;
            }
          }
        } catch (e) {
          // no fatal: si no se puede decodificar, dejamos usuarioIdResolved en null
          console.warn('No se pudo extraer usuario del token en compras POST', e?.message || e);
        }
      }

      // Si aún no tenemos id_sucursal, intentar obtenerlo desde la tabla usuarios
      if (!idSucursalResolved && usuarioIdResolved) {
        try {
          const [urows] = await conn.query('SELECT ID_SUCURSAL FROM USUARIOS WHERE ID = ? LIMIT 1', [usuarioIdResolved]);
          if (urows && urows.length > 0) idSucursalResolved = urows[0].ID_SUCURSAL || null;
        } catch (e) {
          console.warn('No se pudo obtener ID_SUCURSAL desde USUARIOS', e?.message || e);
        }
      }

      // Insertar compra
      const [res] = await conn.query(
        'INSERT INTO COMPRAS (FECHA_PEDIDO, FECHA_ENTREGA, TOTAL, ID_PROVEEDOR, ID_USUARIO, ID_SUCURSAL, ESTADO) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [fecha_pedido || new Date(), fecha_entrega, Number(total) || 0, proveedorIdResolved || null, usuarioIdResolved || null, idSucursalResolved || null, 'Pendiente']
      );
      const compraId = res.insertId;

      // Insertar detalles (no actualizar stock por sucursal al crear la compra)
      for (const it of items) {
        const productId = it.ID_PRODUCT || it.id || it.productId;
          const cantidad = Number(it.quantity ?? it.AMOUNT ?? it.cantidad) || 0;

          // Obtener PRECIO_COMPRA desde la tabla PRODUCTOS y usarlo siempre
          const [prodPriceRows] = await conn.query('SELECT PRECIO_COMPRA FROM PRODUCTOS WHERE ID_PRODUCT = ? LIMIT 1', [productId]);
          if (!prodPriceRows || prodPriceRows.length === 0) {
            throw new Error(`Producto no encontrado: ${productId}`);
          }
          const precioDb = Number(prodPriceRows[0].PRECIO_COMPRA) || 0;
          if (precioDb <= 0) {
            throw new Error(`PRECIO_COMPRA no definido para el producto ${productId}. Configure el precio de compra en el producto antes de procesar la compra.`);
          }

          const precioUnit = precioDb;
          const subTotal = Number((precioUnit * cantidad).toFixed(2));

        // Insertar detalle usando la columna CANTIDAD y sin NUMERO_REFERENCIA/TIPO_PAGO
        const [detRes] = await conn.query(
          'INSERT INTO DETALLES_COMPRA (ID_COMPRA, ID_PRODUCT, CANTIDAD, PRECIO_UNIT, SUB_TOTAL, ID_PROVEEDOR) VALUES (?, ?, ?, ?, ?, ?) ',
          [compraId, productId, cantidad, precioUnit, subTotal, proveedorIdResolved || null]
        );

        // NOTE: No actualizar PRODUCTOS.CANTIDAD aquí. Las compras no deben modificar el stock global.
        // Nos aseguramos de que el producto exista (ya validado arriba al obtener PRECIO_COMPRA).

        // No registrar movimientos de inventario al crear compras (solicitado)
      }

      await conn.commit();
      // Traer la compra creada para devolverla en la respuesta y facilitar depuración
      try {
        const [createdRows] = await conn.query('SELECT ID_COMPRA, FECHA_PEDIDO, FECHA_ENTREGA, TOTAL, ID_PROVEEDOR, ID_USUARIO, ID_SUCURSAL, ESTADO FROM COMPRAS WHERE ID_COMPRA = ?', [compraId]);
        const created = createdRows && createdRows.length ? createdRows[0] : null;
        conn.release();
        return Response.json({ success: true, id_compra: compraId, compra: created });
      } catch (e) {
        conn.release();
        return Response.json({ success: true, id_compra: compraId });
      }
    } catch (err) {
      try { await conn.rollback(); } catch (e) {}
      try { conn.release(); } catch (e) {}
      console.error('Error creando compra', err);
      return Response.json({ error: err.message || String(err) }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // devolver compra con detalles
      const [compRows] = await pool.query('SELECT ID_COMPRA, FECHA_PEDIDO, FECHA_ENTREGA, TOTAL, ID_PROVEEDOR, ID_USUARIO, ID_SUCURSAL, ESTADO FROM COMPRAS WHERE ID_COMPRA = ? LIMIT 1', [id]);
      if (!compRows || compRows.length === 0) return Response.json({ error: 'compra no encontrada' }, { status: 404 });
      const compra = compRows[0];
      // ensure ENTREGADO column exists before selecting
      await ensureEntregadoColumn();
      const [detRows] = await pool.query(
        `SELECT d.ID_DETALLES_COMPRA,
                d.ID_PRODUCT,
                d.CANTIDAD,
                -- usar PRECIO_COMPRA de PRODUCTOS cuando esté disponible
                COALESCE(p.PRECIO_COMPRA, d.PRECIO_UNIT, 0) AS PRECIO_UNIT,
                (d.CANTIDAD * COALESCE(p.PRECIO_COMPRA, d.PRECIO_UNIT, 0)) AS SUB_TOTAL,
                COALESCE(d.ENTREGADO, 0) AS ENTREGADO,
                p.CODIGO_PRODUCTO,
                p.PRODUCT_NAME
         FROM DETALLES_COMPRA d
         LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
         WHERE d.ID_COMPRA = ?`,
        [id]
      );
      return Response.json({ compra, detalles: detRows });
    }

    // listar compras con filtro por sucursal si usuario no es admin
    const { isAdmin, sucursalId } = await getUserSucursalContext(request);
    const where = !isAdmin && sucursalId ? 'WHERE c.ID_SUCURSAL = ?' : '';
    const params = !isAdmin && sucursalId ? [sucursalId] : [];
    const [rows] = await pool.query(`
      SELECT c.ID_COMPRA, c.FECHA_PEDIDO, c.FECHA_ENTREGA, c.TOTAL, c.ID_PROVEEDOR, p.NOMBRE_PROVEEDOR, c.ID_USUARIO, c.ID_SUCURSAL, c.ESTADO,
             (SELECT COUNT(1) FROM DETALLES_COMPRA d WHERE d.ID_COMPRA = c.ID_COMPRA) AS PRODUCT_COUNT
      FROM COMPRAS c
      LEFT JOIN PROVEEDOR p ON p.ID_PROVEEDOR = c.ID_PROVEEDOR
      ${where}
      ORDER BY c.ID_COMPRA DESC
    `, params);
    return Response.json(rows);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const detalleId = searchParams.get('detalleId');

    // allow JSON body as well
    let bodyId = null;
    try {
      const b = await request.json();
      bodyId = b?.detalleId || b?.id || null;
    } catch (e) {
      // ignore
    }

    const idToDelete = detalleId || bodyId;
    if (!idToDelete) return Response.json({ error: 'detalleId requerido' }, { status: 400 });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // obtener detalle
      const [rows] = await conn.query('SELECT ID_PRODUCT, CANTIDAD, SUB_TOTAL, ID_COMPRA FROM DETALLES_COMPRA WHERE ID_DETALLES_COMPRA = ? LIMIT 1', [idToDelete]);
      if (!rows || rows.length === 0) {
        await conn.commit();
        conn.release();
        return Response.json({ error: 'detalle no encontrado' }, { status: 404 });
      }
      const det = rows[0];

      // NOTE: No restar cantidad del producto global al eliminar un detalle de compra.
      // Las compras no modifican el stock global en este flujo.

      // actualizar total de la compra
      if (det.ID_COMPRA) {
        await conn.query('UPDATE COMPRAS SET TOTAL = GREATEST(0, IFNULL(TOTAL,0) - ?) WHERE ID_COMPRA = ?', [Number(det.SUB_TOTAL || 0), det.ID_COMPRA]);
      }

      // borrar detalle
      await conn.query('DELETE FROM DETALLES_COMPRA WHERE ID_DETALLES_COMPRA = ?', [idToDelete]);

      // verificar si la compra quedó sin detalles y eliminarla si es así
      let compraDeleted = false;
      let deletedCompraId = null;
      if (det.ID_COMPRA) {
        const [countRows] = await conn.query('SELECT COUNT(1) as cnt FROM DETALLES_COMPRA WHERE ID_COMPRA = ?', [det.ID_COMPRA]);
        const remaining = (countRows && countRows.length > 0) ? Number(countRows[0].cnt || 0) : 0;
        if (remaining <= 0) {
          // eliminar la compra por completo
          await conn.query('DELETE FROM COMPRAS WHERE ID_COMPRA = ?', [det.ID_COMPRA]);
          compraDeleted = true;
          deletedCompraId = det.ID_COMPRA;
        }
      }

      await conn.commit();
      conn.release();
      return Response.json({ success: true, deleted: idToDelete, compraDeleted, deletedCompraId });
    } catch (e) {
      try { await conn.rollback(); } catch(_) {}
      try { conn.release(); } catch(_) {}
      console.error('Error deleting detalle compra', e);
      return Response.json({ error: e.message || String(e) }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
