"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button, InfoCard, ModalContainer, SwitchButton } from "../atoms";
import { Card, FacturaEdit, FacturaView, Input, QueoteView, QuoteEdit } from "../molecules";
import {
  FiEdit,
  FiEye,
  FiFileText,
  FiPrinter,
  FiSearch,
  FiUser,
} from "react-icons/fi";
import { BsBuilding } from "react-icons/bs";
import { useActive, useIsMobile } from "@/hooks";

export default function FacturasOrg() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isMobile = useIsMobile({ breakpoint: 1024 });
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const { isActiveModal, setIsActiveModal } = useActive();
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);
  const [mode, setMode] = useState("");
  const [selectedFactura, setSelectedFactura] = useState(null);

  const toggleModalMode = (mode, factura) => {
    setMode(mode);
    setSelectedFactura(factura);
    setIsActiveModal(true);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [
      {
        id: "VEN-001",
        fecha: "2024-06-01",
        cliente: "Juan Perez",
        telefono: "555-1234",
        items: 3,
        total: 1500,
        fechaExp: "2024-06-15",
        estado: "activa",
        creadaPor: "Admin",
        sucursal: { name: "Sucursal Central" },
        subtotal: 1200,
        descuento: 100,
        transporte: 50,
        products: [
          {
            id: "PROD-001",
            codigo: "PROD-001",
            nombre: "Producto A",
            unidadMedida: "Unidad",
            cantidad: 2,
            precio: 500,
          },
          {
            id: "PROD-002",
            codigo: "PROD-002",
            nombre: "Producto B",
            unidadMedida: "Caja",
            cantidad: 1,
            precio: 200,
          },
        ],
      },
      {
        id: "VEN-001",
        fecha: "2024-06-01",
        cliente: "Juan Perez",
        telefono: "555-1234",
        items: 3,
        total: 1500,
        fechaExp: "2024-06-15",
        estado: "cancelada",
        creadaPor: "Admin",
        sucursal: { name: "Sucursal Central" },
        subtotal: 1200,
        descuento: 100,
        transporte: 50,
        products: [
          {
            id: "PROD-001",
            codigo: "PROD-001",
            nombre: "Producto A",
            unidadMedida: "Unidad",
            cantidad: 2,
            precio: 500,
          },
          {
            id: "PROD-002",
            codigo: "PROD-002",
            nombre: "Producto B",
            unidadMedida: "Caja",
            cantidad: 1,
            precio: 200,
          },
        ],
      },
    ];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (q) =>
          (q.id || "").toLowerCase().includes(term) ||
          (q.cliente || "").toLowerCase().includes(term) ||
          (q.telefono || "").toLowerCase().includes(term) ||
          (q.creadaPor || "").toLowerCase().includes(term),
      );
    }
    if (filterDate) {
      list = list.filter((q) => String(q.fecha) === filterDate);
    }
    return list;
  }, [search, filterDate]);

  const handleFacturaProcess = (factura) => {
    console.log("Procesar factura", factura);
    // Aquí puedes agregar la lógica para procesar la factura
  };

	const handleFacturaSaved = (factura) => {
		console.log("Factura guardada", factura);
		// Aquí puedes agregar la lógica para actualizar la lista de facturas después de guardar
	}

  return (
    <>
      <div className="p-6 flex flex-col gap-4">
        <section className="grid md:grid-cols-4 grid-cols-1">
          <InfoCard
            CardTitle={"Total"}
            cardValue={String(4)}
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
                /* value={search}
                onChange={(e) => setSearch(e.target.value)} */
                iconInput={
                  <FiSearch className="absolute left-3 top-3 h-5 w-5 text-dark/50" />
                }
              />
            </div>
            <Input
              type={"date"}
              inputClass={"no icon"}
              /* value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)} */
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
                        <td className="p-2 text-center">{item.id}</td>
                        <td className="p-2">{item.fecha}</td>
                        <td className="p-2 flex flex-col">
                          <span>{item.cliente}</span>
                          <span className="text-sm text-dark/60">
                            {item.telefono}
                          </span>
                        </td>
                        <td className="p-2 text-center">{item.items}</td>
                        <td className="p-2 text-primary">C$ {item.total}</td>
                        <td className="p-2">
                          <span
                            className={`${item.estado === "activa" ? "bg-success" : "bg-dark"} text-light rounded-full px-2 text-sm`}
                          >
                            {item.estado.charAt(0).toUpperCase() +
                              item.estado.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 truncate">
                            <FiUser />
                            {item.creadaPor}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 truncate text-dark/70">
                            <BsBuilding />
                            {item.sucursal.name}
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
                              disabled={item.estado === "cancelada"}
                            />
                            <Button
                              disabled={item.estado === "cancelada"}
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
                          /* disabled={isExpired(item)} */
                        />
                        <Button
                          className={"success"}
                          text={"Imprimir"}
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
    </>
  );
}
