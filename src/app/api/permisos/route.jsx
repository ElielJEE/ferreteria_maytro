import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
	try {
		const url = req.nextUrl;
		const q = (url.searchParams.get("q") || "").trim();
		const page = Math.max(1, Number(url.searchParams.get("page") || 1));
		const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));
		const offset = (page - 1) * limit;

		let sql = `SELECT * FROM PERMISOS`;
		const params = [];

		if (q) {
			sql += ` WHERE permisos_name LIKE ? OR modulo LIKE ?`;
			params.push(`%${q}%`, `%${q}%`);
		}

		sql += ` ORDER BY modulo ASC, permisos_name ASC LIMIT ? OFFSET ?`;
		params.push(limit, offset);

		const [rows] = await pool.query(sql, params);

		const permisos = (rows || []).map(p => ({
			id: p.idpermisos,
			nombre: p.permisos_name,
			path: p.path,
			modulo: p.modulo,
		}));

		return NextResponse.json({ permisos });
	} catch (error) {
		console.error("Error al obtener permisos:", error);
		return NextResponse.json({ message: "Error al obtener permisos", error: error.message }, { status: 500 });
	}
}
