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
		// Eliminar stock en sucursales asociado (defensivo) y luego el producto
		await pool.query('DELETE FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ?', [id]);
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
		// Insertar producto (ignorar precio de compra)
		await pool.query(
			'INSERT INTO PRODUCTOS (CODIGO_PRODUCTO, PRODUCT_NAME, CANTIDAD, PRECIO, ID_SUBCATEGORIAS) VALUES (?, ?, ?, ?, ?)',
			[codigo, nombre, cantidad ?? 0, precio_venta, subcategoria]
		);
		return Response.json({ success: true });
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}
