"use client"
import React from 'react'

export default function SaleView({ sale, onClose }) {
	if (!sale) return (
		<div className='py-4'>No hay información de la venta.</div>
	)
	console.log(sale);
	return (
		<div className='py-4'>
			<div className='grid grid-cols-2 gap-4'>
				<div className='mb-2 flex gap-2'>
					<div className='font-semibold'>Nombre:</div>
					<div className='font-semibold'>{sale?.cliente?.nombre || sale?.cliente_nombre || sale?.cliente || '-'}</div>
				</div>
				<div className='mb-2 flex gap-2'>
					<div className='font-semibold'>Fecha:</div>
					<div className='font-semibold'>{sale?.fecha || sale?.fecha_venta || '-'}</div>
				</div>
				<div className='mb-2 flex gap-2'>
					<div className='font-semibold'>Sucursal:</div>
					<div className='font-semibold'>{sale?.sucursal?.nombre || sale?.sucursal || '-'}</div>
				</div>
				<div className='mb-2 flex gap-2'>
					<div className='font-semibold'>Vendedor:</div>
					<div className='font-semibold'>{sale?.usuario?.nombre || sale?.hecho_por || sale?.vendedor || '-'}</div>
				</div>
			</div>
			<div className='mb-2'>
				<div className='mt-1'>
					{Array.isArray(sale.items) && sale.items.length ? (
						<div className='w-full overflow-x-auto'>
							<table className='w-full border-collapse text-sm'>
								<thead>
									<tr className='text-left border-b border-dark/20'>
										<th className='p-2'>Cantidad</th>
										<th className='p-2'>Código</th>
										<th className='p-2'>Nombre</th>
										<th className='p-2'>Unidad</th>
										<th className='p-2 text-right'>Precio</th>
										<th className='p-2 text-right'>Subtotal</th>
									</tr>
								</thead>
								<tbody>
									{sale.items.map((it, i) => (
										<tr key={i} className='border-b border-dark/10'>
											<td className='p-2 align-top'>{it.cantidad ?? it.qty ?? '-'}</td>
											<td className='p-2 align-top'>{it.codigo || it.producto_codigo || it.sku || '-'}</td>
											<td className='p-2 align-top'>{it.producto_nombre || it.producto || '-'}</td>
											<td className='p-2 align-top'>{it.unidad || it.unit || '-'}</td>
											<td className='p-2 align-top text-center'>{Number(it.precio_unit || it.precio || 0).toLocaleString()}</td>
											<td className='p-2 align-top text-center'>{Number(it.subtotal || it.cantidad * (it.precio_unit || it.precio || 0)).toLocaleString()}</td>
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
			<div className='mt-4 flex justify-end gap-5'>
				<div className='text-lg font-semibold'>Total C$:</div>
				<div className='text-lg font-semibold'>{
					sale?.total != null
						? Number(sale.total).toLocaleString()
						: (sale?.total_venta != null ? Number(sale.total_venta).toLocaleString() : '-')
				}</div>
			</div>
		</div>
	)
}
