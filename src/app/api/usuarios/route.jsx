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
		u.ID_ROL as idRol,
		u.ID_SUCURSAL as idSucursal,
    r.ROL_NAME AS ROL,
		s.NOMBRE_SUCURSAL AS SUCURSAL
FROM usuarios u
LEFT JOIN rol r ON u.ID_ROL = r.ID_ROL
LEFT JOIN sucursal s ON u.ID_SUCURSAL = s.ID_SUCURSAL
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
			idRol: r.idRol || '',
			sucursal: r.SUCURSAL || '',
			idSucursal: r.idSucursal || '',
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
			"SELECT ID FROM usuarios WHERE NOMBRE_USUARIO = ? OR CORREO = ?",
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
			INSERT INTO usuarios (NOMBRE, NOMBRE_USUARIO, CORREO, CONTRASENA, ID_ROL, ID_SUCURSAL, ESTATUS)
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

export async function PUT(req) {
	try {
		const body = await req.json();
		const {
			id, // ID del usuario a actualizar
			nombre,
			nombreUsuario,
			correo,
			contrasenia,
			confirmarContrasenia,
			idRol,
			idSucursal,
		} = body;

		// Validaciones básicas
		if (!id) {
			return NextResponse.json({ error: "El ID del usuario es obligatorio." }, { status: 400 });
		}

		if (!nombre || !nombreUsuario || !correo) {
			return NextResponse.json({ error: "Nombre, usuario y correo son obligatorios." }, { status: 400 });
		}

		// Verificar si el usuario existe
		const [userRows] = await pool.query("SELECT * FROM usuarios WHERE ID = ?", [id]);
		if (userRows.length === 0) {
			return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
		}

		// Verificar si el nuevo nombreUsuario o correo ya están registrados en otro usuario
		const [existing] = await pool.query(
			"SELECT ID FROM usuarios WHERE (NOMBRE_USUARIO = ? OR CORREO = ?) AND ID != ?",
			[nombreUsuario, correo, id]
		);
		if (existing.length > 0) {
			return NextResponse.json(
				{ error: "El nombre de usuario o correo ya están registrados por otro usuario." },
				{ status: 409 }
			);
		}

		// Si se proporciona una contraseña, verificar que coincida la confirmación
		let hashedPassword = null;
		if (contrasenia || confirmarContrasenia) {
			if (contrasenia !== confirmarContrasenia) {
				return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
			}
			hashedPassword = await bcrypt.hash(contrasenia, 10);
		}

		// Construir la consulta dinámica
		let sql = `UPDATE usuarios SET 
			NOMBRE = ?, 
			NOMBRE_USUARIO = ?, 
			CORREO = ?, 
			ID_ROL = ?, 
			ID_SUCURSAL = ?`;

		const params = [nombre, nombreUsuario, correo, idRol || null, idSucursal || null];

		// Agregar la contraseña si se cambió
		if (hashedPassword) {
			sql += `, CONTRASENA = ?`;
			params.push(hashedPassword);
		}

		sql += ` WHERE ID = ?`;
		params.push(id);

		await pool.query(sql, params);

		return NextResponse.json({ message: "Usuario actualizado correctamente." });
	} catch (e) {
		console.error("Error al actualizar usuario:", e);
		return NextResponse.json(
			{ error: e.message || "Error interno del servidor." },
			{ status: 500 }
		);
	}
}

export async function DELETE(req) {
	try {
		const url = req.nextUrl;
		const id = url.searchParams.get('id');

		if (!id) {
			return NextResponse.json(
				{ error: "El ID del usuario es obligatorio." },
				{ status: 400 }
			);
		}

		// Verificar si el usuario existe
		const [userRows] = await pool.query("SELECT * FROM usuarios WHERE ID = ?", [id]);
		if (userRows.length === 0) {
			return NextResponse.json(
				{ error: "Usuario no encontrado." },
				{ status: 404 }
			);
		}

		// Cambiar estado a INACTIVO
		await pool.query("UPDATE usuarios SET ESTATUS = 'INACTIVO' WHERE ID = ?", [id]);

		return NextResponse.json({ message: "Usuario desactivado correctamente." });
	} catch (e) {
		console.error("Error al desactivar usuario:", e);
		return NextResponse.json(
			{ error: e.message || "Error interno del servidor." },
			{ status: 500 }
		);
	}
}
