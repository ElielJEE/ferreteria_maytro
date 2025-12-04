import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

// Helpers: date ranges
const todayRange = () => ({
	start: new Date(new Date().setHours(0, 0, 0, 0)),
	end: new Date(new Date().setHours(23, 59, 59, 999)),
});

const monthRange = () => {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
	return { start, end };
};

// Query utilities
const withSucursalFilter = (sql, sucursalIdOrName, field = 'ID_SUCURSAL') => {
	if (!sucursalIdOrName || sucursalIdOrName === 'Todas') return { sql, params: [] };
	// If it's short string like "SUC001" assume ID, otherwise try by name
	if (/^[A-Za-z0-9_-]{2,15}$/.test(String(sucursalIdOrName))) {
		return { sql: `${sql} AND ${field} = ?`, params: [sucursalIdOrName] };
	}
	// Fallback by name in factura and sucursal join usage (caller must alias properly)
	return { sql: `${sql} AND ${field} = (SELECT ID_SUCURSAL FROM sucursal WHERE NOMBRE_SUCURSAL = ? LIMIT 1)`, params: [sucursalIdOrName] };
};

async function getRevenueToday(sucursal) {
	const { start, end } = todayRange();
	let base = 'SELECT IFNULL(SUM(TOTAL), 0) AS total FROM factura WHERE FECHA BETWEEN ? AND ?';
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		const add = withSucursalFilter(base, sucursal, 'ID_SUCURSAL');
		base = add.sql; params = [...params, ...add.params];
	}
	const [rows] = await pool.query(base, params);
	return Number(rows?.[0]?.total || 0);
}

async function getInvoicesToday(sucursal) {
	const { start, end } = todayRange();
	let base = 'SELECT COUNT(*) AS cnt FROM factura WHERE FECHA BETWEEN ? AND ?';
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		const add = withSucursalFilter(base, sucursal, 'ID_SUCURSAL');
		base = add.sql; params = [...params, ...add.params];
	}
	const [rows] = await pool.query(base, params);
	return Number(rows?.[0]?.cnt || 0);
}

async function getProductsSoldToday(sucursal) {
	const { start, end } = todayRange();
	let base = `SELECT IFNULL(SUM(fd.AMOUNT), 0) AS qty
							FROM factura_detalles fd
							JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
							WHERE f.FECHA BETWEEN ? AND ?`;
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		base += ' AND f.ID_SUCURSAL = ?';
		params.push(sucursal);
	}
	const [rows] = await pool.query(base, params);
	return Number(rows?.[0]?.qty || 0);
}

async function getClientsToday(sucursal) {
	const { start, end } = todayRange();
	let base = 'SELECT COUNT(DISTINCT ID_CLIENTES) AS cnt FROM factura WHERE FECHA BETWEEN ? AND ?';
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		const add = withSucursalFilter(base, sucursal, 'ID_SUCURSAL');
		base = add.sql; params = [...params, ...add.params];
	}
	const [rows] = await pool.query(base, params);
	return Number(rows?.[0]?.cnt || 0);
}

async function getMonthlyRevenueAndCount(sucursal) {
	const { start, end } = monthRange();
	let base = 'SELECT IFNULL(SUM(TOTAL),0) AS total, COUNT(*) AS cnt FROM factura WHERE FECHA BETWEEN ? AND ?';
	let params = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		const add = withSucursalFilter(base, sucursal, 'ID_SUCURSAL');
		base = add.sql; params = [...params, ...add.params];
	}
	const [rows] = await pool.query(base, params);
	return { total: Number(rows?.[0]?.total || 0), invoices: Number(rows?.[0]?.cnt || 0) };
}

async function getMonthlyUnitsAndClients(sucursal) {
	const { start, end } = monthRange();
	let unitsSql = `SELECT IFNULL(SUM(fd.AMOUNT),0) AS units
									FROM factura_detalles fd
									JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
									WHERE f.FECHA BETWEEN ? AND ?`;
	let unitsParams = [start, end];
	if (sucursal && sucursal !== 'Todas') { unitsSql += ' AND f.ID_SUCURSAL = ?'; unitsParams.push(sucursal); }
	const [[unitsRow]] = await pool.query(unitsSql, unitsParams);

	let clientsSql = `SELECT COUNT(DISTINCT ID_CLIENTES) AS clients FROM factura WHERE FECHA BETWEEN ? AND ?`;
	let clientsParams = [start, end];
	if (sucursal && sucursal !== 'Todas') {
		const add = withSucursalFilter(clientsSql, sucursal, 'ID_SUCURSAL');
		clientsSql = add.sql; clientsParams = [...clientsParams, ...add.params];
	}
	const [[clientsRow]] = await pool.query(clientsSql, clientsParams);
	return { units: Number(unitsRow?.units || 0), clients: Number(clientsRow?.clients || 0) };
}

