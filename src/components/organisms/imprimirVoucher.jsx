'use client'

export const imprimirVoucher = async (data) => {
	try {
		const qz = await import("qz-tray");
		await qz.websocket.connect();

		const printer = await qz.printers.find("POS-80");
		const config = qz.configs.create(printer);

		const now = new Date();
		const fecha = now.toLocaleDateString();
		const hora = now.toLocaleTimeString();

		const contenido = [
			"\n",
			"       *** FACTURA ***\n",
			"   INVENTARIO & FACTURACIÓN\n",
			"-------------------------------\n",
			`FACTURA #: ${data.numero}\n`,
			`ID: ${data.facturaId}\n`,
			`FECHA: ${fecha} ${hora}\n`,
			"-------------------------------\n",
			`TOTAL: C$ ${data.total}\n`,
			`PAGO: C$ ${data.total + (data.cambio ?? 0)}\n`,
			`CAMBIO: C$ ${data.cambio}\n`,
			"-------------------------------\n",
			"     ¡Gracias por su compra!\n",
			"\n\n\n"
		];

		await qz.print(config, contenido);

		await qz.websocket.disconnect();
	} catch (err) {
		console.error("Error imprimiendo voucher:", err);
	}
};