import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

// Helpers: rango de hoy
const todayRange = () => ({
	start: new Date(new Date().setHours(0, 0, 0, 0)),
	end: new Date(new Date().setHours(23, 59, 59, 999)),
});

// Obtener sucursal desde token
async function getUserSucursalFromReq(req) {
	try {
		const token = req.cookies.get('token')?.value;
		if (!token) return { isAdmin: false, sucursalId: null };
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const [[row]] = await pool.query(
			"SELECT u.ID_SUCURSAL FROM usuarios u WHERE u.ID = ? LIMIT 1",
			[decoded.id || decoded.ID]
		);
		const sucursalId = row?.ID_SUCURSAL ?? null;
		return { isAdmin: sucursalId == null, sucursalId };
	} catch {
		return { isAdmin: false, sucursalId: null };
	}
}

// Consulta utilities
const withSucursalFilter = (sql, sucursalIdOrName, field = 'ID_SUCURSAL') => {
	if (!sucursalIdOrName || sucursalIdOrName === 'Todas') return { sql, params: [] };
	return { sql: `${sql} AND ${field} = ?`, params: [sucursalIdOrName] };
};

// --------------- Consultas ---------------

// 1. Ventas del día
async function getRevenueToday(sucursal) {
	const { start, end } = todayRange();
	let sql = 'SELECT IFNULL(SUM(TOTAL), 0) AS total FROM factura WHERE FECHA BETWEEN ? AND ?';
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		const add = withSucursalFilter(sql, sucursal, 'ID_SUCURSAL');
		sql = add.sql; params.push(...add.params);
	}
	const [rows] = await pool.query(sql, params);
	return Number(rows?.[0]?.total || 0);
}

async function getInvoicesToday(sucursal) {
	const { start, end } = todayRange();
	let sql = 'SELECT COUNT(*) AS cnt FROM factura WHERE FECHA BETWEEN ? AND ?';
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		const add = withSucursalFilter(sql, sucursal, 'ID_SUCURSAL');
		sql = add.sql; params.push(...add.params);
	}
	const [rows] = await pool.query(sql, params);
	return Number(rows?.[0]?.cnt || 0);
}

async function getProductsSoldToday(sucursal) {
	const { start, end } = todayRange();
	let sql = `SELECT IFNULL(SUM(fd.AMOUNT),0) AS qty
			 FROM factura_detalles fd
			 JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
             WHERE f.FECHA BETWEEN ? AND ?`;
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') { sql += ' AND f.ID_SUCURSAL = ?'; params.push(sucursal); }
	const [rows] = await pool.query(sql, params);
	return Number(rows?.[0]?.qty || 0);
}

async function getClientsToday(sucursal) {
	const { start, end } = todayRange();
	let sql = 'SELECT COUNT(DISTINCT ID_CLIENTES) AS cnt FROM factura WHERE FECHA BETWEEN ? AND ?';
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		const add = withSucursalFilter(sql, sucursal, 'ID_SUCURSAL');
		sql = add.sql; params.push(...add.params);
	}
	const [rows] = await pool.query(sql, params);
	return Number(rows?.[0]?.cnt || 0);
}

// 2. Ventas semanales
async function getWeeklySalesSeries(sucursal) {
	let sql = `SELECT DATE(f.FECHA) AS d, IFNULL(SUM(f.TOTAL),0) AS total
			 FROM factura f
             WHERE f.FECHA >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`;
	const params = [];
	if (sucursal && sucursal !== 'Todas') { sql += ' AND f.ID_SUCURSAL = ?'; params.push(sucursal); }
	sql += ' GROUP BY DATE(f.FECHA) ORDER BY d ASC';
	const [rows] = await pool.query(sql, params);
	return rows.map(r => ({ day: r.d.toISOString().slice(0, 10), amount: Number(r.total) }));
}

