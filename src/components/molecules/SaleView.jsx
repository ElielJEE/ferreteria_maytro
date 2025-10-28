"use client"
import React from 'react'

export default function SaleView({ sale, onClose }) {
	if (!sale) return (
		<div className='py-4'>No hay información de la venta.</div>
	)
	return (
		<div className='py-4'>
			<div className='grid grid-cols-2 gap-4 border-b border-dark/10'>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Cliente</div>
					<div className='font-semibold'>{sale.cliente?.nombre || 'Consumidor Final'}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Telefono</div>
					<div className='font-semibold'>{sale.cliente?.telefono || 'N/A'}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Fecha</div>
					<div className='font-semibold'>{sale?.fecha ? new Date(sale.fecha).toLocaleDateString() : ''}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Hora</div>
					<div className='font-semibold'>{sale?.fecha ? new Date(sale.fecha).toLocaleTimeString() : ''}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Sucursal</div>
					<div className='font-semibold'>{sale?.sucursal.nombre}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Vendedor</div>
					<div className='font-semibold'>{sale?.usuario.nombre}</div>
				</div>
			</div>
			<div className='mb-2'>
				<div className='mt-1'>
					{Array.isArray(sale.items) && sale.items.length ? (
						<div className='w-2xl'>
							<table className='w-full border-collapse text-sm'>
								<thead>
									<tr className='text-left border-b border-dark/20'>
										<th className='p-2 text-center'>Cantidad</th>
										<th className='p-2'>Código</th>
										<th className='p-2'>Nombre</th>
										<th className='p-2'>Unidad<br />de Medida</th>
										<th className='p-2 text-center'>Precio</th>
										<th className='p-2 text-center'>Subtotal</th>
									</tr>
								</thead>
								<tbody>
									{sale.items.map((it, i) => (
										<tr key={i} className='border-b border-dark/10'>
											<td className='p-2 text-center'>{it.cantidad ?? it.qty ?? '-'}</td>
											<td className='p-2'>{it.codigo || it.producto_codigo || it.sku || '-'}</td>
											<td className='p-2'>{it.producto_nombre || it.producto || '-'}</td>
											<td className='p-2'>{it.unidad || it.unit || '-'}</td>
											<td className='p-2 text-center'>{"C$ " + Number(it.precio_unit || it.precio || 0).toLocaleString()}</td>
											<td className='p-2 text-center'>{"C$ " + Number(it.subtotal || it.cantidad * (it.precio_unit || it.precio || 0)).toLocaleString()}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className='text-sm'>Sin items detallados</div>
					)}
				</div>
			</div>
			<div className='mt-4 flex flex-col'>
				<div className='flex justify-between'>
					<div className='text-md font-semibold'>Subtotal:</div>
					<div className='text-md font-semibold'>{sale.subtotal ? `C$ ${Number(sale.subtotal).toLocaleString()}` : (sale.total_venta ? `C$${Number(sale.total_venta).toLocaleString()}` : '-')}</div>
				</div>
				<div className='flex justify-between'>
					<div className='text-md font-semibold'>Descuento:</div>
					<div className='text-md font-semibold'>{sale.descuento === 0 ? "N/A" : sale.descuento}</div>
				</div>
			</div>
			<div className='mt-4 flex justify-between gap-5 border-t border-dark/10 pt-2'>
				<div className='text-lg font-bold'>Total:</div>
				<div className='text-lg font-bold text-primary'>{sale.total ? `C$ ${Number(sale.total).toLocaleString()}` : (sale.total_venta ? `C$${Number(sale.total_venta).toLocaleString()}` : '-')}</div>
			</div>
		</div>
	)
}
