"use client"
import React, { useEffect, useState } from 'react'
import { SalesService, ProductService } from '@/services'
import { Button } from '../atoms'
import Input from './Input'
import DropdownMenu from './DropdownMenu'
import { FiTrash, FiTrash2 } from 'react-icons/fi'

export default function SaleEdit({ sale, onClose, onSaved }) {
  const [cliente, setCliente] = useState(sale?.cliente.nombre || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState(() => {
    if (!Array.isArray(sale?.items)) return []
    return sale.items.map(it => ({
      ...it,
      cantidad: Number(it.cantidad ?? it.qty ?? 0),
      precio_unit: Number(it.precio_unit ?? it.precio ?? 0)
    }))
  })
  const [productsOptions, setProductsOptions] = useState([])
  console.log(sale);

  useEffect(() => {
    let mounted = true
    ProductService.getProducts().then(p => {
      if (!mounted) return
      const list = Array.isArray(p) ? p : (p.productos || p.data || [])
      const opts = list.map(prod => ({ label: `${prod.PRODUCT_NAME}`, value: prod }))
      console.log(list);
      setProductsOptions(opts)
    }).catch(err => console.error('Error loading products for edit:', err))
    return () => { mounted = false }
  }, [])

  const updateItemQty = (index, qty) => {
    setItems(prev =>
      prev.map((it, i) => {
        if (i !== index) return it

        const cantidad = Number(qty)
        const precio = Number(it.precio_unit || it.precio || 0)

        // 🧠 Verificar stock disponible
        const stockDisponible = Number(it.stock || it.STOCK || it.existencias || 0)

        if (stockDisponible > 0 && cantidad > stockDisponible) {
          setError(`La cantidad (${cantidad}) excede el stock disponible (${stockDisponible}) para "${it.producto_nombre || it.producto}".`)
          return it // No actualizar la cantidad si excede stock
        }

        setError(null) // limpiar error si ahora es válido
        return {
          ...it,
          cantidad,
          subtotal: cantidad * precio
        }
      })
    )
  }



  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const replaceProduct = (index, productObj) => {
    const prod = productObj && productObj.value ? productObj.value : productObj
    if (!prod) return
    setItems(prev =>
      prev.map((it, i) => {
        if (i !== index) return it
        const precio_unit = Number(prod.PRECIO ?? prod.precio ?? it.precio_unit ?? 0)
        const cantidad = Number(it.cantidad || 0)
        return {
          ...it,
          producto_nombre: prod.NOMBRE || prod.producto || prod.nombre || it.producto_nombre,
          producto_codigo: prod.CODIGO || prod.codigo || prod.sku || it.producto_codigo,
          precio_unit,
          unidad: prod.UNIDAD || prod.unidad || it.unidad || 'u',
          subtotal: cantidad * precio_unit
        }
      })
    )
  }

  const save = async () => {
    setLoading(true)
    setError(null)

    try {
      const total = items.reduce((sum, it) => sum + Number(it.subtotal || 0), 0)
      console.log(items);
      const payload = {
        ...sale,
        cliente_nombre: cliente,
        items,
        total
      }

      let response

      if (SalesService && typeof SalesService.updateSale === 'function') {
        response = await SalesService.updateSale(payload)
      } else {
        throw new Error('El servicio de actualización no está disponible')
      }

      // 🔍 Manejar error devuelto por el backend
      if (!response?.success) {
        const backendError = response?.message || response?.error || 'Error desconocido al guardar la venta.'
        setError(backendError)
        return // ⚠️ Salir antes de cerrar el modal o refrescar
      }

      // ✅ Si todo fue bien
      onSaved && onSaved() // Esto refresca la lista general
      onClose && onClose() // Cierra el modal

    } catch (err) {
      console.error('Error saving sale:', err)
      setError(err?.message || 'Ocurrió un error inesperado al guardar la venta.')
    } finally {
      setLoading(false)
    }
  }

  console.log("desde SalesEdit:" + error);
  return (
    <div className='py-4'>
      <div className='mb-2'>
        <div className='text-sm text-dark/70'>Editar cliente</div>
        <Input
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          inputClass={'no icon'}
        />
      </div>

      <div className='mt-4'>
        <div className='text-sm text-dark/70 mb-2'>Items</div>
        <div className='flex flex-col gap-2'>
          {items.map((it, idx) => (
            <div key={idx}>
              <div className='p-2 border border-dark/10 rounded-md flex justify-between gap-2'>
                <div className='flex flex-col w-1/10'>
                  <div className='text-xs text-dark/60'>Cantidad</div>
                  <Input
                    type={'number'}
                    value={it.cantidad}
                    onChange={(e) => updateItemQty(idx, e.target.value)}
                    inputClass={'no icon'}
                  />
                </div>
                <div className='flex flex-col'>
                  <div className='text-xs text-dark/60'>Producto</div>
                  <DropdownMenu
                    options={productsOptions}
                    defaultValue={it.producto_nombre || it.producto || ''}
                    onChange={(v) => replaceProduct(idx, typeof v === 'object' ? v.value || v : v)}
                  />
                </div>
                <div className='flex flex-col'>
                  <div className='text-xs text-dark/60'>Precio</div>
                  <div className='font-semibold'>C${Number(it.precio_unit || it.precio || 0).toLocaleString()}</div>
                </div>
                <div className='flex flex-col justify-end items-end'>
                  <div className='text-xs text-dark/60'>Subtotal</div>
                  <div className='font-semibold'>C${Number(it.subtotal).toLocaleString()}</div>
                  <div className='mt-2'>
                    <Button className={'danger'} icon={<FiTrash2 />} func={() => removeItem(idx)} />
                  </div>
                </div>
              </div>
              {error && <span className='text-danger text-sm'>*{error}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className='flex gap-2 mt-4'>
        <Button className={'danger'} text={'Cancelar'} func={onClose} />
        <Button className={'success'} text={loading ? 'Guardando...' : 'Guardar Cambios'} func={save} />
      </div>
    </div>
  )
}
