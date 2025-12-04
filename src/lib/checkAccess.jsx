import { pool } from "@/lib/db";

export async function checkAccess({ roleId, path }) {
  try {
    if (!roleId || !path) {
      return { allowed: false };
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

    return { allowed: rows.length > 0 };
  } catch (error) {
    console.error("Error en check-access:", error);
    return { allowed: false };
  }
}
