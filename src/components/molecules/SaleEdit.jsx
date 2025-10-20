"use client"
import React, { useState } from 'react'
import { SalesService } from '@/services'
import { Button } from '../atoms'
import Input from './Input'

export default function SaleEdit({ sale, onClose, onSaved }) {
  const [cliente, setCliente] = useState(sale?.cliente_nombre || sale?.cliente || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    try {
      setLoading(true)
      const payload = { ...sale, cliente_nombre: cliente }
      if (SalesService && typeof SalesService.updateSale === 'function') {
        await SalesService.updateSale(payload)
      } else {
        // fallback: call API
        await fetch(`/api/ventas/${sale.id || sale.codigo}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      onSaved && onSaved()
      onClose && onClose()
    } catch (err) {
      console.error('Error saving sale:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='py-4'>
      <div className='mb-2'>
        <div className='text-sm text-dark/70'>Editar cliente</div>
        <Input value={cliente} onChange={(e) => setCliente(e.target.value)} />
      </div>
      <div className='flex gap-2 mt-4'>
        <Button className={'primary'} text={loading ? 'Guardando...' : 'Guardar'} func={save} />
        <Button className={'none'} text={'Cancelar'} func={onClose} />
      </div>
    </div>
  )
}
