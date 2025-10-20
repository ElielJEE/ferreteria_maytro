import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function GET(req) {
	try {
		const token = req.cookies.get("token")?.value;

		if (!token) {
			return NextResponse.json(
				{ user: null },
				{ status: 401 }
			);
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Enriquecer con datos de BD (ID_SUCURSAL y nombre de sucursal)
		let user = decoded;
		try {
			const [rows] = await pool.query(
				`SELECT u.ID, u.NOMBRE_USUARIO, u.ID_ROL, u.ID_SUCURSAL, s.NOMBRE_SUCURSAL
				 FROM USUARIOS u
				 LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = u.ID_SUCURSAL
				 WHERE u.ID = ?
				 LIMIT 1`,
				[decoded.id || decoded.ID]
			);
			if (rows && rows.length) {
				user = {
					id: rows[0].ID,
					username: rows[0].NOMBRE_USUARIO,
					role: rows[0].ID_ROL,
					ID_SUCURSAL: rows[0].ID_SUCURSAL || null,
					SUCURSAL_NOMBRE: rows[0].NOMBRE_SUCURSAL || null,
				};
			}
		} catch (e) {
			// si falla la consulta, devolvemos el token decodificado
		}

		return NextResponse.json({ user });

	} catch (error) {
		console.error("Error al obtener usuario:", error)
		return NextResponse.json(
			{ user: null },
			{ status: 401 }
		);
	}
}