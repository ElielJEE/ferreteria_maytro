import React from 'react'
import { Button } from '../atoms';
import { FiRefreshCcw } from 'react-icons/fi';

export default function CreditosView({ creditData, onClose }) {
	console.log(creditData);

	return (
		<div className='py-4'>
			<div className='grid grid-cols-2 gap-4 border-b border-dark/10'>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Cliente</div>
					<div className='font-semibold'>{creditData.cliente?.nombre || 'Consumidor Final'}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Telefono</div>
					<div className='font-semibold'>{creditData.cliente?.telefono || 'N/A'}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Fecha</div>
					<div className='font-semibold'>{
						creditData?.fecha
						|| (creditData?.fechaIso ? (isNaN(new Date(creditData.fechaIso).getTime()) ? '' : new Date(creditData.fechaIso).toLocaleDateString()) : '')
					}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Sucursal</div>
					<div className='font-semibold'>{creditData?.sucursal.label}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Vendedor</div>
					<div className='font-semibold'>{creditData?.hecho_por}</div>
				</div>
			</div>
			<div className='mb-2'>
				<div className='mt-1'>
					{Array.isArray(creditData.items) && creditData.items.length ? (
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
									{creditData.items.map((it, i) => (
										<tr key={i} className='border-b border-dark/10'>
											<td className='p-2 text-center'>{it.cantidad ?? it.qty ?? '-'}</td>
											<td className='p-2'>{it.productCode || '-'}</td>
											<td className='p-2'>{it.productName || '-'}</td>
											<td className='p-2'>{it.unidad || '-'}</td>
											<td className='p-2 text-center'>{"C$ " + Number(it.unitPrice || 0).toLocaleString()}</td>
											<td className='p-2 text-center'>{"C$ " + Number(it.subtotal || it.cantidad * (it.unitPrice || 0)).toLocaleString()}</td>
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
			<div className='mt-4 flex justify-between gap-5 border-dark/10 pt-2'>
				<div className='font-semibold'>Transporte:</div>
				<div className='font-semibold'>{creditData.servicio_transporte ? `C$ ${Number(creditData.servicio_transporte).toLocaleString()}` : 'N/A'}</div>
			</div>
			<div className='mt-4 flex justify-between gap-5 border-t border-dark/10 pt-2'>
				<div className='text-lg font-bold'>Total:</div>
				<div className='text-lg font-bold text-primary'>{creditData.deudaInicio ? `C$ ${Number(creditData.deudaInicio).toLocaleString()}` : '-'}</div>
			</div>
		</div>
	)
}
