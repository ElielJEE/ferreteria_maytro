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
		const roles = await Promise.all((rows || []).map(async (r) => {
			const [permisos] = await pool.query(
				`SELECT p.idpermisos AS id, p.permisos_name AS nombre
				FROM rol_permisos rp
				JOIN permisos p ON rp.permiso_id = p.idpermisos
				WHERE rp.rol_id = ?`,
				[r.ID_ROL]
			);

			return {
				id: r.ID_ROL,
				rol: r.ROL_NAME || '',
				descripcion: r.ROL_DESCRIPTION || '',
				permisos, // <-- aquí agregas los permisos
			};
		}));

		return NextResponse.json({ roles });
	} catch (e) {
		return NextResponse.json({ error: e.message || 'Error al obtener roles' }, { status: 500 });
	}
}

export async function POST(req) {
	try {
		const { rol, descripcion } = await req.json();

		// Validaciones básicas
		if (!rol || rol.trim() === "") {
			return NextResponse.json(
				{ message: "El nombre del rol es obligatorio." },
				{ status: 400 }
			);
		}

		// Verificar si ya existe un rol con ese nombre
		const [existing] = await pool.query(
			"SELECT ID_ROL FROM ROL WHERE ROL_NAME = ?",
			[rol.trim()]
		);
		if (existing.length > 0) {
			return NextResponse.json(
				{ message: "Ya existe un rol con ese nombre." },
				{ status: 409 }
			);
		}

		// Insertar nuevo rol
		const [result] = await pool.query(
			"INSERT INTO ROL (ROL_NAME, ROL_DESCRIPTION) VALUES (?, ?)",
			[rol.trim(), descripcion || null]
		);

		// Retornar el rol creado
		return NextResponse.json(
			{
				message: "Rol creado correctamente.",
				rol: {
					id: result.insertId,
					rol: rol.trim(),
					descripcion: descripcion || "",
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error al crear rol:", error);
		return NextResponse.json(
			{ message: "Error al crear rol.", error: error.message },
			{ status: 500 }
		);
	}
}

export async function PUT(req) {
	try {
		const { id, rol, descripcion } = await req.json();

		// Validaciones
		if (!id) {
			return NextResponse.json({ message: "El ID del rol es obligatorio." }, { status: 400 });
		}
		if (!rol || rol.trim() === "") {
			return NextResponse.json({ message: "El nombre del rol es obligatorio." }, { status: 400 });
		}

		// Verificar que el rol exista
		const [existingRole] = await pool.query("SELECT * FROM ROL WHERE ID_ROL = ?", [id]);
		if (existingRole.length === 0) {
			return NextResponse.json({ message: "El rol no existe." }, { status: 404 });
		}

		// Verificar que no haya otro rol con el mismo nombre
		const [conflict] = await pool.query(
			"SELECT ID_ROL FROM ROL WHERE ROL_NAME = ? AND ID_ROL != ?",
			[rol.trim(), id]
		);
		if (conflict.length > 0) {
			return NextResponse.json({ message: "Ya existe otro rol con ese nombre." }, { status: 409 });
		}

		// Actualizar rol
		await pool.query(
			"UPDATE ROL SET ROL_NAME = ?, ROL_DESCRIPTION = ? WHERE ID_ROL = ?",
			[rol.trim(), descripcion || null, id]
		);

		return NextResponse.json({
			message: "Rol actualizado correctamente.",
			rol: {
				id,
				rol: rol.trim(),
				descripcion: descripcion || "",
			},
		});
	} catch (error) {
		console.error("Error al actualizar rol:", error);
		return NextResponse.json({ message: "Error al actualizar rol.", error: error.message }, { status: 500 });
	}
}

export async function DELETE(req) {
	try {
		const { id } = await req.json();

		if (!id) {
			return NextResponse.json({ message: "El ID del rol es obligatorio." }, { status: 400 });
		}

		const [usersWithRole] = await pool.query(
			"SELECT ID FROM USUARIOS WHERE ID_ROL = ?",
			[id]
		);

		if (usersWithRole.length > 0) {
			return NextResponse.json(
				{ message: "No se puede eliminar este rol porque hay usuarios asignados a él." },
				{ status: 400 }
			);
		}

		// Verificar que el rol exista
		const [existingRole] = await pool.query("SELECT * FROM ROL WHERE ID_ROL = ?", [id]);
		if (existingRole.length === 0) {
			return NextResponse.json({ message: "El rol no existe." }, { status: 404 });
		}

		// Eliminar rol
		await pool.query("DELETE FROM ROL WHERE ID_ROL = ?", [id]);

		return NextResponse.json({ message: "Rol eliminado correctamente.", id });
	} catch (error) {
		console.error("Error al eliminar rol:", error);
		return NextResponse.json({ message: "Error al eliminar rol.", error: error.message }, { status: 500 });
	}
}