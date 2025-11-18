import imprimirVoucher from '@/utils/imprimirVoucher';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const data = req.body;

  try {
    await imprimirVoucher(data);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error imprimiendo voucher:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
