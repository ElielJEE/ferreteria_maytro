export async function PUT(request) {
	try {
		const body = await request.json();
		const { id, nombre, subcategoria, precio_venta, cantidad } = body;
		await pool.query(
			'UPDATE PRODUCTOS SET PRODUCT_NAME = ?, CANTIDAD = ?, PRECIO = ?, ID_SUBCATEGORIAS = ? WHERE ID_PRODUCT = ?',
			[nombre, cantidad ?? 0, precio_venta, subcategoria, id]
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
		await pool.query('DELETE FROM PRODUCTOS WHERE ID_PRODUCT = ?', [id]);
		return Response.json({ success: true });
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}
import pool from '@/lib/db';

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
		const [rows] = await pool.query(`SELECT P.ID_PRODUCT, P.PRODUCT_NAME, P.CANTIDAD, P.PRECIO, P.STATUS, S.ID_SUBCATEGORIAS, S.NOMBRE_SUBCATEGORIA FROM PRODUCTOS P LEFT JOIN SUBCATEGORIAS S ON P.ID_SUBCATEGORIAS = S.ID_SUBCATEGORIAS`);
		return Response.json(rows);
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		const { codigo, nombre, subcategoria, precio_venta, cantidad } = body;
		// Insertar producto (ignorar precio de compra)
		await pool.query(
			'INSERT INTO PRODUCTOS (PRODUCT_NAME, CANTIDAD, PRECIO, STATUS, ID_SUBCATEGORIAS) VALUES (?, ?, ?, ?, ?)',
			[nombre, cantidad ?? 0, precio_venta, 'En stock', subcategoria]
		);
		return Response.json({ success: true });
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}
