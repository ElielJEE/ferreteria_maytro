import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
	try {
		const { rolId, permisosId } = await req.json();

		if (!rolId || !Array.isArray(permisosId) || permisosId.length === 0) {
			return NextResponse.json(
				{ message: "rolId y permisosId son requeridos y permisosId debe ser un array no vacío" },
				{ status: 400 }
			);
		}

		// Primero, eliminamos permisos anteriores para evitar duplicados
		await pool.query("DELETE FROM rol_permisos WHERE rol_id = ?", [rolId]);

		// Insertar nuevos permisos
		const values = permisosId.map(pid => [rolId, pid]);
		await pool.query("INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ?", [values]);

		return NextResponse.json({ message: "Permisos asignados correctamente", rolId, permisosId });
	} catch (error) {
		console.error("Error al asignar permisos:", error);
		return NextResponse.json(
			{ message: "Error al asignar permisos", error: error.message },
			{ status: 500 }
		);
	}
}

export async function PUT(req) {
	try {
		const { rolId, permisosId } = await req.json();

		if (!rolId || !Array.isArray(permisosId)) {
			return NextResponse.json(
				{ message: "rolId y permisosId son requeridos y permisosId debe ser un array" },
				{ status: 400 }
			);
		}

		// Verificar que el rol exista
		const [rolExist] = await pool.query("SELECT * FROM ROL WHERE ID_ROL = ?", [rolId]);
		if (rolExist.length === 0) {
			return NextResponse.json({ message: "El rol no existe" }, { status: 404 });
		}

		// Eliminar permisos anteriores
		await pool.query("DELETE FROM rol_permisos WHERE rol_id = ?", [rolId]);

		// Insertar los nuevos permisos si hay
		if (permisosId.length > 0) {
			const values = permisosId.map(pid => [rolId, pid]);
			await pool.query("INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ?", [values]);
		}

		return NextResponse.json({
			message: "Permisos del rol actualizados correctamente",
			rolId,
			permisosId,
		});
	} catch (error) {
		console.error("Error al actualizar permisos del rol:", error);
		return NextResponse.json(
			{ message: "Error al actualizar permisos del rol", error: error.message },
			{ status: 500 }
		);
	}
}
