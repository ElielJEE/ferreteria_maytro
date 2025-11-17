'use strict';

import { Network, Printer } from 'escpos';

// Conexión por TCP/IP
const printerIP = '192.168.123.100'; // IP de tu impresora
const printerPort = 9100;             // Puerto TCP estándar de impresoras POS

const device = new Network(printerIP, printerPort);
const printer = new Printer(device);

/**
 * data: {
 *   numero: string,
 *   facturaId: number,
 *   total: number,
 *   cambio: number
 * }
 */
async function imprimirVoucher(data) {
  return new Promise((resolve, reject) => {
    device.open((err) => {
      if (err) return reject(err);

      const now = new Date();
      const fecha = now.toLocaleDateString();
      const hora = now.toLocaleTimeString();

      printer
        .encode('CP860') // Para acentos
        .align('CT')
        .text("*** FACTURA ***")
        .text("INVENTARIO & FACTURACIÓN")
        .text("-------------------------------")
        .align('LT')
        .text(`Factura #: ${data.numero}`)
        .text(`ID: ${data.facturaId}`)
        .text(`Fecha: ${fecha} ${hora}`)
        .text(`Total: C$ ${data.total}`)
        .text(`Pago:  C$ ${data.total + (data.cambio ?? 0)}`)
        .text(`Cambio: C$ ${data.cambio ?? 0}`)
        .text("-------------------------------")
        .align('CT')
        .text("¡Gracias por su compra!")
        .cut()
        .close(() => resolve(true));
    });
  });
}

export default { imprimirVoucher };
