import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const [rows] = await pool.query("SELECT * FROM descuentos WHERE ESTADO != 'Eliminado' ORDER BY FECHA_CREACION DESC");

		return NextResponse.json(rows, { status: 200 });
	} catch (error) {
		console.error("Error al obtener los descuentos:", error);
		return NextResponse.json(
			{ error: "Error al obtener los descuentos" },
			{ status: 500 }
		);
	}
}

export async function POST(req) {
	const conn = await pool.getConnection();
	try {
		const body = await req.json();
		const {
			codigo_descuento,
			nombre_descuento,
			valor_porcentaje,
			descripcion = "",
			estado = "Activo",
		} = body || {};

		// Validaciones básicas
		if (!codigo_descuento || !nombre_descuento || valor_porcentaje == null) {
			return NextResponse.json(
				{ error: "Código, nombre y valor del descuento son requeridos." },
				{ status: 400 }
			);
		}

		// Inserción
		const [result] = await conn.query(
			`INSERT INTO descuentos 
        (CODIGO_DESCUENTO, NOMBRE_DESCUENTO, VALOR_PORCENTAJE, DESCRIPCION, ESTADO) 
       VALUES (?, ?, ?, ?, ?)`,
			[codigo_descuento, nombre_descuento, valor_porcentaje, descripcion, estado]
		);

		// Obtenemos el nuevo registro creado
		const [newDiscount] = await conn.query(
			"SELECT * FROM descuentos WHERE ID_DESCUENTO = ?",
			[result.insertId]
		);

		return NextResponse.json(newDiscount[0], { status: 201 });
	} catch (error) {
		console.error("Error al crear el descuento:", error);
		return NextResponse.json(
			{ error: "Error al crear el descuento." },
			{ status: 500 }
		);
	} finally {
		conn.release();
	}
}

export async function PUT(req) {
	const conn = await pool.getConnection();
	try {
		const body = await req.json();
		const { id, codigo_descuento, nombre_descuento, valor_porcentaje, descripcion = "" } = body;

		if (!id || !codigo_descuento || !nombre_descuento || valor_porcentaje == null) {
			return NextResponse.json({ error: "ID, código, nombre y valor son requeridos." }, { status: 400 });
		}

		await conn.query(
			`UPDATE descuentos
       SET CODIGO_DESCUENTO = ?, NOMBRE_DESCUENTO = ?, VALOR_PORCENTAJE = ?, DESCRIPCION = ?
       WHERE ID_DESCUENTO = ?`,
			[codigo_descuento, nombre_descuento, valor_porcentaje, descripcion, id]
		);

		const [updated] = await conn.query("SELECT * FROM descuentos WHERE ID_DESCUENTO = ?", [id]);
		return NextResponse.json(updated[0], { status: 200 });
	} catch (error) {
		console.error("Error al actualizar descuento:", error);
		return NextResponse.json({ error: "Error al actualizar el descuento." }, { status: 500 });
	} finally {
		conn.release();
	}
}

export async function PATCH(req) {
	const conn = await pool.getConnection();
	try {
		const body = await req.json();
		const { id, estado } = body;

		if (!id || !["Activo", "Inactivo"].includes(estado)) {
			return NextResponse.json({ error: "ID y estado válido son requeridos." }, { status: 400 });
		}

		await conn.query("UPDATE descuentos SET ESTADO = ? WHERE ID_DESCUENTO = ?", [estado, id]);

		const [updated] = await conn.query("SELECT * FROM descuentos WHERE ID_DESCUENTO = ?", [id]);
		return NextResponse.json(updated[0], { status: 200 });
	} catch (error) {
		console.error("Error al cambiar estado del descuento:", error);
		return NextResponse.json({ error: "Error al cambiar el estado." }, { status: 500 });
	} finally {
		conn.release();
	}
}

export async function DELETE(req) {
	const conn = await pool.getConnection();
	try {
		const body = await req.json();
		console.log("🧠 BODY RECIBIDO EN DELETE:", body);
		const { id } = body;

		if (!id) {
			return NextResponse.json({ error: "ID es requerido." }, { status: 400 });
		}

		await conn.query("UPDATE descuentos SET ESTADO = 'Eliminado' WHERE ID_DESCUENTO = ?", [id]);
		return NextResponse.json({ message: "Descuento eliminado (soft delete) correctamente." }, { status: 200 });
	} catch (error) {
		console.error("Error al eliminar descuento:", error);
		return NextResponse.json({ error: "Error al eliminar el descuento." }, { status: 500 });
	} finally {
		conn.release();
	}
}