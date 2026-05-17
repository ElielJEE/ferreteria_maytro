import React, { useMemo, useState } from "react";
import { Button } from "../atoms";
import { FiShoppingBag } from "react-icons/fi";
import { SalesService } from "@/services";

const parseNumber = (value) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

export default function FacturaView({ factura, onClose, onProcess, onCancel }) {
  const [canceling, setCanceling] = useState(false);
  
  // Deshabilitar si ya fue procesada o está cancelada
  const disableProcess =
    (factura?.estado &&
      ["cancelado"].includes(String(factura.estado).toLowerCase())) ||
    false;

  const isCanceled = factura?.estado && String(factura.estado).toLowerCase() === "cancelado";
  const isConfirmed = factura?.estado && String(factura.estado).toLowerCase() === "confirmado";
  const canProcess = !isCanceled && !isConfirmed;

  const items = Array.isArray(factura?.items)
    ? factura.items
    : Array.isArray(factura?.products)
      ? factura.products
      : [];

  const clienteNombre =
    factura?.cliente?.nombre || factura?.cliente || "Consumidor Final";
  const clienteTelefono =
    factura?.cliente?.telefono || factura?.telefono || "N/A";
  const fecha = factura?.fecha
    ? new Date(factura.fecha).toLocaleDateString()
    : "";
  const sucursalNombre =
    factura?.sucursal?.nombre || factura?.sucursal?.name || factura?.sucursal ||
    "N/A";
  const vendedor =
    factura?.usuario?.nombre || factura?.creadaPor || factura?.hecho_por ||
    "N/A";
  const estado = factura?.estado
    ? String(factura.estado)
      .charAt(0)
      .toUpperCase() + String(factura.estado).slice(1)
    : "Pendiente";
  const referencia = factura?.numero || factura?.id || "";
  const subtotalValue = parseNumber(
    factura?.subtotal ?? factura?.SUBTOTAL
  );
  const descuentoValue = parseNumber(
    factura?.descuento ?? factura?.discount?.amount ?? factura?.DESCUENTO
  );
  const transporteValue = parseNumber(
    factura?.servicio_transporte ?? factura?.transporte ?? factura?.SERVICIO_TRANSPORTE ?? factura?.servicioTransporte
  );

  return (
    <div className="py-4">
      <div className="grid grid-cols-3 gap-4 border-b border-dark/10">
        <div className="mb-2 flex flex-col">
          <div className="text-dark/70 font-semibold">Cliente</div>
          <div className="font-semibold">{clienteNombre}</div>
        </div>
        <div className="mb-2 flex flex-col">
          <div className="text-dark/70 font-semibold">Telefono</div>
          <div className="font-semibold">{clienteTelefono}</div>
        </div>
        <div className="mb-2 flex flex-col">
          <div className="text-dark/70 font-semibold">Fecha</div>
          <div className="font-semibold">{fecha}</div>
        </div>
        <div className="mb-2 flex flex-col">
          <div className="text-dark/70 font-semibold">Sucursal</div>
          <div className="font-semibold">{sucursalNombre}</div>
        </div>
        <div className="mb-2 flex flex-col">
          <div className="text-dark/70 font-semibold">Vendedor</div>
          <div className="font-semibold">{vendedor}</div>
        </div>
        <div className="mb-2 flex flex-col">
          <div className="text-dark/70 font-semibold">Estado</div>
          <div className="font-semibold">{estado}</div>
        </div>
        <div className="mb-2 flex flex-col">
          <div className="text-dark/70 font-semibold">Codigo de Referencia</div>
          <div className="font-semibold">{referencia}</div>
        </div>
      </div>
      <div className="mb-2">
        <div className="mt-1">
          {items.length ? (
            <div className="w-2xl overflow-y-scroll max-h-[200px]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left border-b border-dark/20">
                    <th className="p-2 text-center">Cantidad</th>
                    <th className="p-2">Código</th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">
                      Unidad
                      <br />
                      de Medida
                    </th>
                    <th className="p-2 text-center">Precio</th>
                    <th className="p-2 text-center">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-dark/10">
                      <td className="p-2 text-center">
                        {it.cantidad ?? it.qty ?? "-"}
                      </td>
                      <td className="p-2">
                        {it.producto_codigo || it.codigo || "-"}
                      </td>
                      <td className="p-2">
                        {it.producto_nombre || it.nombre || "-"}
                      </td>
                      <td className="p-2">
                        {(() => {
                          const unidadNombre =
                            it.unidad ||
                            it.unit ||
                            it.unidad_nombre ||
                            it.unit_name ||
                            it.UNIDAD_NOMBRE ||
                            it.measureUnit ||
                            it.unidadMedida ||
                            it.unidad_nombre ||
                            "-";
                          return (
                            <div className="flex flex-col">
                              <span>{unidadNombre}</span>
                              {Number(
                                it.cantidad_por_unidad ||
                                it.CANTIDAD_POR_UNIDAD ||
                                0,
                              ) !== 0 &&
                                Number(
                                  it.cantidad_por_unidad ||
                                  it.CANTIDAD_POR_UNIDAD ||
                                  1,
                                ) !== 1 && (
                                  <small className="text-dark/50">
                                    x {Number(
                                      it.cantidad_por_unidad ||
                                      it.CANTIDAD_POR_UNIDAD,
                                    ).toString()} por unidad
                                  </small>
                                )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-2 text-center">
                        {"C$ " +
                          Number(it.precio_unit || it.precio || 0).toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        {"C$ " +
                          Number(
                            (it.cantidad ?? it.qty ?? 0) *
                              (it.precio_unit || it.precio || 0),
                          ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm">Sin items detallados</div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-col">
        <div className="flex justify-between">
          <div className="text-md font-semibold">Subtotal:</div>
          <div className="text-md font-semibold">
            {typeof subtotalValue === "number"
              ? `C$ ${subtotalValue.toFixed(2)}`
              : "-"}
          </div>
        </div>
        <div className="flex justify-between">
          <div className="text-md font-semibold">Descuento:</div>
          <div className="text-md font-semibold">
            {typeof descuentoValue === "number"
              ? `C$ ${Number(descuentoValue || 0).toFixed(2)}`
              : "-"}
          </div>
        </div>
        <div className="flex justify-between">
          <div className="text-md font-semibold">Transporte:</div>
          <div className="text-md font-semibold">
            {typeof transporteValue === "number"
              ? `C$ ${Number(transporteValue || 0).toFixed(2)}`
              : "-"}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-between gap-5 border-t border-dark/10 pt-2">
        <div className="text-lg font-bold">Total:</div>
        <div className="text-lg font-bold text-primary">
          {factura.total
            ? `C$ ${Number(factura.total).toLocaleString()}`
            : factura.total_venta
              ? `C$ ${Number(factura.total_venta).toLocaleString()}`
              : "-"}
        </div>
      </div>
      <div className="mt-4 flex gap-4">
        <Button
          text={"Cerrar"}
          className={"secondary"}
          func={() => onClose()}
        />
        {canProcess && (
          <Button
            text={canceling ? "Cancelando..." : "Cancelar Venta"}
            className={"dark"}
            disabled={canceling}
            func={async () => {
              setCanceling(true);
              try {
                const result = await SalesService.cancelSale(factura.id || factura.numero);
                if (result.success) {
                  if (typeof onCancel === "function") {
                    onCancel(factura);
                  }
                  onClose();
                } else {
                  alert("Error: " + (result.message || "No se pudo cancelar la factura"));
                }
              } catch (error) {
                console.error("Error cancelando factura:", error);
                alert("Error al cancelar la factura");
              } finally {
                setCanceling(false);
              }
            }}
          />
        )}
        {canProcess && (
          <Button
            text={"Procesar Venta"}
            icon={<FiShoppingBag />}
            className={"success"}
            func={() => {
              if (typeof onProcess === "function")
                onProcess(factura);
            }}
          />
        )}
      </div>
    </div>
  );
}
