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

export async function PUT(req) {
	try {
		const body = await req.json();
		const { id, nombre, telefono, direccion } = body;

		if (!id) {
			return NextResponse.json({ error: "El ID del cliente es requerido." }, { status: 400 });
		}
		if (!nombre || !telefono || !direccion) {
			return NextResponse.json({ error: "Faltan datos obligatorios (nombre, teléfono o dirección)." }, { status: 400 });
		}

		const sql = `
			UPDATE CLIENTES
			SET 
				NOMBRE_CLIENTE = ?, 
				TELEFONO_CLIENTE = ?, 
				DIRECCION_CLIENTE = ?
			WHERE ID_CLIENTES = ?
		`;

		const [result] = await pool.query(sql, [nombre, telefono, direccion, id]);

		if (result.affectedRows === 0) {
			return NextResponse.json({ error: "Cliente no encontrado o sin cambios." }, { status: 404 });
		}

		return NextResponse.json({ message: "Cliente actualizado correctamente." });
	} catch (e) {
		console.error("Error al actualizar cliente:", e);
		return NextResponse.json({ error: e.message || "Error interno del servidor." }, { status: 500 });
	}
}

export async function DELETE(req) {
	try {
		const url = req.nextUrl;
		const id = url.searchParams.get('id');

		if (!id) {
			return NextResponse.json({ error: "El ID del cliente es requerido." }, { status: 400 });
		}

		const [result] = await pool.query(`DELETE FROM CLIENTES WHERE ID_CLIENTES = ?`, [id]);

		if (result.affectedRows === 0) {
			return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
		}

		return NextResponse.json({ message: "Cliente eliminado correctamente." });
	} catch (e) {
		console.error("Error al eliminar cliente:", e);
		return NextResponse.json({ error: e.message || "Error interno del servidor." }, { status: 500 });
	}
}