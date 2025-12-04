import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET(req) {
	try {
		const url = req.nextUrl;
		const q = (url.searchParams.get('q') || '').toString().trim();
		const page = Math.max(1, Number(url.searchParams.get('page') || 1));
		const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));
		const offset = (page - 1) * limit;

		let sql = `SELECT ID_PROVEEDOR AS id, NOMBRE_PROVEEDOR AS nombre, TELEFONO_PROVEEDOR AS telefono, EMPRESA_PROVEEDOR AS empresa FROM proveedor`;
		const params = [];
		if (q) {
			sql += ` WHERE NOMBRE_PROVEEDOR LIKE ? OR TELEFONO_PROVEEDOR LIKE ? OR EMPRESA_PROVEEDOR LIKE ?`;
			params.push(`%${q}%`, `%${q}%`, `%${q}%`);
		}
		sql += ` ORDER BY NOMBRE_PROVEEDOR ASC LIMIT ? OFFSET ?`;
		params.push(limit, offset);

		const [rows] = await pool.query(sql, params);
		const proveedores = (rows || []).map(r => ({
			id: r.id,
			nombre: r.nombre || '',
			telefono: r.telefono || '',
			empresa: r.empresa || ''
		}));
		return NextResponse.json({ proveedores });
	} catch (e) {
		return NextResponse.json({ error: e.message || 'Error al obtener proveedores' }, { status: 500 });
	}
}

// También exportar POST si en el futuro se necesita crear clientes aquí
