'use client'

export const imprimirVoucher = async (data) => {
    try {
        // 1. pedir permiso para conectar la impresora
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        const encoder = new TextEncoder();
        const writer = port.writable.getWriter();

        // FECHA Y HORA
        const now = new Date();
        const fecha = now.toLocaleDateString();
        const hora = now.toLocaleTimeString();

        // CONTENIDO ESC/POS
        let ticket = "";

        ticket += "\x1B\x40";                    // Reset
        ticket += "\x1B\x61\x01";                // Centro
        ticket += "INVENTARIO & FACTURACIÓN\n";
        ticket += "Sucursal Principal\n";
        ticket += "Tel: 0000-0000\n";
        ticket += "------------------------------------------\n";

        ticket += "\x1B\x61\x00";                // Izquierda
        ticket += `Factura: ${data.numero}\n`;
        ticket += `ID: ${data.facturaId}\n`;
        ticket += `Fecha: ${fecha} ${hora}\n`;
        ticket += "------------------------------------------\n";

        ticket += `TOTAL:       C$ ${data.total}\n`;
        ticket += `PAGO:        C$ ${data.total + (data.cambio ?? 0)}\n`;
        ticket += `CAMBIO:      C$ ${data.cambio}\n`;
        ticket += "------------------------------------------\n";

        ticket += "\x1B\x61\x01";
        ticket += "¡Gracias por su compra!\n";
        ticket += "\n\n\n\n";

        ticket += "\x1D\x56\x00";                // CORTAR PAPEL

        // 2. enviar datos a la impresora
        await writer.write(encoder.encode(ticket));

        // 3. cerrar conexión
        writer.releaseLock();
        await port.close();

    } catch (err) {
        console.error("Error imprimiendo via Serial:", err);
    }
};