async function getWeeklySalesSeries(sucursal) {
	let base = `SELECT DATE(f.FECHA) AS d, IFNULL(SUM(f.TOTAL),0) AS total
							FROM factura f
							WHERE f.FECHA >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`;
	const params = [];
	if (sucursal && sucursal !== 'Todas') {
		base += ' AND f.ID_SUCURSAL = ?';
		params.push(sucursal);
	}
	base += ' GROUP BY DATE(f.FECHA) ORDER BY d ASC';
	const [rows] = await pool.query(base, params);
	// Fill missing days
	const days = [];
	for (let i = 6; i >= 0; i--) {
		const dt = new Date();
		dt.setDate(dt.getDate() - i);

		if (dt.getDay() === 0) {
			continue;
		}

		const key = dt.toISOString().slice(0, 10);
		const found = rows.find(r => r.d && new Date(r.d).toISOString().slice(0, 10) === key);
		const amount = Number(found?.total || 0);
		// labels: Lun..Dom in es-ES
		const dayLabel = dt.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
		days.push({ day: capitalize(dayLabel), amount });
	}
	return days;
}

async function getTopProductsWeek(sucursal) {
	let base = `SELECT p.ID_PRODUCT, p.PRODUCT_NAME AS product,
										 IFNULL(SUM(fd.AMOUNT),0) AS count,
										 IFNULL(SUM(fd.SUB_TOTAL),0) AS amount
							FROM factura_detalles fd
							JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
							LEFT JOIN productos p ON p.ID_PRODUCT = fd.ID_PRODUCT
							WHERE f.FECHA >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
	const params = [];
	if (sucursal && sucursal !== 'Todas') {
		base += ' AND f.ID_SUCURSAL = ?';
		params.push(sucursal);
	}
	base += ' GROUP BY p.ID_PRODUCT, p.PRODUCT_NAME ORDER BY count DESC, amount DESC LIMIT 5';
	const [rows] = await pool.query(base, params);
	return rows.map(r => ({ id: r.ID_PRODUCT, product: r.product, count: Number(r.count || 0), amount: Number(r.amount || 0) }));
}

async function getLowStock(sucursal) {
	// Alertas: stock sucursal < minimo o 0; si hay nivelacion usar min/max
	let base = `SELECT 
			p.ID_PRODUCT AS id,
			p.PRODUCT_NAME AS product,
			s.NOMBRE_SUCURSAL AS sucursal,
			IFNULL(ss.CANTIDAD,0) AS stock,
			IFNULL(nv.CANTIDAD, NULL) AS min,
			IFNULL(nv.CANTIDAD_MAX, NULL) AS max
		FROM productos p
		CROSS JOIN sucursal s
		LEFT JOIN stock_sucursal ss ON ss.ID_PRODUCT = p.ID_PRODUCT AND ss.ID_SUCURSAL = s.ID_SUCURSAL
		LEFT JOIN nivelacion nv ON nv.ID_PRODUCT = p.ID_PRODUCT AND nv.ID_SUCURSAL = s.ID_SUCURSAL
		WHERE 1=1`;
	const params = [];
	if (sucursal && sucursal !== 'Todas') {
		base += ' AND s.ID_SUCURSAL = ?';
		params.push(sucursal);
	}
	base += ' ORDER BY ss.CANTIDAD ASC LIMIT 50';
	const [rows] = await pool.query(base, params);
	// Filter to only low ones
	const alerts = [];
	for (const r of rows) {
		const stock = Number(r.stock || 0);
		const min = r.min == null || r.min === '' ? null : Number(r.min);
		const max = r.max == null || r.max === '' ? null : Number(r.max);
		let status = null;
		if (stock === 0) status = 'agotado';
		else if (min != null && stock < min) status = 'bajo';
		else if (max != null && stock > max) status = 'exceso';
		if (status) alerts.push({ product: r.product, stock, maxStock: max, minStock: min, sucursal: r.sucursal, status, id: r.id });
	}
	return alerts.slice(0, 10);
}

async function getRecentSales(sucursal) {
	let base = `SELECT f.ID_FACTURA AS id,
										 DATE_FORMAT(f.FECHA, '%Y-%m-%d') AS fecha,
										 DATE_FORMAT(f.FECHA, '%H:%i') AS hora,
										 f.TOTAL AS total,
										 c.NOMBRE_CLIENTE AS cliente,
										 s.NOMBRE_SUCURSAL AS sucursal
							FROM factura f
							LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
							LEFT JOIN sucursal s ON s.ID_SUCURSAL = f.ID_SUCURSAL
							WHERE 1=1`;
	const params = [];
	if (sucursal && sucursal !== 'Todas') {
		base += ' AND f.ID_SUCURSAL = ?';
		params.push(sucursal);
	}
	base += ' ORDER BY f.FECHA DESC LIMIT 10';
	const [rows] = await pool.query(base, params);
	return rows.map(r => ({ id: r.id, fecha: r.fecha, hora: r.hora, total: Number(r.total || 0), cliente: r.cliente || '', sucursal: r.sucursal || '' }));
}

async function getRecentMovements(sucursal) {
	let base = `
		SELECT mi.id,
					 DATE_FORMAT(mi.fecha, '%Y-%m-%d') AS fecha,
					 DATE_FORMAT(mi.fecha, '%H:%i') AS hora,
					 mi.tipo_movimiento AS tipo,
					 s.NOMBRE_SUCURSAL AS sucursal,
					 p.PRODUCT_NAME AS producto,
					 mi.cantidad
		FROM movimientos_inventario mi
		LEFT JOIN productos p ON p.ID_PRODUCT = mi.producto_id
		LEFT JOIN sucursal s ON s.ID_SUCURSAL = mi.sucursal_id
        WHERE 1=1`;
	const params = [];
	if (sucursal && sucursal !== 'Todas') { base += ' AND mi.sucursal_id = ?'; params.push(sucursal); }
	base += ' ORDER BY mi.fecha DESC LIMIT 10';
	const [rows] = await pool.query(base, params);
	const mapTipo = (t) => {
		if (!t) return '';
		const v = String(t).toLowerCase();
		if (v === 'danado' || v === 'dañado') return 'Dañado';
		if (v === 'reservado' || v === 'reserva') return 'Reserva';
		if (v === 'entrada') return 'Entrada';
		if (v === 'salida') return 'Salida';
		if (v === 'transferencia') return 'Transferencia';
		if (v === 'ajuste' || v === 'ajuste_danado') return 'Ajuste';
		return String(t);
	};
	return rows.map(r => ({ id: r.id, fecha: r.fecha, hora: r.hora, tipo: mapTipo(r.tipo), sucursal: r.sucursal || '', producto: r.producto || '', cantidad: Number(r.cantidad || 0) }));
}

async function getStockTotals(sucursal) {
	// Si se especifica sucursal, sumar solo el stock de esa sucursal.
	if (sucursal && sucursal !== 'Todas') {
		const [[{ stockSuc }]] = await pool.query('SELECT IFNULL(SUM(CANTIDAD),0) AS stockSuc FROM stock_sucursal WHERE ID_SUCURSAL = ?', [sucursal]);
		return Number(stockSuc || 0);
	}
	// Admin: suma stock de todas las sucursales + productos en bodega (si aplica)
	const [[{ stockSuc }]] = await pool.query('SELECT IFNULL(SUM(CANTIDAD),0) AS stockSuc FROM stock_sucursal');
	const [[{ stockBod }]] = await pool.query('SELECT IFNULL(SUM(CANTIDAD),0) AS stockBod FROM productos');
	return Number(stockSuc || 0) + Number(stockBod || 0);
}

async function getUserSucursalFromReq(req) {
	try {
		const token = req.cookies.get('token')?.value;
		if (!token) return { isAdmin: false, sucursalId: null };
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		// Buscar sucursal del usuario en BD
		const [[row]] = await pool.query(
			`SELECT u.ID_SUCURSAL FROM usuarios u WHERE u.ID = ? LIMIT 1`,
			[decoded.id || decoded.ID]
		);
		const sucursalId = row?.ID_SUCURSAL ?? null;
		return { isAdmin: sucursalId == null, sucursalId };
	} catch {
		return { isAdmin: false, sucursalId: null };
	}
}

function capitalize(s) { return (s || '').charAt(0).toUpperCase() + (s || '').slice(1); }

export async function GET(req) {
	try {
		// Determinar sucursal efectiva según el usuario
		const { isAdmin, sucursalId } = await getUserSucursalFromReq(req);
		const requested = req.nextUrl.searchParams.get('sucursal');
		// Si es admin puede ver "todas" o una sucursal específica via query param
		// Si no es admin, forzamos su propia sucursal
		const sucursal = isAdmin ? (requested || 'Todas') : (sucursalId);

		const [totalRevenueToday, totalSalesToday, productsSoldToday, clientsToday, monthly, monthlyUC, weekly, topProducts, lowStock, recentSales, recentMovs, stockTotal] = await Promise.all([
			getRevenueToday(sucursal),
			getInvoicesToday(sucursal),
			getProductsSoldToday(sucursal),
			getClientsToday(sucursal),
			getMonthlyRevenueAndCount(sucursal),
			getMonthlyUnitsAndClients(sucursal),
			getWeeklySalesSeries(sucursal),
			getTopProductsWeek(sucursal),
			getLowStock(sucursal),
			getRecentSales(sucursal),
			getRecentMovements(sucursal),
			getStockTotals(sucursal),
		]);

		return Response.json({
			// High-level summary
			totalRevenueToday,
			totalSalesToday,            // numero de facturas hoy
			productsSoldToday,          // unidades vendidas hoy
			clientsToday,               // clientes distintos atendidos hoy
			totalRevenueMonth: monthly.total,
			invoicesThisMonth: monthly.invoices,
			productsSoldMonth: monthlyUC.units,
			clientsThisMonth: monthlyUC.clients,

			// Dashboard widgets
			weeklySales: weekly,        // [{day, amount}]
			topProducts: topProducts,   // [{product, count, amount}]
			lowStockProducts: lowStock, // [{product, stock, ...}]
			recentSales,
			recentMovements: recentMovs,
			stockTotal,
		});
	} catch (e) {
		return Response.json({ error: e.message || 'Error al obtener datos del dashboard' }, { status: 500 });
	}
}

