"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button, InfoCard, ModalContainer, SwitchButton } from "../atoms";
import { Card, FacturaEdit, FacturaView, Input, QueoteView, QuoteEdit } from "../molecules";
import { SalesService } from "@/services";
import { imprimirVoucher } from "@/utils/imprimirVoucher";
import {
  FiEdit,
  FiEye,
  FiFileText,
  FiPrinter,
  FiSearch,
  FiUser,
  FiX,
  FiCheck,
} from "react-icons/fi";
import { BsBuilding } from "react-icons/bs";
import { useActive, useIsMobile } from "@/hooks";
import { BsCashCoin } from "react-icons/bs";
import { FiDollarSign } from "react-icons/fi";

export default function FacturasOrg() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [facturas, setFacturas] = useState([]);
  const isMobile = useIsMobile({ breakpoint: 1024 });
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const { isActiveModal, setIsActiveModal } = useActive();
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);
  const [mode, setMode] = useState("");
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [montoCordobas, setMontoCordobas] = useState("");
  const [montoDolares, setMontoDolares] = useState("");
  const [tasaCambio, setTasaCambio] = useState(36.55);
  const [cambio, setCambio] = useState(0);
  const [paymentError, setPaymentError] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const totalValue = Number(selectedFactura?.total || 0);
    const received = Number(montoCordobas || 0) + Number(montoDolares || 0) * Number(tasaCambio || 36.55);
    const change = received - totalValue;
    setCambio(change > 0 ? Number(change.toFixed(2)) : 0);
  }, [montoCordobas, montoDolares, tasaCambio, selectedFactura]);

  const toggleModalMode = async (mode, factura) => {
    setMode(mode);
    setSelectedFactura(factura);
    if ((mode === "ver" || mode === "edit") && factura?.id) {
      const { success, factura: detalle } = await SalesService.getSaleDetail(factura.id);
      if (success && detalle) {
        setSelectedFactura(detalle);
      }
    }
    setIsActiveModal(true);
  };

  const parseFacturaDate = (value) => {
    if (!value) return new Date(0);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const dateParts = trimmed.split('/');
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }
      const timestamp = Date.parse(trimmed);
      return isNaN(timestamp) ? new Date(0) : new Date(timestamp);
    }
    if (value instanceof Date) return value;
    return new Date(value);
  };

  const loadFacturas = async () => {
    setLoading(true);
    try {
      const res = await SalesService.getSalesHistory();
      const facturasData = Array.isArray(res?.ventas) ? res.ventas : Array.isArray(res) ? res : [];
      const mappedFacturas = facturasData.map((item) => ({
        ...item,
        estado: (item.estado || item.ESTADO || 'Pendiente').toString().trim(),
        items: item.items ?? item.cantidad_productos ?? 0,
        telefono: item.telefono || item.TELEFONO || '',
        sucursal: typeof item.sucursal === 'string' ? item.sucursal : item.sucursal?.name || item.sucursal?.nombre || 'Sin sucursal',
        cliente: item.cliente || item.cliente?.nombre || 'Consumidor Final',
        creadaPor: item.hecho_por || item.creado_por || item.creadaPor || '',
      }));
      const sortedFacturas = mappedFacturas.sort((a, b) => parseFacturaDate(b.fecha) - parseFacturaDate(a.fecha));
      setFacturas(sortedFacturas);
    } catch (err) {
      console.error('Error cargando facturas:', err);
      setFacturas([]);
      setError('No se pudieron cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacturas();
  }, []);

  const filtered = useMemo(() => {
    let list = Array.isArray(facturas) ? facturas : [];
    if (!mostrarCanceladas) {
      list = list.filter((fact) => {
        const estado = String(fact.estado || '').toLowerCase().trim();
        return estado !== 'cancelado';
      });
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (q) =>
          (q.id || '').toString().toLowerCase().includes(term) ||
          (q.numero || '').toString().toLowerCase().includes(term) ||
          (q.cliente || '').toLowerCase().includes(term) ||
          (q.telefono || '').toLowerCase().includes(term) ||
          (q.creadaPor || '').toLowerCase().includes(term) ||
          (q.hecho_por || '').toLowerCase().includes(term),
      );
    }
    if (filterDate) {
      list = list.filter((q) => String(q.fecha || '').startsWith(filterDate));
    }
    return list;
  }, [facturas, search, filterDate, mostrarCanceladas]);

  const handleFacturaProcess = (factura) => {
    setSelectedFactura(factura);
    setMontoCordobas("");
    setMontoDolares("");
    setPaymentError("");
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    const totalValue = Number(selectedFactura?.total || 0);
    const recibidoCordobas = parseFloat(montoCordobas || 0);
    const recibidoDolares = parseFloat(montoDolares || 0);
    const montoTotal = recibidoCordobas + recibidoDolares * Number(tasaCambio || 36.55);

    if (montoTotal < totalValue) {
      setPaymentError("Monto no válido: el monto recibido es menor al total de la compra.");
      return;
    }

    setPaymentError("");
    setProcessingPayment(true);
    try {
      const payload = {
        id: selectedFactura.id,
        estado: "Confirmado",
        pago: {
          cordobas: recibidoCordobas,
          dolares: recibidoDolares,
          tasaCambio: Number(tasaCambio || 36.55),
        },
      };
      const result = await SalesService.updateSale(payload);
      if (!result.success) {
        setPaymentError("Error al procesar la factura: " + (result.message || "No se pudo procesar la venta"));
        return;
      }
      await imprimirVoucher({ facturaId: selectedFactura.id, total: selectedFactura.total || 0, cambio });
      await loadFacturas();
      setShowSuccessModal(true);
      setShowPaymentModal(false);
    } catch (error) {
      console.error("Error procesando factura:", error);
      setPaymentError("Error al procesar la factura");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFacturaCanceled = async (factura) => {
    console.log("Factura cancelada", factura);
    // Actualizar el estado en memoria inmediatamente
    setFacturas(prevFacturas => 
      prevFacturas.map(f => 
        f.id === factura.id ? { ...f, estado: 'Cancelado' } : f
      )
    );
    // Luego recargar desde la BD
    await loadFacturas();
    setIsActiveModal(false);
  };

  const handleFacturaSaved = async (factura) => {
    console.log("Factura guardada", factura);
    await loadFacturas();
    setIsActiveModal(false);
  };

  return (
    <>
      <div className="p-6 flex flex-col gap-4">
        <section className="grid md:grid-cols-4 grid-cols-1">
          <InfoCard
            CardTitle={"Total facturas"}
            cardValue={String(facturas.length)}
            cardIcon={<FiFileText className="h-5 w-5 text-primary" />}
            cardIconColor={"primary"}
          />
        </section>
        <section className="p-6 border border-dark/20 rounded-lg flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h2 className="md:text-2xl font-semibold">
                Gestion de Facturas
              </h2>
              <span className="text-sm md:text-medium text-dark/50">
                Administra facturas para clientes.
              </span>
            </div>
            <SwitchButton
              text={"Mostrar Canceladas"}
              onToggle={setMostrarCanceladas}
            />
          </div>
          <div className="flex gap-2 w-full">
            <div className="w-[100%]">
              <Input
                type={"search"}
                placeholder={"Buscar facturas..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                iconInput={
                  <FiSearch className="absolute left-3 top-3 h-5 w-5 text-dark/50" />
                }
              />
            </div>
            <Input
              type={"date"}
              inputClass={"no icon"}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div>
            {loading ? (
              <div className="p-4 text-sm">Cargando facturas...</div>
            ) : error ? (
              <div className="p-4 text-danger text-sm">{error}</div>
            ) : !isMobile ? (
              <div className="w-full overflow-x-auto rounded-lg border border-dark/20 mt-2">
                <table className="w-full border-collapse">
                  <thead className=" w-full border-b border-dark/20">
                    <tr className="w-full">
                      <th className="text-start text-dark/50 font-semibold p-2">
                        ID
                      </th>
                      <th className="text-start text-dark/50 font-semibold p-2">
                        Fecha
                      </th>
                      <th className="text-start text-dark/50 font-semibold p-2">
                        Cliente
                      </th>
                      <th className="text-center text-dark/50 font-semibold p-2">
                        Productos
                      </th>
                      <th className="text-start text-dark/50 font-semibold p-2">
                        Total
                      </th>
                      <th className="text-start text-dark/50 font-semibold p-2">
                        Estado
                      </th>
                      <th className="text-start text-dark/50 font-semibold p-2">
                        Creado por
                      </th>
                      <th className="text-start text-dark/50 font-semibold p-2">
                        Sucursal
                      </th>
                      <th className="text-center text-dark/50 font-semibold p-2">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="w-full">
                    {filtered.map((item, index) => (
                      <tr
                        key={index}
                        className={`${!mostrarCanceladas ? item.estado === "cancelada" && "hidden" : ""} text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3`}
                      >
                        <td className="p-2 text-center">{item.numero || item.id}</td>
                        <td className="p-2">{item.fecha}</td>
                        <td className="p-2 flex flex-col">
                          <span>{item.cliente}</span>
                          <span className="text-sm text-dark/60">
                            {item.telefono || "N/A"}
                          </span>
                        </td>
                        <td className="p-2 text-center">{item.items ?? 0}</td>
                        <td className="p-2 text-primary">C$ {Number(item.total || 0).toLocaleString()}</td>
                        <td className="p-2">
                          <span
                            className={`${String(item.estado || 'Pendiente').toLowerCase() === "cancelado" ? "bg-danger" : String(item.estado || 'Pendiente').toLowerCase() === "pendiente" ? 'bg-success' : 'bg-blue'} text-light rounded-full px-2 text-sm`}
                          >
                            {String(item.estado || 'Pendiente')}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 truncate">
                            <FiUser />
                            {item.hecho_por || item.creadaPor || "N/A"}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 truncate text-dark/70">
                            <BsBuilding />
                            {item.sucursal || "Sin sucursal"}
                          </div>
                        </td>
                        <td className="p-2 flex justify-center items-center">
                          <div className="flex gap-2 justify-center w-1/2">
                            <Button
                              className={"primary"}
                              icon={<FiEye />}
                              func={() => toggleModalMode("ver", item)}
                            />
                            <Button
                              className={"blue"}
                              icon={<FiEdit />}
                              func={() => toggleModalMode("edit", item)}
                              disabled={["cancelado", "confirmado"].includes(String(item.estado || '').toLowerCase())}
                            />
                            <Button
                              disabled={["cancelado", "confirmado"].includes(String(item.estado || '').toLowerCase())}
                              className={"success"}
                              icon={<FiPrinter />}
                              func={async () => {
                                try {
                                  const mod =
                                    await import("@/utils/imprimirVoucher");
                                  if (mod && mod.imprimirVoucherfactura)
                                    mod.imprimirVoucherfactura({
                                      quoteId: item.id,
                                    });
                                } catch (e) {
                                  console.error("Print error", e);
                                }
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filtered.map((item, index) => (
                  <div
                    key={index}
                    /* className={`${!mostrarExpirados ? item.estado === "expirada" && "hidden" : ""}`} */
                  >
                    <Card
                      productName={item.cliente || "Consumidor Final"}
                      status={item.estado}
                      id={item.id}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-dark/70">Productos</span>
                        <span className="text-lg font-semibold">
                          {item.items}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-dark/70">Total</span>
                        <div className="text-lg font-semibold">
                          {item.total
                            ? `C$${Number(item.total).toLocaleString()}`
                            : item.total_venta
                              ? `C$${Number(item.total_venta).toLocaleString()}`
                              : "-"}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-dark/70">Fecha</span>
                        <span className="text-lg font-semibold">
                          {item.fecha}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-dark/70">
                          Valida Hasta
                        </span>
                        <span className="text-lg font-semibold">
                          {item.fechaExp}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-dark/70">Creado por</span>
                        <span className="text-lg font-semibold">
                          {item.creadaPor}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-dark/70">Sucursal</span>
                        <span className="text-lg font-semibold">
                          {item.sucursal.name}
                        </span>
                      </div>
                      <div className="w-full flex justify-between items-center gap-2 mt-4 col-span-2">
                        <Button
                          className={"primary"}
                          text={"Ver"}
                          icon={<FiEye />}
                          func={() => toggleModalMode("ver", item)}
                        />
                        <Button
                          className={"blue"}
                          text={"Editar"}
                          icon={<FiEdit />}
                          func={() => toggleModalMode("edit", item)}
                          disabled={["cancelado", "confirmado"].includes(String(item.estado || '').toLowerCase())}
                        />
                        <Button
                          className={"success"}
                          text={"Imprimir"}
                          icon={<FiPrinter />}
                          disabled={["cancelado", "confirmado"].includes(String(item.estado || '').toLowerCase())}
                          func={async () => {
                            try {
                              const mod =
                                await import("@/utils/imprimirVoucher");
                              if (mod && mod.imprimirVoucherfactura)
                                mod.imprimirVoucherfactura({
                                  quoteId: item.id,
                                });
                            } catch (e) {
                              console.error("Print error", e);
                            }
                          }}
                        />
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      {isActiveModal && (
        <ModalContainer
          setIsActiveModal={setIsActiveModal}
          modalTitle={
            mode === "ver"
              ? "Detalles de factura"
              : mode === "edit"
                ? "Editar factura"
                : mode === "eliminar"
                  ? "Eliminar venta"
                  : ""
          }
          modalDescription={
            mode === "ver"
              ? "Información completa de la factura."
              : mode === "edit"
                ? "Editar factura"
                : mode === "eliminar"
                  ? "Eliminar venta"
                  : ""
          }
          isForm={mode === "edit" ? true : false}
        >
          {mode === "ver" && (
            <FacturaView
              factura={selectedFactura}
              onClose={() => setIsActiveModal(false)}
              onProcess={handleFacturaProcess}
              onCancel={handleFacturaCanceled}
            />
          )}
          {mode === "edit" && (
            <FacturaEdit
              factura={selectedFactura}
              onClose={() => setIsActiveModal(false)}
              onSave={handleFacturaSaved}
            />
          )}
        </ModalContainer>
      )}
      {showPaymentModal && selectedFactura && (
        <ModalContainer
          setIsActiveModal={() => setShowPaymentModal(false)}
          modalTitle={"Procesar Venta"}
          modalDescription={"Ingresa el monto recibido para procesar la venta"}
          isForm={true}
        >
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-dark/10">
              <div className="flex justify-between mb-2">
                <span className="text-dark/70">Total:</span>
                <span className="font-bold text-primary">C$ {Number(selectedFactura?.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-dark/70">Recibido:</span>
                <span className="font-bold">C$ {(Number(montoCordobas || 0) + Number(montoDolares || 0) * Number(tasaCambio || 36.55)).toFixed(2)}</span>
              </div>
              <div className="border-t border-dark/10 pt-2 flex justify-between">
                <span className="text-dark/70">Cambio:</span>
                <span className="font-bold text-success">C$ {cambio.toFixed(2)}</span>
              </div>
            </div>
            
            <Input
              label={"Monto recibido en Cordobas"}
              placeholder={"Ingresar monto recibido en cordobas..."}
              iconInput={<BsCashCoin className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
              value={montoCordobas}
              onChange={(e) => setMontoCordobas(e.target.value)}
            />
            
            <Input
              label={"Monto recibido en Dolares"}
              placeholder={"Ingresar monto recibido en dolares..."}
              iconInput={<FiDollarSign className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
              value={montoDolares}
              onChange={(e) => setMontoDolares(e.target.value)}
            />
            
            {paymentError && (
              <div className="p-2 rounded-lg bg-danger/10 text-danger text-sm">
                {paymentError}
              </div>
            )}
            
            <div className="flex gap-4 pt-4">
              <Button
                className={'danger'}
                text={'Cancelar'}
                func={() => {
                  setShowPaymentModal(false);
                  setPaymentError('');
                  setMontoCordobas('');
                  setMontoDolares('');
                }}
              />
              <Button
                className={'success'}
                text={processingPayment ? 'Procesando...' : 'Confirmar Venta'}
                disabled={processingPayment}
                func={handleProcessPayment}
              />
            </div>
          </div>
        </ModalContainer>
      )}
      {showSuccessModal && (
        <ModalContainer
          setIsActiveModal={() => {
            setShowSuccessModal(false);
            setIsActiveModal(false);
          }}
          modalTitle={"¡Venta Completada!"}
          modalDescription={"La venta ha sido procesada y registrada correctamente"}
          isForm={false}
        >
          <div className="flex flex-col items-center justify-center gap-4 py-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
              <FiCheck className="w-8 h-8 text-success" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-dark">Venta Procesada Correctamente</p>
              <p className="text-sm text-dark/70 mt-1">El voucher ha sido enviado a la impresora</p>
            </div>
            <Button
              className={'success'}
              text={'Confirmar'}
              func={() => {
                setShowSuccessModal(false);
                setIsActiveModal(false);
              }}
            />
          </div>
        </ModalContainer>
      )}
    </>
  );
}
