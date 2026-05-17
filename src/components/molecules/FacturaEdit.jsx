"use client";
import React, { useEffect, useState } from "react";
import Input from "./Input";
import DropdownMenu from "./DropdownMenu";
import {
  CustomerService,
  ProductService,
  SalesService,
} from "@/services";
import { Button } from "../atoms";
import { FiTrash2 } from "react-icons/fi";

const parseNumber = (value) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

export default function FacturaEdit({ factura, onClose, onSave }) {
  const [clienteNombre, setClienteNombre] = useState(
    factura?.cliente?.nombre || factura?.cliente || "",
  );
  const [clientes, setClientes] = useState([]);
  const [clienteTelefono, setClienteTelefono] = useState(
    factura?.cliente?.telefono || factura?.telefono || "",
  );
  const [clienteFiltrados, setClienteFiltrados] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [unidadesPorProducto, setUnidadesPorProducto] = useState({});
  const [error, setError] = useState();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState(() =>
    Array.isArray(factura?.items || factura?.products)
      ? (factura?.items || factura?.products).map((it) => ({
          producto_id: it.producto_id || it.ID_PRODUCT || it.id || null,
          productName:
            it.producto_nombre || it.productoName || it.nombre || "",
          productCode: it.producto_codigo || it.productCode || it.codigo || "",
          cantidad: Number(it.cantidad || it.quantity || 0),
          unitPrice: Number(it.unitPrice ?? it.precio_unit ?? it.precio ?? 0),
          subtotal: Number(
            it.subtotal ?? Number(it.cantidad || it.quantity || 0) * Number(it.unitPrice ?? it.precio_unit ?? it.precio ?? 0),
          ),
          unidad_id: it.unidad_id || it.UNIDAD_ID || null,
          unidadMedida:
            it.unidad_nombre || it.UNIDAD_NOMBRE || it.unidadMedida || null,
          cantidad_por_unidad:
            Number(it.cantidad_por_unidad || it.CANTIDAD_POR_UNIDAD || 1) || 1,
        }))
      : [],
  );

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const clientesData = await CustomerService.getClientes();
        setClientes(clientesData.clientes);
      } catch (error) {
        console.error(error);
      }
    };
    fetchClientes();
  }, []);

  const handleClienteChange = (e) => {
    const value = e.target.value;
    setClienteNombre(value);

    const resultados = (clientes || []).filter((cliente) =>
      cliente.nombre.toLowerCase().includes(value.toLowerCase()),
    );
    setClienteFiltrados(resultados);

    const clienteExistente = (clientes || []).find(
      (cliente) => cliente.nombre.toLowerCase() === value.toLowerCase(),
    );
    if (clienteExistente) {
      setClienteTelefono(clienteExistente.telefono);
    } else {
      setClienteTelefono("");
    }
  };

  // Cargar productos
  useEffect(() => {
    const getProducts = async () => {
      try {
        const res = await ProductService.getProducts();
        const productsArray = Array.isArray(res) ? res : res?.productos || [];
        
        // Crear mapa de productos por ID
        const map = {};
        productsArray.forEach(prod => {
          map[prod.ID_PRODUCT] = prod;
        });
        setProductsMap(map);
        
        const opts = productsArray.map((prod) => ({
          label: `${prod.PRODUCT_NAME}`,
          value: prod,
        }));
        setProducts(opts);
      } catch (err) {
        console.error('Error loading products:', err);
      }
    };
    getProducts();
  }, []);

  // Precargar unidades para todos los productos en items - se ejecuta cuando items cambia
  useEffect(() => {
    const loadUnitsForItems = async () => {
      if (!items || items.length === 0) return;

      const productIds = items
        .filter(it => it.producto_id)
        .map(it => it.producto_id)
        .filter((id, idx, arr) => arr.indexOf(id) === idx);

      for (const prodId of productIds) {
        // Solo cargar si no está ya en caché
        if (unidadesPorProducto[prodId]) continue;

        try {
          const unidadesRes = await fetch(`/api/productos?type=unidades&id=${prodId}`);
          if (unidadesRes.ok) {
            const unidades = await unidadesRes.json();
            console.log(`Loaded ${unidades.length} units for product ${prodId}:`, unidades);
            setUnidadesPorProducto(prev => ({
              ...prev,
              [prodId]: unidades
            }));
          }
        } catch (err) {
          console.error(`Error loading units for product ${prodId}:`, err);
        }
      }
    };
    loadUnitsForItems();
  }, [items]);

  const handleProductChange = async (idx, selectedOption) => {
    const product = selectedOption?.value || selectedOption;
    if (!product || !product.ID_PRODUCT) return;

    let unidades = [];
    let defaultUnitPrice = Number(product.PRECIO || 0);
    let defaultUnidadId = null;
    let defaultUnidadNombre = null;
    let defaultCantidadPorUnidad = 1;

    // Cargar unidades del producto
    try {
      const unidadesRes = await fetch(`/api/productos?type=unidades&id=${product.ID_PRODUCT}`);
      if (unidadesRes.ok) {
        unidades = await unidadesRes.json();
        setUnidadesPorProducto(prev => ({
          ...prev,
          [product.ID_PRODUCT]: unidades
        }));

        // Buscar la unidad por defecto
        const defaultUnit = unidades.find(u => u.ES_POR_DEFECTO === 1 || u.es_por_defecto === 1);
        if (defaultUnit) {
          defaultUnitPrice = Number(defaultUnit.PRECIO || 0);
          defaultUnidadId = defaultUnit.UNIDAD_ID;
          defaultUnidadNombre = defaultUnit.NOMBRE;
          defaultCantidadPorUnidad = Number(defaultUnit.CANTIDAD_POR_UNIDAD || 1);
        }
      }
    } catch (err) {
      console.error('Error loading product units:', err);
    }

    // Actualizar el item con el producto seleccionado
    const cantidad = items[idx]?.cantidad || 0;
    setItems(prev =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              producto_id: product.ID_PRODUCT,
              productName: product.PRODUCT_NAME,
              productCode: product.CODIGO_PRODUCTO,
              unitPrice: defaultUnitPrice,
              unidad_id: defaultUnidadId,
              unidadMedida: defaultUnidadNombre,
              cantidad_por_unidad: defaultCantidadPorUnidad,
              subtotal: Number((Number(cantidad) * defaultUnitPrice).toFixed(2)),
            }
          : it
      )
    );
  };

  const handleUnidadChange = (idx, selectedOption) => {
    const unidad = selectedOption?.value || selectedOption;
    if (!unidad) return;

    const nuevoPrice = Number(unidad.PRECIO || 0);
    const cantidad = items[idx]?.cantidad || 0;

    setItems(prev =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              unidad_id: unidad.UNIDAD_ID || unidad.id,
              unidadMedida: unidad.NOMBRE || unidad.nombre,
              cantidad_por_unidad: Number(unidad.CANTIDAD_POR_UNIDAD || 1),
              unitPrice: nuevoPrice,
              subtotal: Number((Number(cantidad) * nuevoPrice).toFixed(2)),
            }
          : it
      )
    );
  };

  const handleCantidadChange = (idx, value) => {
    const val = Math.max(1, Number(value || 0));
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              cantidad: val,
              subtotal: Number((val * Number(it.unitPrice || 0)).toFixed(2)),
            }
          : it,
      ),
    );
  };

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      setError("");
      if (!items.length) {
        setError("La factura debe tener al menos un ítem");
        return;
      }
      const payloadItems = items.map((it) => ({
        ID_PRODUCT: it.producto_id,
        cantidad: Number(it.cantidad || 0),
        PRECIO: Number(it.unitPrice ?? it.precio_unit ?? 0),
        unit_id: it.unidad_id || null,
        unidad_id: it.unidad_id || null,
        UNIDAD_ID: it.unidad_id || null,
        unit_name: it.unidadMedida || null,
        unidad_nombre: it.unidadMedida || null,
        UNIDAD_NOMBRE: it.unidadMedida || null,
        cantidad_por_unidad: Number(it.cantidad_por_unidad || 1) || 1,
        CANTIDAD_POR_UNIDAD: Number(it.cantidad_por_unidad || 1) || 1,
      }));
      const subtotal = items.reduce(
        (acc, it) => acc + Number(it.unitPrice ?? it.precio_unit ?? it.precio ?? 0) * Number(it.cantidad || 0),
        0,
      );
      const descuento = parseNumber(factura?.descuento ?? factura?.DESCUENTO);
      const transporte = parseNumber(factura?.servicio_transporte ?? factura?.transporte ?? factura?.SERVICIO_TRANSPORTE ?? factura?.servicioTransporte);
      const total = Math.max(0, subtotal - descuento + transporte);
      const payloadCliente = {};
      if (clienteNombre?.trim()) payloadCliente.nombre = clienteNombre.trim();
      if (clienteTelefono?.trim()) payloadCliente.telefono = clienteTelefono.trim();
      
      // Log de depuración
      console.log('[FacturaEdit] Enviando items:', items);
      console.log('[FacturaEdit] Payload items:', payloadItems);
      
      setSaving(true);
      const res = await SalesService.updateSale({
        id: factura?.id || factura?.ID_FACTURA || null,
        items: payloadItems,
        subtotal: Number(subtotal.toFixed(2)),
        descuento,
        servicio_transporte: transporte,
        total: Number(total.toFixed(2)),
        cliente: payloadCliente,
      });
      setSaving(false);
      if (!res?.success) {
        setError(res?.message || "No se pudo guardar la factura");
        return;
      }
      if (onSave) onSave(res);
      else if (onClose) onClose();
    } catch (e) {
      setSaving(false);
      setError(e?.message || "Error al guardar");
    }
  };

  return (
    <>
      <div className="py-4 w-full max-h-[500px] overflow-y-scroll">
        <div className="mb-2 flex gap-4 w-full">
          <div>
            <Input
              label={"Nombre"}
              placeholder={"Ingrese nombre del cliente"}
              inputClass={"no icon"}
              value={clienteNombre}
              onChange={handleClienteChange}
            />
            {clienteFiltrados.length > 0 && clienteNombre !== "" && (
              <ul className="w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10">
                {clienteFiltrados.map((clientes, index) => (
                  <li
                    key={index}
                    onClick={() => {
                      setClienteNombre(clientes.nombre);
                      setClienteTelefono(clientes.telefono);
                      setClienteFiltrados([]);
                    }}
                    className="px-2 py-1 cursor-pointer hover:bg-primary hover:text-white"
                  >
                    {clientes.nombre}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Input
            label={"Telefono"}
            value={clienteTelefono}
            onChange={(e) => setClienteTelefono(e.target.value)}
            inputClass={"no icon"}
          />
        </div>

        <div className="mt-4">
          <div className="text-sm text-dark/70 mb-2">Items</div>
          <div className="flex flex-col gap-2">
            {(items || []).map((it, idx) => {
              const unidadesDisponibles = unidadesPorProducto[it.producto_id] || [];
              const unidadesOpts = unidadesDisponibles.map(u => ({
                label: `${u.NOMBRE || u.nombre}`,
                value: u
              }));
              const unidadesLoading = it.producto_id && unidadesDisponibles.length === 0;

              return (
                <div key={`item-${idx}-${it.producto_id}`}>
                  <div className="p-2 border border-dark/10 rounded-md flex md:flex-row flex-col justify-between md:min-w-[700px] gap-2">
                    <div className="flex flex-col w-1/10">
                      <div className="text-xs text-dark/60">Cantidad</div>
                      <Input
                        type={"number"}
                        value={it.cantidad}
                        onChange={(e) =>
                          handleCantidadChange(idx, e.target.value)
                        }
                        inputClass={"no icon"}
                      />
                    </div>
                    <div className="flex flex-col w-1/3" key={`unit-${idx}-${it.unidad_id}`}>
                      <div className="text-xs text-dark/60">Unidad de Medida {unidadesLoading && <span className="text-danger">⚠️</span>}</div>
                      <DropdownMenu
                        options={unidadesOpts}
                        defaultValue={it.unidadMedida || "Selecciona unidad"}
                        onChange={(opt) => handleUnidadChange(idx, opt)}
                      />
                      {unidadesLoading && (
                        <div className="text-xs text-danger mt-1">
                          Cargando unidades...
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col w-full" key={`product-${idx}-${it.producto_id}`}>
                      <div className="text-xs text-dark/60">Producto</div>
                      <DropdownMenu
                        options={products}
                        defaultValue={it.productName || "Selecciona producto"}
                        onChange={(opt) => handleProductChange(idx, opt)}
                      />
                    </div>
                    <div className="flex flex-col w-1/4">
                      <div className="text-xs text-dark/60">Precio Unitario</div>
                      <div className="font-semibold text-primary">
                        C${Number(it.unitPrice || 0).toLocaleString('es-ES')}
                      </div>
                    </div>
                    <div className="flex flex-col justify-end md:items-end">
                      <div className="text-xs text-dark/60">Subtotal</div>
                      <div className="font-semibold text-primary">
                        C$
                        {Number(
                          it.subtotal ??
                            Number(it.cantidad || 0) * Number(it.unitPrice || 0),
                        ).toLocaleString('es-ES')}
                      </div>
                      <div className="mt-2">
                        <Button
                          className={"danger"}
                          icon={<FiTrash2 />}
                          func={() => handleRemoveItem(idx)}
                        />
                      </div>
                    </div>
                  </div>
                  {error && <span className="text-danger text-sm">*{error}</span>}
                </div>
              );
            })}
            {(!items || items.length === 0) && (
              <div className="text-sm text-dark/60">
                Sin items para mostrar.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 bg-dark/5 rounded-lg flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-dark/70">Subtotal:</span>
            <span className="font-semibold">C${Number(items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0)).toLocaleString('es-ES')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark/70">Descuento:</span>
            <span className="font-semibold">C${(typeof factura?.descuento === "number" ? factura.descuento : factura?.DESCUENTO || 0).toLocaleString('es-ES')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark/70">Transporte:</span>
            <span className="font-semibold">C${(typeof factura?.servicio_transporte === "number" ? factura.servicio_transporte : factura?.transporte || 0).toLocaleString('es-ES')}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold border-t border-dark/20 pt-2">
            <span>Total:</span>
            <span className="text-primary">C${Number(items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0) - (typeof factura?.descuento === "number" ? factura.descuento : factura?.DESCUENTO || 0) + (typeof factura?.servicio_transporte === "number" ? factura.servicio_transporte : factura?.transporte || 0)).toLocaleString('es-ES')}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button className={"danger"} text={"Cancelar"} func={onClose} />
          <Button
            className={"success"}
            text={saving ? "Guardando…" : "Guardar Cambios"}
            func={saving ? undefined : handleSave}
          />
        </div>
      </div>
    </>
  );
}
