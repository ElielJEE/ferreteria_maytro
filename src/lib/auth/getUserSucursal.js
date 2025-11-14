import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

// Devuelve { isAdmin, sucursalId, userId }
export async function getUserSucursalContext(req) {
  try {
    const token = req.cookies?.get?.('token')?.value ?? null;
    if (!token) return { isAdmin: false, sucursalId: null, userId: null };
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.id || decoded?.ID || decoded?.sub || null;
    if (!userId) return { isAdmin: false, sucursalId: null, userId: null };
    const [[row]] = await pool.query('SELECT ID_SUCURSAL FROM USUARIOS WHERE ID = ? LIMIT 1', [userId]);
    const sucursalId = row?.ID_SUCURSAL || null;
    return { isAdmin: sucursalId == null, sucursalId, userId };
  } catch {
    return { isAdmin: false, sucursalId: null, userId: null };
  }
}