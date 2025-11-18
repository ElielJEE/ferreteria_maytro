import { imprimirVoucher } from '@/utils/imprimirVoucher';

export async function POST(req) {
  try {
    const data = await req.json();
    await imprimirVoucher(data);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("Error imprimiendo voucher:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
}
