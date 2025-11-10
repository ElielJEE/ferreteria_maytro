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

		let sql = `SELECT *	FROM ROL`;
		const params = [];
		if (q) {
			sql += ` WHERE ROL_NAME LIKE ?`;
			params.push(`%${q}%`, `%${q}%`);
		}
		sql += ` ORDER BY ROL_NAME ASC LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`;
		params.push(limit, offset);

		const [rows] = await pool.query(sql, params);
		const roles = (rows || []).map(r => ({
			id: r.ID_ROL,
			rol: r.ROL_NAME || '',
		}));
		return NextResponse.json({ roles });
	} catch (e) {
		return NextResponse.json({ error: e.message || 'Error al obtener roles' }, { status: 500 });
	}
}