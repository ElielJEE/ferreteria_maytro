"use client"
import React, { useState } from 'react'
import { SalesService } from '@/services'
import { Button } from '../atoms'

export default function SaleDelete({ sale, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)

  const remove = async () => {
    try {
      setLoading(true)
      if (SalesService && typeof SalesService.deleteSale === 'function') {
        await SalesService.deleteSale(sale.id || sale.codigo)
      } else {
        await fetch(`/api/ventas/${sale.id || sale.codigo}`, { method: 'DELETE' })
      }
      onDeleted && onDeleted()
      onClose && onClose()
    } catch (err) {
      console.error('Error deleting sale:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='py-4'>
      <div className='mb-4'>
        <div className='text-lg font-semibold'>¿Eliminar venta?</div>
        <div className='text-sm text-dark/70 mt-1'>Esta acción es irreversible. Se eliminará la venta: <span className='font-semibold'>{sale?.id || sale?.codigo || '-'}</span></div>
      </div>
      <div className='flex gap-2'>
        <Button className={'danger'} text={loading ? 'Eliminando...' : 'Eliminar'} func={remove} />
        <Button className={'none'} text={'Cancelar'} func={onClose} />
      </div>
    </div>
  )
}
