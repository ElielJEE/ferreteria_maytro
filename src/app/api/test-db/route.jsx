import pool from "@/lib/db";

export default async function handler(req, res) {
  try {
    const [tables] = await pool.query("SHOW TABLES;");
    res.status(200).json({ tables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
