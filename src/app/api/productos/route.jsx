export async function PUT(request) {
	try {
		const body = await request.json();
		const { id, codigo, nombre, subcategoria, precio_venta, cantidad } = body;
		await pool.query(
			'UPDATE PRODUCTOS SET CODIGO_PRODUCTO = ?, PRODUCT_NAME = ?, CANTIDAD = ?, PRECIO = ?, ID_SUBCATEGORIAS = ? WHERE ID_PRODUCT = ?',
			[codigo, nombre, cantidad ?? 0, precio_venta, subcategoria, id]
		);
		return Response.json({ success: true });
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(request) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });
		const conn = await pool.getConnection();
		try {
			await conn.beginTransaction();

			// Helper: elimina en la tabla si alguna de las columnas candidatas existe
			const deleteFromIfColumn = async (table, candidates) => {
				const [cols] = await conn.query(
					`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
					[table]
				);
				if (!cols || !cols.length) return; // tabla no existe o no accesible
				const available = new Set(cols.map(r => String(r.COLUMN_NAME).toUpperCase()));
				for (const c of candidates) {
					if (available.has(c.toUpperCase())) {
						await conn.query(`DELETE FROM ${table} WHERE ${c} = ?`, [id]);
						break;
					}
				}
			};

			// Tablas relacionadas a borrar (orden: hijos -> padre)
			await deleteFromIfColumn('MOVIMIENTOS_INVENTARIO', ['producto_id', 'ID_PRODUCT']);
			await deleteFromIfColumn('STOCK_DANADOS', ['ID_PRODUCT', 'producto_id']);
			await deleteFromIfColumn('NIVELACION', ['ID_PRODUCT', 'producto_id']);
			await deleteFromIfColumn('STOCK_SUCURSAL', ['ID_PRODUCT', 'producto_id']);

			// Finalmente borrar el producto
			await conn.query('DELETE FROM PRODUCTOS WHERE ID_PRODUCT = ?', [id]);

			await conn.commit();
			conn.release();
			return Response.json({ success: true });
		} catch (err) {
			try { await conn.rollback(); } catch (e) {}
			try { conn.release(); } catch (e) {}
			return Response.json({ error: err.message }, { status: 500 });
		}
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}
import pool from '@/lib/db';
import { extractId } from '@/app/api/_utils/normalize';

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const type = searchParams.get('type');

	if (type === 'subcategorias') {
		// Obtener subcategorías
		try {
			const [rows] = await pool.query('SELECT ID_SUBCATEGORIAS, NOMBRE_SUBCATEGORIA FROM SUBCATEGORIAS');
			return Response.json(rows);
		} catch (error) {
			return Response.json({ error: error.message }, { status: 500 });
		}
	}

	// Obtener productos
	try {
	const [rows] = await pool.query(`SELECT P.ID_PRODUCT, P.CODIGO_PRODUCTO, P.PRODUCT_NAME, P.CANTIDAD, P.PRECIO, S.ID_SUBCATEGORIAS, S.NOMBRE_SUBCATEGORIA FROM PRODUCTOS P LEFT JOIN SUBCATEGORIAS S ON P.ID_SUBCATEGORIAS = S.ID_SUBCATEGORIAS`);
		return Response.json(rows);
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		const { codigo, nombre, subcategoria, precio_venta, cantidad } = body;
				// Insertar producto (incluye CANTIDAD_STOCK por compatibilidad con el esquema)
						// Normalizar subcategoria: puede llegar como objeto {value,label} desde el frontend
					const subcategoriaId = extractId(subcategoria);

						const vals = [
							codigo ?? null,
							nombre ?? null,
							Number(cantidad) || 0,
							null, // CANTIDAD_STOCK (compatibilidad)
							Number(precio_venta) || 0,
							subcategoriaId,
						];
				// seguridad: asegurar que el número de valores coincide con las columnas listadas
				if (vals.length !== 6) {
					console.error('Invalid params length for PRODUCTOS insert', vals);
					return Response.json({ error: 'Invalid params for insert' }, { status: 500 });
				}
				try {
								console.log('Inserting PRODUCTOS with params:', vals);
					await pool.query(
						'INSERT INTO PRODUCTOS (CODIGO_PRODUCTO, PRODUCT_NAME, CANTIDAD, CANTIDAD_STOCK, PRECIO, ID_SUBCATEGORIAS) VALUES (?, ?, ?, ?, ?, ?)',
						vals
					);
				} catch (errInsert) {
					console.error('Error inserting PRODUCTOS', { err: errInsert && errInsert.message, params: vals });
					throw errInsert;
				}
		return Response.json({ success: true });
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}
