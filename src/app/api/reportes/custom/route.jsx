import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';


// Obtener sucursal desde token
async function getUserSucursalFromReq(req) {
	try {
		const token = req.cookies.get('token')?.value;
		if (!token) return { isAdmin: false, sucursalId: null };

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const [[row]] = await pool.query(
			"SELECT u.ID_SUCURSAL FROM USUARIOS u WHERE u.ID = ? LIMIT 1",
			[decoded.id || decoded.ID]
		);

		const sucursalId = row?.ID_SUCURSAL ?? null;

		return { isAdmin: sucursalId == null, sucursalId };
	} catch {
		return { isAdmin: false, sucursalId: null };
	}
}


// Función genérica para recibir el rango custom
function customRange(startDate, endDate) {
	const [sy, sm, sd] = startDate.split('-').map(Number);
	const [ey, em, ed] = endDate.split('-').map(Number);

	const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);     // hora local
	const end = new Date(ey, em - 1, ed, 23, 59, 59, 999); // hora local

	return { start, end };
}




// === FUNCIONES === //

async function getRevenueCustom(start, end, sucursal) {
	let sql = 'SELECT IFNULL(SUM(TOTAL), 0) AS total FROM FACTURA WHERE FECHA BETWEEN ? AND ?';
	const params = [start, end];

	if (sucursal && sucursal !== 'Todas') {
		sql += ' AND ID_SUCURSAL = ?';
		params.push(sucursal);
	}

	const [rows] = await pool.query(sql, params);
	return Number(rows?.[0]?.total || 0);
}

async function getInvoicesCustom(start, end, sucursal) {
	let sql = 'SELECT COUNT(*) AS cnt FROM FACTURA WHERE FECHA BETWEEN ? AND ?';
	const params = [start, end];

	if (sucursal && sucursal !== 'Todas') {
		sql += ' AND ID_SUCURSAL = ?';
		params.push(sucursal);
	}

	const [rows] = await pool.query(sql, params);
	return Number(rows?.[0]?.cnt || 0);
}

async function getProductsSoldCustom(start, end, sucursal) {
	let sql = `
        SELECT IFNULL(SUM(fd.AMOUNT),0) AS qty
        FROM FACTURA_DETALLES fd
        JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
        WHERE f.FECHA BETWEEN ? AND ?
    `;
	const params = [start, end];

	if (sucursal && sucursal !== 'Todas') {
		sql += ' AND f.ID_SUCURSAL = ?';
		params.push(sucursal);
	}

	const [rows] = await pool.query(sql, params);
	return Number(rows?.[0]?.qty || 0);
}

async function getClientsCustom(start, end, sucursal) {
	let sql = `
        SELECT COUNT(DISTINCT ID_CLIENTES) AS cnt
        FROM FACTURA
        WHERE FECHA BETWEEN ? AND ?
    `;
	const params = [start, end];

	if (sucursal && sucursal !== 'Todas') {
		sql += ' AND ID_SUCURSAL = ?';
		params.push(sucursal);
	}

	const [rows] = await pool.query(sql, params);
	return Number(rows?.[0]?.cnt || 0);
}

async function getRecentSalesCustom(start, end, sucursal) {
	let sql = `
        SELECT f.ID_FACTURA AS id,
               DATE_FORMAT(f.FECHA,'%Y-%m-%d') AS fecha,
               DATE_FORMAT(f.FECHA,'%H:%i') AS hora,
               f.TOTAL AS total,
               c.NOMBRE_CLIENTE AS cliente,
               s.NOMBRE_SUCURSAL AS sucursal
        FROM FACTURA f
        LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
        LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = f.ID_SUCURSAL
        WHERE f.FECHA BETWEEN ? AND ?
        ORDER BY f.FECHA DESC
        LIMIT 100
    `;
	const params = [start, end];

	if (sucursal && sucursal !== 'Todas') {
		sql += ' AND f.ID_SUCURSAL = ?';
		params.push(sucursal);
	}

	const [rows] = await pool.query(sql, params);

	return rows.map(r => ({
		id: r.id,
		fecha: r.fecha,
		hora: r.hora,
		total: Number(r.total || 0),
		cliente: r.cliente || '',
		sucursal: r.sucursal || ''
	}));
}

async function getRecentMovementsCustom(start, end, sucursal) {
	let sql = `
        SELECT mi.id,
               DATE_FORMAT(mi.fecha,'%Y-%m-%d') AS fecha,
               DATE_FORMAT(mi.fecha,'%H:%i') AS hora,
               mi.tipo_movimiento AS tipo,
               s.NOMBRE_SUCURSAL AS sucursal,
               p.PRODUCT_NAME AS producto,
               mi.cantidad
        FROM MOVIMIENTOS_INVENTARIO mi
        LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = mi.producto_id
        LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = mi.sucursal_id
        WHERE mi.fecha BETWEEN ? AND ?
        ORDER BY mi.fecha DESC
        LIMIT 100
    `;
	const params = [start, end];

	if (sucursal && sucursal !== 'Todas') {
		sql += ' AND mi.sucursal_id = ?';
		params.push(sucursal);
	}

	const [rows] = await pool.query(sql, params);

	return rows.map(r => ({
		id: r.id,
		fecha: r.fecha,
		hora: r.hora,
		tipo: r.tipo,
		sucursal: r.sucursal || '',
		producto: r.producto || '',
		cantidad: Number(r.cantidad || 0)
	}));
}


// HANDLER
export async function GET(req) {
	try {
		const { isAdmin, sucursalId } = await getUserSucursalFromReq(req);

		const startDate = req.nextUrl.searchParams.get('inicio');
		const endDate = req.nextUrl.searchParams.get('fin');
		const requested = req.nextUrl.searchParams.get('sucursal');

		if (!startDate || !endDate) {
			return NextResponse.json({ error: "Debes enviar inicio y fin" }, { status: 400 });
		}

		const { start, end } = customRange(startDate, endDate);
		const sucursal = isAdmin ? requested || 'Todas' : sucursalId;

		const [
			totalRevenue,
			totalSales,
			productsSold,
			clients,
			recentSales,
			recentMovements
		] = await Promise.all([
			getRevenueCustom(start, end, sucursal),
			getInvoicesCustom(start, end, sucursal),
			getProductsSoldCustom(start, end, sucursal),
			getClientsCustom(start, end, sucursal),
			getRecentSalesCustom(start, end, sucursal),
			getRecentMovementsCustom(start, end, sucursal)
		]);

		return NextResponse.json({
			totalRevenue,
			totalSales,
			productsSold,
			clients,
			recentSales,
			recentMovements
		});

	} catch (e) {
		return NextResponse.json(
			{ error: e.message || 'Error generando reporte custom' },
			{ status: 500 }
		);
	}
}
