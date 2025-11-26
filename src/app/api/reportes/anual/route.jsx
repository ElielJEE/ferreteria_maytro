import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';


// RANGO DEL AÑO ACTUAL
const yearRange = () => {
    const start = new Date();
    start.setMonth(0);   // Enero
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(); // Hoy
    end.setHours(23, 59, 59, 999);

    return { start, end };
};


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


// === FUNCIONES ANUALES === //

async function getRevenueYear(sucursal) {
    const { start, end } = yearRange();
    let sql = 'SELECT IFNULL(SUM(TOTAL), 0) AS total FROM FACTURA WHERE FECHA BETWEEN ? AND ?';
    const params = [start, end];

    if (sucursal && sucursal !== 'Todas') {
        sql += ' AND ID_SUCURSAL = ?';
        params.push(sucursal);
    }

    const [rows] = await pool.query(sql, params);
    return Number(rows?.[0]?.total || 0);
}

async function getInvoicesYear(sucursal) {
    const { start, end } = yearRange();
    let sql = 'SELECT COUNT(*) AS cnt FROM FACTURA WHERE FECHA BETWEEN ? AND ?';
    const params = [start, end];

    if (sucursal && sucursal !== 'Todas') {
        sql += ' AND ID_SUCURSAL = ?';
        params.push(sucursal);
    }

    const [rows] = await pool.query(sql, params);
    return Number(rows?.[0]?.cnt || 0);
}

async function getProductsSoldYear(sucursal) {
    const { start, end } = yearRange();
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

async function getClientsYear(sucursal) {
    const { start, end } = yearRange();
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

async function getRecentSalesYear(sucursal) {
    const { start, end } = yearRange();
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

async function getRecentMovementsYear(sucursal) {
    const { start, end } = yearRange();
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

async function getStockTotals(sucursal) {
    if (sucursal && sucursal !== 'Todas') {
        const [[{ stock }]] = await pool.query(
            'SELECT IFNULL(SUM(CANTIDAD),0) AS stock FROM STOCK_SUCURSAL WHERE ID_SUCURSAL = ?',
            [sucursal]
        );
        return Number(stock);
    }

    const [[{ stock }]] = await pool.query(
        'SELECT IFNULL(SUM(CANTIDAD),0) AS stock FROM STOCK_SUCURSAL'
    );
    return Number(stock);
}


// === HANDLER PARA /api/reportes/anual === //

export async function GET(req) {
    try {
        const { isAdmin, sucursalId } = await getUserSucursalFromReq(req);
        const requested = req.nextUrl.searchParams.get('sucursal');

        const sucursal = isAdmin ? requested || 'Todas' : sucursalId;

        const [
            totalRevenueYear,
            totalSalesYear,
            productsSoldYear,
            clientsYear,
            recentSales,
            recentMovements,
            stockTotal
        ] = await Promise.all([
            getRevenueYear(sucursal),
            getInvoicesYear(sucursal),
            getProductsSoldYear(sucursal),
            getClientsYear(sucursal),
            getRecentSalesYear(sucursal),
            getRecentMovementsYear(sucursal),
            getStockTotals(sucursal)
        ]);

        return NextResponse.json({
            totalRevenueYear,
            totalSalesYear,
            productsSoldYear,
            clientsYear,
            recentSales,
            recentMovements,
            stockTotal
        });

    } catch (e) {
        return NextResponse.json(
            { error: e.message || 'Error generando reporte anual' },
            { status: 500 }
        );
    }
}
