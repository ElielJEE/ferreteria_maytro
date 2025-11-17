export function buildVoucher(data) {
	return `
\x1B\x40
============================
        FACTURA
============================
Factura: ${data.numero}
ID: ${data.facturaId}
Total: C$ ${data.total}
Pago:  C$ ${data.total + data.cambio}
Cambio:C$ ${data.cambio}
============================

Gracias por su compra!
\n\n\n
`;
}
