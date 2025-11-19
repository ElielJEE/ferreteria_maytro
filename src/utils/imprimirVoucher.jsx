'use client'

import { SalesService, CotizacionesService, CreditosService } from "@/services";
import { Flavors } from "next/font/google";

async function urlToBase64(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen: ${url}`);
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


export const imprimirVoucher = async (data) => {

  try {
    const qz = await import("qz-tray");
    await qz.websocket.connect();

    const printer = await qz.printers.find("POS-80C");
    const config = qz.configs.create(printer);

    const now = new Date();
    const fecha = now.toLocaleDateString();
    const hora = now.toLocaleTimeString();

    const { success, factura } = await SalesService.getSaleDetail(data.facturaId);

    console.log("Factura completa:", factura);

    const clienteNombre = factura.cliente?.nombre || "Consumidor Final";
    const sucursalNombre = factura.sucursal?.nombre || "Sucursal N/A";
    const usuarioNombre = factura.usuario?.nombre || "Vendedor N/A";

    // Formatear productos
    let lineasProductos = "";
    for (const item of factura.items) {
      lineasProductos += `${item.producto_nombre}\n`;
      const qty = item.cantidad;
      const precio = item.precio_unit.toFixed(2);
      const sub = item.subtotal.toFixed(2);
      const unidad = item.unidad_nombre ?? "";
      lineasProductos += ` ${qty} ${unidad} x C$${precio}   ->   C$${sub}\n`;
    }
    const imageUrl = "public/images/logo_thermal_bw.png";
    const base64Image = await urlToBase64(imageUrl);
    console.log(base64Image);


    const contenido = [
      "\x1B\x40", // Reset impresora

      // ENCABEZADO
      "\x1B\x61\x01",
      "FERRETERIA EL MAYTRO",
      "\x1B\x61\x00",
      `Sucursal: ${sucursalNombre}\n`,
      `Vendedor: ${usuarioNombre}\n`,
      `Cliente: ${clienteNombre}\n`,
      "------------------------------------------\n",

      // DATOS FACTURA
      `Factura: ${factura.numero}\n`,
      `Fecha: ${fecha}  ${hora}\n`,
      "------------------------------------------\n",

      // PRODUCTOS
      "ARTiCULOS:\n",
      lineasProductos,
      "------------------------------------------\n",

      // TOTALES
      `SUBTOTAL:  C$ ${factura.subtotal}\n`,
      `DESCUENTO: C$ ${factura.descuento}\n`,
      `TOTAL:     C$ ${factura.total}\n`,
      `PAGO:      C$ ${data.total + (data.cambio ?? 0)}\n`,
      `CAMBIO:    C$ ${data.cambio}\n`,
      "------------------------------------------\n",

      // MENSAJE FINAL
      "\x1B\x61\x01",
      "¡Gracias por su compra!\n",
      "Vuelva pronto\n",
      "'Encomienda a Jehova tus obras, y tus\n",
      "pensamientos serán afirmados.'\n",
      "Proverbios 16:3\n",
      "---------------------------------------------\n",

      "\n\n\n\n",

      "\x1D\x56\x00" // Corte
    ];

    console.log(contenido);

    await qz.print(config, contenido);
    await qz.websocket.disconnect();

  } catch (err) {
    console.error("Error imprimiendo voucher:", err);
  }
};

export const imprimirVoucherCotizacion = async (data) => {
  try {
    const qz = await import('qz-tray');
    await qz.websocket.connect();
    const printer = await qz.printers.find('POS-80C');
    const config = qz.configs.create(printer);

    const now = new Date();
    const fecha = now.toLocaleDateString();
    const hora = now.toLocaleTimeString();

    const { success, cotizacion } = await CotizacionesService.getQuoteDetail(data.quoteId || data.id);
    if (!success || !cotizacion) {
      console.error('No se encontró la cotización para imprimir');
      return;
    }

    const clienteNombre = cotizacion.cliente?.nombre || 'Consumidor Final';
    const sucursalNombre = cotizacion.sucursal?.name || (cotizacion.sucursal?.label || 'Sucursal N/A');
    const usuarioNombre = cotizacion.creadaPor || cotizacion.usuario?.nombre || 'Vendedor N/A';

    let lineasProductos = '';
    const items = cotizacion.items || cotizacion.products || [];
    for (const item of items) {
      lineasProductos += `${item.productName || item.producto_nombre || item.producto || ''}\n`;
      const qty = item.cantidad ?? item.qty ?? item.quantity ?? 0;
      const precio = Number(item.PRECIO ?? item.unitPrice ?? item.precio_unit ?? 0).toFixed(2);
      const computedSub = Number(qty) * Number(precio);
      const sub = Number(item.subtotal ?? item.SUB_TOTAL ?? computedSub).toFixed(2);
      const unidad = item.unidad || item.unidad_nombre || '';
      lineasProductos += ` ${qty} ${unidad} x C$${precio}   ->   C$${sub}\n`;
    }

    const contenido = [
      '\x1B\x40',
      '\x1B\x61\x01',
      'FERRETERIA El MAYTRO\n',
      '\x1B\x61\x00',
      `Sucursal: ${sucursalNombre}\n`,
      `Vendedor: ${usuarioNombre}\n`,
      `Cliente: ${clienteNombre}\n`,
      '------------------------------------------\n',
      `Cotizacion: ${cotizacion.id || cotizacion.numero || ''}\n`,
      `Fecha: ${fecha}  ${hora}\n`,
      `Valida hasta: ${cotizacion.fechaExp || cotizacion.fecha_vencimiento || ''}\n`,
      '------------------------------------------\n',
      'ARTÍCULOS:\n',
      lineasProductos,
      '------------------------------------------\n',
      `SUBTOTAL:  C$ ${cotizacion.subtotal ?? cotizacion.SUBTOTAL ?? 0}\n`,
      `DESCUENTO: C$ ${cotizacion.descuento ?? cotizacion.DESCUENTO ?? 0}\n`,
      `TOTAL:     C$ ${cotizacion.total ?? cotizacion.TOTAL ?? 0}\n`,
      '------------------------------------------\n',
      '\x1B\x61\x01',
      'Gracias por consultar nuestras ofertas\n',
      'Valido solo por el periodo indicado\n',
      '\n\n\n\n',
      '\x1D\x56\x00'
    ];

    await qz.print(config, contenido);
    await qz.websocket.disconnect();
  } catch (err) {
    console.error('Error imprimiendo cotizacion:', err);
  }
}

export const imprimirVoucherCredito = async (data) => {
  try {
    const qz = await import('qz-tray');
    await qz.websocket.connect();
    const printer = await qz.printers.find('POS-80C');
    const config = qz.configs.create(printer);

    const now = new Date();
    const fecha = now.toLocaleDateString();
    const hora = now.toLocaleTimeString();

    const id = data.creditId || data.id;
    const { success, credito, message } = CreditosService.getCreditDetail ? await CreditosService.getCreditDetail(id) : { success: false, message: 'No detail method' };
    if (!success || !credito) {
      console.error('No se encontró el crédito para imprimir', message);
      return;
    }

    const clienteNombre = (credito.cliente && (credito.cliente.nombre || credito.cliente)) || 'Consumidor Final';
    const sucursalNombre = credito.sucursal?.label || credito.sucursal || 'Sucursal N/A';
    const usuarioNombre = credito.hecho_por || credito.usuario || 'Vendedor N/A';

    let lineasProductos = '';
    const items = credito.items || [];
    for (const item of items) {
      lineasProductos += `${item.productName || item.producto_nombre || ''}\n`;
      const qty = item.cantidad ?? item.qty ?? 0;
      const precio = Number(item.unitPrice ?? item.precio_unit ?? 0).toFixed(2);
      const sub = Number(item.subtotal ?? 0).toFixed(2);
      const unidad = item.unidad || item.unidad_nombre || '';
      lineasProductos += ` ${qty} ${unidad} x C$${precio}   ->   C$${sub}\n`;
    }

    const contenido = [
      '\x1B\x40',
      '\x1B\x61\x01',
      'FERRETERIA EL MAYTRO - CREDITO\n',
      '\x1B\x61\x00',
      `Sucursal: ${sucursalNombre}\n`,
      `Vendedor: ${usuarioNombre}\n`,
      `Cliente: ${clienteNombre}\n`,
      '------------------------------------------\n',
      `Credito: ${credito.id || credito.numero || ''}\n`,
      `Fecha: ${fecha}  ${hora}\n`,
      '------------------------------------------\n',
      'ARTÍCULOS:\n',
      lineasProductos,
      '------------------------------------------\n',
      `DEUDA INICIAL:  C$ ${credito.deuda_inicial ?? credito.deudaInicio ?? credito.DEUDA_INICIAL ?? 0}\n`,
      `DEUDA ACTUAL:   C$ ${credito.deuda_actual ?? credito.deudaActual ?? credito.DEUDA_ACTUAL ?? 0}\n`,
      '------------------------------------------\n',
      '\x1B\x61\x01',
      'Información de pago disponible en sistema\n',
      '-----------------------------------------\n',
      '\n\n\n\n\n',
      '\x1D\x56\x00'
    ];

    await qz.print(config, contenido);
    await qz.websocket.disconnect();
  } catch (err) {
    console.error('Error imprimiendo credito:', err);
  }
}
