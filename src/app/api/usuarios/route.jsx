import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET(req) {
	try {
		const url = req.nextUrl;
		const q = (url.searchParams.get('q') || '').toString().trim();
		const page = Math.max(1, Number(url.searchParams.get('page') || 1));
		const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));
		const offset = (page - 1) * limit;

		let sql = `SELECT 
    u.ID AS id,
    u.NOMBRE AS nombre,
    u.NOMBRE_USUARIO AS nombreUsuario,
    u.CORREO AS correo,
    u.ESTATUS AS estado,
    r.ROL_NAME AS ROL,
		s.NOMBRE_SUCURSAL AS SUCURSAL
FROM USUARIOS u
LEFT JOIN ROL r ON u.ID_ROL = r.ID_ROL
LEFT JOIN SUCURSAL s ON u.ID_SUCURSAL = s.ID_SUCURSAL
`;
		const params = [];
		if (q) {
			sql += ` WHERE u.NOMBRE LIKE ? OR u.NOMBRE_USUARIO LIKE ?`;
			params.push(`%${q}%`, `%${q}%`);
		}
		sql += ` ORDER BY u.NOMBRE ASC LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`;
		params.push(limit, offset);

		const [rows] = await pool.query(sql, params);
		const usuarios = (rows || []).map(r => ({
			id: r.id,
			nombre: r.nombre || '',
			nombreUsuario: r.nombreUsuario || '',
			correo: r.correo || '',
			estado: r.estado || '',
			rol: r.ROL || '',
			sucursal: r.SUCURSAL || ''
		}));
		return NextResponse.json({ usuarios });
	} catch (e) {
		return NextResponse.json({ error: e.message || 'Error al obtener usuarios' }, { status: 500 });
	}
}

export async function POST(req) {
	try {
		const body = await req.json();
		const {
			nombre,
			nombreUsuario,
			correo,
			contrasenia,
			confirmarContrasenia,
			idRol,
			idSucursal,
			estado = 'ACTIVO',
		} = body;

		// Validaciones básicas
		if (!nombre || !nombreUsuario || !correo || !contrasenia || !confirmarContrasenia) {
			return NextResponse.json(
				{ error: "Todos los campos son obligatorios." },
				{ status: 400 }
			);
		}

		if (contrasenia !== confirmarContrasenia) {
			return NextResponse.json(
				{ error: "Las contraseñas no coinciden." },
				{ status: 400 }
			);
		}

		// Verificar si el usuario ya existe
		const [existing] = await pool.query(
			"SELECT ID FROM USUARIOS WHERE NOMBRE_USUARIO = ? OR CORREO = ?",
			[nombreUsuario, correo]
		);

		if (existing.length > 0) {
			return NextResponse.json(
				{ error: "El nombre de usuario o correo ya están registrados." },
				{ status: 409 }
			);
		}

		// Encriptar la contraseña
		const hashedPassword = await bcrypt.hash(contrasenia, 10);

		// Insertar usuario
		const sql = `
			INSERT INTO USUARIOS (NOMBRE, NOMBRE_USUARIO, CORREO, CONTRASENA, ID_ROL, ID_SUCURSAL, ESTATUS)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`;
		const [result] = await pool.query(sql, [
			nombre,
			nombreUsuario,
			correo,
			hashedPassword,
			idRol || null,
			idSucursal || null,
			estado,
		]);

		return NextResponse.json({
			message: "Usuario creado correctamente.",
			id: result.insertId,
		});
	} catch (e) {
		console.error("Error al crear usuario:", e);
		return NextResponse.json(
			{ error: e.message || "Error interno del servidor." },
			{ status: 500 }
		);
	}
}
