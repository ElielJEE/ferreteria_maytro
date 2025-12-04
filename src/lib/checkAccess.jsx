import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function checkAccess(req) {
    try {
        const { roleId, path } = await req.json();

        if (!roleId || !path) {
            return NextResponse.json(
                { allowed: false, message: "Datos incompletos" },
                { status: 400 }
            );
        }

        const [rows] = await pool.query(
            `
      SELECT p.path
      FROM rol_permisos rp
      INNER JOIN permisos p ON rp.permiso_id = p.idpermisos
      WHERE rp.rol_id = ? AND ? LIKE CONCAT(p.path, '%')
      LIMIT 1
      `,
            [roleId, path]
        );

        const allowed = rows.length > 0;

        return NextResponse.json({ allowed });
    } catch (error) {
        console.error("Error en check-access:", error);
        return NextResponse.json({ allowed: false }, { status: 500 });
    }
}
