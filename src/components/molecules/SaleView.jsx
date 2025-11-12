"use client"
import React, { useState } from 'react'
import { Button, ModalContainer } from '../atoms'
import { BsArrowDownCircle } from 'react-icons/bs'
import { FiRefreshCcw } from 'react-icons/fi'
import { useActive } from '@/hooks'
import ReturnView from './ReturnView'

export default function SaleView({ sale, onClose }) {
	const { isActiveModal, setIsActiveModal } = useActive();
	const [productData, setProductData] = useState({});

	const handleProductReturn = (product) => {
		setIsActiveModal(true);
		setProductData(product);
	}

	if (!sale) return (
		<div className='py-4'>No hay información de la venta.</div>
	)
	return (
		<>
			<div className='py-4'>
				<div className='grid grid-cols-2 gap-4 border-b border-dark/10'>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>N° Factura</div>
						<div className='font-semibold'>{sale.numero ?? ''}</div>
					</div>
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
											<th className='p-2 text-center'>Acciones</th>
										</tr>
									</thead>
									<tbody>
										{sale.items.map((it, i) => (
											<tr key={i} className='border-b border-dark/10'>
												<td className='p-2 text-center'>{it.cantidad ?? it.qty ?? '-'}</td>
												<td className='p-2'>{it.codigo || it.producto_codigo || it.sku || '-'}</td>
												<td className='p-2'>{it.producto_nombre || it.producto || '-'}</td>
												<td className='p-2'>
													{(() => {
														const unidadNombre = it.unidad || it.unit || it.unidad_nombre || it.unit_name || it.UNIDAD_NOMBRE || it.UNIDAD_NOMBRE || '-';
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
												<td className='p-2 text-center'>{"C$ " + Number(it.precio_unit || it.precio || 0).toLocaleString()}</td>
												<td className='p-2 text-center'>{"C$ " + Number(it.subtotal || it.cantidad * (it.precio_unit || it.precio || 0)).toLocaleString()}</td>
												<td className='p-2 text-center'>
													<Button
														className={'primary'}
														icon={<FiRefreshCcw />}
														func={() => handleProductReturn(it)}
													/>
												</td>
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
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						isForm={true}
					>
						<ReturnView
							returnData={sale}
							onClose={() => setIsActiveModal(false)}
							productData={productData}
						/>
					</ModalContainer>
				)
			}
		</>
	)
}
