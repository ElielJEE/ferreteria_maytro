import CreditosServer from '@/services/CreditosServer';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const body = await req.json();
    let usuarioId = null;
    try {
      const token = req.cookies?.get?.('token')?.value ?? null;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        usuarioId = decoded?.id || decoded?.ID || decoded?.userId || decoded?.user_id || null;
      }
    } catch (_) { /* ignore auth errors */ }
    const res = await CreditosServer.payCredit({ ...body, usuarioId });
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: e?.message || 'Error al registrar pago' }, { status: 400 });
  }
}
