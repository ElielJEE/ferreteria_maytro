"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Button, ModalContainer } from '../atoms'
import { BsArrowDownCircle } from 'react-icons/bs'
import { FiRefreshCcw } from 'react-icons/fi'
import { useActive } from '@/hooks'
import ReturnView from './ReturnView'

const parseNumber = (value) => {
	const num = Number(value ?? 0);
	return Number.isFinite(num) ? num : 0;
};

export default function SaleView({ sale, onClose, onSaleUpdate }) {
	const { isActiveModal, setIsActiveModal } = useActive();
	const [productData, setProductData] = useState({});
	const [currentSale, setCurrentSale] = useState(sale || null);

	useEffect(() => {
		setCurrentSale(sale || null);
	}, [sale]);

	console.log(sale);

	const subtotalActual = useMemo(() => {
		if (!currentSale) return 0;
		const subtotal = parseNumber(currentSale?.subtotal ?? currentSale?.SUBTOTAL);
		if (subtotal) return subtotal;
		const itemsSubtotal = Array.isArray(currentSale?.items)
			? currentSale.items.reduce((acc, item) => {
				const qty = parseNumber(item?.cantidad ?? item?.AMOUNT ?? item?.qty);
				const price = parseNumber(item?.precio_unit ?? item?.PRECIO_UNIT ?? item?.precio ?? item?.PRECIO);
				const sub = parseNumber(item?.subtotal ?? item?.SUB_TOTAL);
				return acc + (sub || qty * price);
			}, 0)
			: 0;
		if (itemsSubtotal) return itemsSubtotal;
		return parseNumber(currentSale?.total ?? currentSale?.total_venta ?? currentSale?.TOTAL);
	}, [currentSale]);

	const descuentoActual = useMemo(() => {
		if (!currentSale) return 0;
		const direct = parseNumber(currentSale?.descuento ?? currentSale?.DESCUENTO);
		if (direct) return direct;
		const discountObj = currentSale?.discount;
		if (discountObj && typeof discountObj === 'object') {
			return parseNumber(discountObj?.monto ?? discountObj?.MONTO ?? discountObj?.valor);
		}
		return 0;
	}, [currentSale]);

	const totalActual = useMemo(() => {
		if (!currentSale) return 0;
		const direct = parseNumber(currentSale?.total ?? currentSale?.total_venta ?? currentSale?.TOTAL);
		if (direct) return direct;
		return Math.max(0, subtotalActual - descuentoActual);
	}, [currentSale, subtotalActual, descuentoActual]);

	const handleProductReturn = (product) => {
		setIsActiveModal(true);
		setProductData(product);
	};

	const handleReturnSaved = (res, context) => {
		if (!res?.ok) return;
		const totals = context?.totals;
		setCurrentSale((prev) => {
			if (!prev) return prev;
			const updated = { ...prev };
			if (totals) {
				if (typeof totals.subtotal_nuevo !== 'undefined') {
					updated.subtotal = parseNumber(totals.subtotal_nuevo);
					updated.SUBTOTAL = parseNumber(totals.subtotal_nuevo);
				}
				if (typeof totals.descuento !== 'undefined') {
					updated.descuento = parseNumber(totals.descuento);
					updated.DESCUENTO = parseNumber(totals.descuento);
				}
				if (typeof totals.total_nuevo !== 'undefined') {
					const newTotal = parseNumber(totals.total_nuevo);
					updated.total = newTotal;
					updated.total_venta = newTotal;
					updated.TOTAL = newTotal;
				}
			}
			return updated;
		});
		if (totals) {
			const baseSale = currentSale || sale || {};
			onSaleUpdate && onSaleUpdate({
				id: baseSale?.id ?? baseSale?.ID_FACTURA ?? baseSale?.ID ?? context?.payload?.factura_id ?? null,
				subtotal: parseNumber(totals.subtotal_nuevo),
				descuento: parseNumber(totals.descuento),
				total: parseNumber(totals.total_nuevo),
			});
		}
	};

	if (!currentSale) return (
		<div className='py-4'>No hay información de la venta.</div>
	)
	return (
		<>
			<div className='py-4'>
				<div className='grid grid-cols-2 gap-4 border-b border-dark/10'>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>N° Factura</div>
						<div className='font-semibold'>{currentSale?.numero ?? ''}</div>
					</div>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>Cliente</div>
						<div className='font-semibold'>{currentSale?.cliente?.nombre || 'Consumidor Final'}</div>
					</div>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>Telefono</div>
						<div className='font-semibold'>{currentSale?.cliente?.telefono || 'N/A'}</div>
					</div>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>Fecha</div>
						<div className='font-semibold'>{currentSale?.fecha ? new Date(currentSale.fecha).toLocaleDateString() : ''}</div>
					</div>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>Hora</div>
						<div className='font-semibold'>{currentSale?.fecha ? new Date(currentSale.fecha).toLocaleTimeString() : ''}</div>
					</div>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>Sucursal</div>
						<div className='font-semibold'>{currentSale?.sucursal?.nombre || 'N/A'}</div>
					</div>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>Vendedor</div>
						<div className='font-semibold'>{currentSale?.usuario?.nombre || 'N/A'}</div>
					</div>
					<div className='mb-2 flex flex-col'>
						<div className='text-dark/70 font-semibold'>Descuento</div>
						<div className='font-semibold'>
							{(() => {
								const d = currentSale?.discount || null;
								if (!d) return 'Sin descuento';
								return (
									d.codigo || d.CODIGO_DESCUENTO || d.nombre || 'Descuento aplicado'
								);
							})()}
						</div>
					</div>
				</div>
				<div className='mb-2'>
					<div className='mt-1'>
						{Array.isArray(currentSale?.items) && currentSale.items.length ? (
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
										{currentSale.items.map((it, i) => (
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
						<div className='text-md font-semibold'>{subtotalActual ? `C$ ${subtotalActual.toLocaleString()}` : '-'}</div>
					</div>
					<div className='flex justify-between'>
						<div className='text-md font-semibold'>Descuento:</div>
						<div className='text-md font-semibold'>{descuentoActual ? `C$ ${descuentoActual.toLocaleString()}` : 'N/A'}</div>
					</div>
					<div className='flex justify-between'>
						<div className='text-md font-semibold'>Transporte:</div>
						<div className='text-md font-semibold'>{`${sale.servicio_transporte !== 0 ? 'C$ ' + sale.servicio_transporte : 'N/A'}`}</div>
					</div>
				</div>
				<div className='mt-4 flex justify-between gap-5 border-t border-dark/10 pt-2'>
					<div className='text-lg font-bold'>Total:</div>
					<div className='text-lg font-bold text-primary'>{totalActual ? `C$ ${totalActual.toLocaleString()}` : '-'}</div>
				</div>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						isForm={true}
					>
						<ReturnView
							returnData={currentSale}
							onClose={() => setIsActiveModal(false)}
							onSave={handleReturnSaved}
							productData={productData}
						/>
					</ModalContainer>
				)
			}
		</>
	)
}
