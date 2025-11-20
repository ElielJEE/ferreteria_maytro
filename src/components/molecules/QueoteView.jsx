import React, { useMemo } from 'react'
import { Button } from '../atoms';
import { FiShoppingBag } from 'react-icons/fi';

export default function QueoteView({ quote, onClose, onProcess }) {
	// Calcular expiración: fechaExp < hoy (normalizado) o estado marcado como expirada
	const isExpired = useMemo(() => {
		try {
			if (!quote) return false;
			if (quote.estado && quote.estado.toLowerCase() === 'expirada') return true;
			const raw = quote.fechaExp || quote.FECHA_VENCIMIENTO;
			if (!raw) return false;
			const exp = new Date(raw);
			if (isNaN(exp.getTime())) return false;
			const today = new Date();
			today.setHours(0,0,0,0);
			exp.setHours(0,0,0,0);
			// Inclusive: el mismo día de vencimiento ya se considera expirado
			return exp <= today;
		} catch { return false; }
	}, [quote]);

	// Deshabilitar si ya fue procesada o está expirada
	const disableProcess = (quote?.estado && ['procesada'].includes(String(quote.estado).toLowerCase())) || isExpired;
	console.log(quote);

	return (
		<div className='py-4'>
			<div className='grid grid-cols-3 gap-4 border-b border-dark/10'>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Cliente</div>
					<div className='font-semibold'>{quote.cliente || 'Consumidor Final'}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Telefono</div>
					<div className='font-semibold'>{quote.telefono || 'N/A'}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Fecha</div>
					<div className='font-semibold'>{quote?.fecha ? new Date(quote.fecha).toLocaleDateString() : ''}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Valida hasta</div>
					<div className='font-semibold'>{quote?.fechaExp ? new Date(quote.fechaExp).toLocaleDateString() : ''}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Sucursal</div>
					<div className='font-semibold'>{quote?.sucursal?.name}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Vendedor</div>
					<div className='font-semibold'>{quote?.creadaPor}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Estado</div>
					<div className='font-semibold'>{quote?.estado === 'activa' ? 'vigente' : quote?.estado}</div>
				</div>
				<div className='mb-2 flex flex-col'>
					<div className='text-dark/70 font-semibold'>Codigo de Referencia</div>
					<div className='font-semibold'>{quote?.id}</div>
				</div>
			</div>
			<div className='mb-2'>
				<div className='mt-1'>
					{Array.isArray(quote.products) && quote.products.length ? (
						<div className='w-2xl overflow-y-scroll max-h-[200px]'>
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
									{quote.products.map((it, i) => (
										<tr key={i} className='border-b border-dark/10'>
											<td className='p-2 text-center'>{it.cantidad ?? it.qty ?? '-'}</td>
											<td className='p-2'>{it.productCode || '-'}</td>
											<td className='p-2'>{it.productName || '-'}</td>
											<td className='p-2'>
												{(() => {
													const unidadNombre = it.unidad || it.unit || it.unidad_nombre || it.unit_name || it.UNIDAD_NOMBRE || it.measureUnit || '-';
													return (
														<div className='flex flex-col'>
															<span>{unidadNombre}</span>
															{(Number(it.cantidad_por_unidad || it.CANTIDAD_POR_UNIDAD || 0) !== 0 && Number(it.cantidad_por_unidad || it.CANTIDAD_POR_UNIDAD || 1) !== 1) && (
																<small className='text-dark/50'>x {Number(it.cantidad_por_unidad || it.CANTIDAD_POR_UNIDAD).toString()} por unidad</small>
															)}
														</div>
													)
												})()}
											</td>
											<td className='p-2 text-center'>{"C$ " + Number(it.unitPrice || 0).toLocaleString()}</td>
											<td className='p-2 text-center'>{"C$ " + Number(it.cantidad * (it.unitPrice || 0)).toLocaleString()}</td>
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
					<div className='text-md font-semibold'>C$ {quote?.subtotal.toFixed(2) || '-'}</div>
				</div>
				<div className='flex justify-between'>
					<div className='text-md font-semibold'>Descuento:</div>
					<div className='text-md font-semibold'>{quote?.descuento === 0 ? "N/A" : quote?.descuento.toFixed(2)}</div>
				</div>
				<div className='flex justify-between'>
					<div className='text-md font-semibold'>Transporte:</div>
					<div className='text-md font-semibold'>{quote?.transporte === 0 ? "N/A" : "C$ " + quote?.transporte.toFixed(2)}</div>
				</div>
			</div>
			<div className='mt-4 flex justify-between gap-5 border-t border-dark/10 pt-2'>
				<div className='text-lg font-bold'>Total:</div>
				<div className='text-lg font-bold text-primary'>{quote.total ? `C$ ${Number(quote.total).toLocaleString()}` : (quote.total_venta ? `C$${Number(quote.total_venta).toLocaleString()}` : '-')}</div>
			</div>
			<div className='mt-4 flex gap-4'>
				<Button
					text={'Cerrar'}
					className={'secondary'}
					func={() => onClose()}
				/>
				<Button
					text={'Procesar Venta'}
					icon={<FiShoppingBag />}
					className={'success'}
					disabled={disableProcess}
					func={() => { if (!disableProcess && typeof onProcess === 'function') onProcess(quote); }}
				/>
			</div>
		</div>
	)
}
