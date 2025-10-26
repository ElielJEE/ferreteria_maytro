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

		let sql = `SELECT ID_CLIENTES AS id, NOMBRE_CLIENTE AS nombre, TELEFONO_CLIENTE AS telefono, DIRECCION_CLIENTE AS direccion FROM CLIENTES`;
		const params = [];
		if (q) {
			sql += ` WHERE NOMBRE_CLIENTE LIKE ? OR TELEFONO_CLIENTE LIKE ?`;
			params.push(`%${q}%`, `%${q}%`);
		}
		sql += ` ORDER BY NOMBRE_CLIENTE ASC LIMIT ? OFFSET ?`;
		params.push(limit, offset);

			const [rows] = await pool.query(sql, params);
			const clientes = (rows || []).map(r => ({ id: r.id, nombre: r.nombre || '', telefono: r.telefono || '', direccion: r.direccion || '' }));
			return NextResponse.json({ clientes });
	} catch (e) {
			return NextResponse.json({ error: e.message || 'Error al obtener clientes' }, { status: 500 });
	}
}

// También exportar POST si en el futuro se necesita crear clientes aquí

