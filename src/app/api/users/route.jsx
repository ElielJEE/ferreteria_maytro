import { pool } from "@/lib/db";

export async function GET(req, res) {
	try {
		const [rows] = await pool.query("SELECT username FROM users LIMIT 1");

		if (rows.length === 0) {
			return res.status(404).json({ message: "No se encontro ningun usuario." });
		}

		return res.status(200).json({ username: rows[0].username })

	} catch (error) {
		console.error("Error al obtener usuario:", error)
		return res.status(500).json({ message: "Error en el servidor." });
	}
}	