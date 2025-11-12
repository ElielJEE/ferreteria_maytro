import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function GET(req) {
	try {
		const token = req.cookies.get("token")?.value;

		if (!token) {
			return NextResponse.json({ user: null }, { status: 401 });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		let user = decoded;

		const [rows] = await pool.query(
			`SELECT 
				u.ID, 
				u.NOMBRE_USUARIO, 
				u.ID_ROL, 
				u.ID_SUCURSAL, 
				s.NOMBRE_SUCURSAL,
				r.ROL_NAME
			 FROM USUARIOS u
			 LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = u.ID_SUCURSAL
			 LEFT JOIN rol r ON r.ID_ROL = u.ID_ROL
			 WHERE u.ID = ?
			 LIMIT 1`,
			[decoded.id || decoded.ID]
		);

		if (!rows.length) {
			return NextResponse.json({ user: null }, { status: 404 });
		}

		const userData = rows[0];

		// 🔥 Traer los permisos del rol
		const [permisos] = await pool.query(
			`SELECT p.idpermisos, p.permisos_name, p.path
			 FROM PERMISOS p
			 INNER JOIN rol_permisos pr ON pr.permiso_id = p.idpermisos
			 WHERE pr.rol_id = ?`,
			[userData.ID_ROL]
		);

		// 🔐 Usuario final enriquecido
		user = {
			id: userData.ID,
			username: userData.NOMBRE_USUARIO,
			role: {
				id: userData.ID_ROL,
				nombre: userData.ROL_NAME,
				permisos: permisos.map(p => ({
					id: p.idpermisos,
					nombre: p.permisos_name,
					path: p.path,
				}))
			},
			ID_SUCURSAL: userData.ID_SUCURSAL || null,
			SUCURSAL_NOMBRE: userData.NOMBRE_SUCURSAL || null,
		};

		return NextResponse.json({ user });

	} catch (error) {
		console.error("Error al obtener usuario:", error);
		return NextResponse.json({ user: null }, { status: 401 });
	}
}