// 3. Top productos
async function getTopProductsWeek(sucursal) {
	let sql = `SELECT p.ID_PRODUCT, p.PRODUCT_NAME AS product,
			 IFNULL(SUM(fd.AMOUNT),0) AS count, IFNULL(SUM(fd.SUB_TOTAL),0) AS amount
			 FROM factura_detalles fd
			 JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
			 LEFT JOIN productos p ON p.ID_PRODUCT = fd.ID_PRODUCT
             WHERE f.FECHA >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
	const params = [];
	if (sucursal && sucursal !== 'Todas') { sql += ' AND f.ID_SUCURSAL = ?'; params.push(sucursal); }
	sql += ' GROUP BY p.ID_PRODUCT, p.PRODUCT_NAME ORDER BY count DESC LIMIT 5';
	const [rows] = await pool.query(sql, params);
	return rows.map(r => ({ id: r.ID_PRODUCT, product: r.product, count: Number(r.count), amount: Number(r.amount) }));
}

// 4. Stock bajo
async function getLowStock(sucursal) {
	let sql = `SELECT p.PRODUCT_NAME AS product, s.NOMBRE_SUCURSAL AS sucursal, 
			 IFNULL(ss.CANTIDAD,0) AS stock, IFNULL(nv.CANTIDAD,0) AS min, IFNULL(nv.CANTIDAD_MAX,0) AS max
			 FROM productos p
			 CROSS JOIN sucursal s
			 LEFT JOIN stock_sucursal ss ON ss.ID_PRODUCT = p.ID_PRODUCT AND ss.ID_SUCURSAL = s.ID_SUCURSAL
			 LEFT JOIN nivelacion nv ON nv.ID_PRODUCT = p.ID_PRODUCT AND nv.ID_SUCURSAL = s.ID_SUCURSAL
             WHERE 1=1`;
	const params = [];
	if (sucursal && sucursal !== 'Todas') { sql += ' AND s.ID_SUCURSAL = ?'; params.push(sucursal); }
	sql += ' ORDER BY ss.CANTIDAD ASC LIMIT 50';
	const [rows] = await pool.query(sql, params);
	return rows.map(r => ({
		product: r.product, stock: Number(r.stock), minStock: Number(r.min), maxStock: Number(r.max), sucursal: r.sucursal
	}));
}

// 5. Ventas recientes
async function getRecentSales(sucursal) {
	const { start, end } = todayRange(); // rango de hoy

	let sql = `
    SELECT f.ID_FACTURA AS id,
	    DATE_FORMAT(f.FECHA,'%Y-%m-%d') AS fecha,
	    DATE_FORMAT(f.FECHA,'%H:%i') AS hora,
	    f.TOTAL AS total,
	    c.NOMBRE_CLIENTE AS cliente,
	    s.NOMBRE_SUCURSAL AS sucursal
    FROM factura f
    LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
    LEFT JOIN sucursal s ON s.ID_SUCURSAL = f.ID_SUCURSAL
    WHERE f.FECHA BETWEEN ? AND ?`;

	const params = [start, end]; // Parámetros del rango de hoy

	if (sucursal && sucursal !== 'Todas') {
		sql += ' AND f.ID_SUCURSAL = ?';
		params.push(sucursal);
	}

	sql += ' ORDER BY f.FECHA DESC LIMIT 10';

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


// 6. Movimientos recientes
async function getRecentMovements(sucursal) {
	const { start, end } = todayRange(); // Rango de hoy
	let sql = `
    SELECT mi.id,
	    DATE_FORMAT(mi.fecha,'%Y-%m-%d') AS fecha,
	    DATE_FORMAT(mi.fecha,'%H:%i') AS hora,
	    mi.tipo_movimiento AS tipo,
	    s.NOMBRE_SUCURSAL AS sucursal,
	    p.PRODUCT_NAME AS producto,
	    mi.cantidad
    FROM movimientos_inventario mi
    LEFT JOIN productos p ON p.ID_PRODUCT = mi.producto_id
    LEFT JOIN sucursal s ON s.ID_SUCURSAL = mi.sucursal_id
    WHERE mi.fecha BETWEEN ? AND ?`;

	const params = [start, end]; // Pasamos el rango de hoy

	if (sucursal && sucursal !== 'Todas') {
		sql += ' AND mi.sucursal_id = ?';
		params.push(sucursal);
	}

	sql += ' ORDER BY mi.fecha DESC LIMIT 10';

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


// 7. Stock total
async function getStockTotals(sucursal) {
	if (sucursal && sucursal !== 'Todas') {
		const [[{ stock }]] = await pool.query('SELECT IFNULL(SUM(CANTIDAD),0) AS stock FROM stock_sucursal WHERE ID_SUCURSAL = ?', [sucursal]);
		return Number(stock);
	}
	const [[{ stock }]] = await pool.query('SELECT IFNULL(SUM(CANTIDAD),0) AS stock FROM stock_sucursal');
	return Number(stock);
}

// --------------- API Handler ---------------

export async function GET(req) {
	try {
		const { isAdmin, sucursalId } = await getUserSucursalFromReq(req);
		const requested = req.nextUrl.searchParams.get('sucursal');
		const sucursal = isAdmin ? requested || 'Todas' : sucursalId;

		const [
			totalRevenueToday,
			totalSalesToday,
			productsSoldToday,
			clientsToday,
			weeklySales,
			topProducts,
			lowStockProducts,
			recentSales,
			recentMovements,
			stockTotal
		] = await Promise.all([
			getRevenueToday(sucursal),
			getInvoicesToday(sucursal),
			getProductsSoldToday(sucursal),
			getClientsToday(sucursal),
			getWeeklySalesSeries(sucursal),
			getTopProductsWeek(sucursal),
			getLowStock(sucursal),
			getRecentSales(sucursal),
			getRecentMovements(sucursal),
			getStockTotals(sucursal)
		]);

		return NextResponse.json({
			totalRevenueToday,
			totalSalesToday,
			productsSoldToday,
			clientsToday,
			weeklySales,
			topProducts,
			lowStockProducts,
			recentSales,
			recentMovements,
			stockTotal
		});
	} catch (e) {
		return NextResponse.json({ error: e.message || 'Error generando reporte' }, { status: 500 });
	}
}
