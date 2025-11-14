import CreditosServer from '@/services/CreditosServer';

export async function POST(req) {
  try {
    const body = await req.json();
    const res = await CreditosServer.payCredit(body);
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: e?.message || 'Error al registrar pago' }, { status: 400 });
  }
}
