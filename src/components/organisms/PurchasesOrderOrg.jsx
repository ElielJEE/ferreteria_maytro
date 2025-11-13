'use client'
import React, { useEffect, useState } from 'react'
import { FiCheckCircle, FiClock, FiDollarSign, FiEye, FiPlus, FiSearch, FiShoppingBag, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import { Button, InfoCard, ModalContainer } from '../atoms';
import { Card, DropdownMenu, Input } from '../molecules';
import { useActive, useIsMobile } from '@/hooks';
import { useRouter } from 'next/navigation';
import { BsBoxSeam } from 'react-icons/bs';
import { ComprasService } from '@/services';

export default function PurchasesOrderOrg() {
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const router = useRouter();
	const { isActiveModal, setIsActiveModal } = useActive();
	const [purchaseData, setPurchaseData] = useState([]);
	const [mode, setMode] = useState('');

	const [ordenesEjemplo, setOrdenesEjemplo] = useState([]);
	const [selectedDetalles, setSelectedDetalles] = useState(new Set());


	const cardConfig = [
		{ key: 0, title: 'Total', color: 'primary', icon: FiShoppingCart },
		{ key: 0, title: 'Pendientes', color: 'yellow', icon: FiClock },
		{ key: 0, title: 'Recibidas', color: 'success', icon: FiCheckCircle },
		{ key: 0, title: 'Valor Total', color: 'success', icon: FiDollarSign },
	]

	const handleView = async (itemData) => {
		// mostrar info básica mientras cargan detalles
		setPurchaseData(itemData);
		setIsActiveModal(true)
		try {
			if (!itemData?.id) return;
			const res = await fetch(`/api/compras?id=${encodeURIComponent(itemData.id)}`);
			const data = await res.json();
			if (res.ok && data) {
				const detalles = Array.isArray(data.detalles) ? data.detalles.map(d => ({
					ID_DETALLES_COMPRA: d.ID_DETALLES_COMPRA,
					id: d.ID_PRODUCT,
					codigo: d.CODIGO_PRODUCTO,
					producto: d.PRODUCT_NAME,
					cantidad: d.CANTIDAD,
					precioUnitario: d.PRECIO_UNIT,
					subtotal: d.SUB_TOTAL,
					entregado: Boolean(Number(d.ENTREGADO || 0)),
					estado: Number(d.ENTREGADO || 0) ? 'Entregado' : 'Pendiente'
				})) : [];

				setPurchaseData(prev => ({
					...prev,
					productos: detalles,
					total: data.compra?.TOTAL ?? prev.total,
					fechas: { ...prev.fechas, creacion: data.compra?.FECHA_PEDIDO, esperada: data.compra?.FECHA_ENTREGA }
				}));

				// reset selection when opening details
				setSelectedDetalles(new Set());
			}
		} catch (e) {
			console.error('Error cargando detalles de compra', e);
		}
	}

	const formatDate = (v) => {
		if (!v && v !== 0) return '';
		try {
			const d = new Date(v);
			if (isNaN(d)) {
				// fallback: take first 10 chars if it's an ISO-like string
				return String(v).slice(0,10);
			}
			return d.toISOString().slice(0,10);
		} catch (e) {
			return String(v).slice(0,10);
		}
	}

	const handleProcess = () => {
		// This handler processes received items when in 'procesar' mode.
		// If not in 'procesar' mode, just close the modal.
		return;
	}

	const handleSave = () => {
		setIsActiveModal(false)
		setMode('')
	}

	const toggleDetalle = (detalleId) => {
		setSelectedDetalles(prev => {
			const s = new Set(prev);
			if (s.has(detalleId)) s.delete(detalleId);
			else s.add(detalleId);
			return s;
		});
	}

	const handleProcessReceive = async () => {
		// Only process when in procesar mode
		if (mode !== 'procesar') {
			setIsActiveModal(false);
			setMode('');
			return;
		}

		try {
			const detallesArr = Array.from(selectedDetalles);
			if (!detallesArr.length) {
				// nothing selected - reset mode
				setMode('');
				return;
			}

			const payload = { id_compra: purchaseData?.id, detalles: detallesArr };
			const res = await fetch('/api/compras/receive', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error procesando recepción');

			// refresh details and master list
			await handleView({ id: purchaseData?.id });
			try {
				const all = await ComprasService.listCompras();
				if (Array.isArray(all)) {
					setOrdenesEjemplo(all.map(r => ({
						id: r.ID_COMPRA,
						fechas: { creacion: r.FECHA_PEDIDO, esperada: r.FECHA_ENTREGA },
						proveedor: { nombre: r.NOMBRE_PROVEEDOR || (r.ID_PROVEEDOR ? String(r.ID_PROVEEDOR) : 'N/D'), telefono: '' },
						estado: r.ESTADO,
						productos: Array.isArray(r.productos) && r.productos.length ? r.productos : new Array(Number(r.PRODUCT_COUNT || 0)),
						total: r.TOTAL
					})))
				}
			} catch (e) {
				console.error('Error refreshing compras list', e);
			}

			setMode('');
		} catch (e) {
			console.error('Error procesando recepción', e);
		}
	}

	useEffect(() => {
		setMode('')

		// cargar compras reales desde API
		const fetchCompras = async () => {
			try {
				const res = await ComprasService.listCompras();
				if (Array.isArray(res)) {
					setOrdenesEjemplo(res.map(r => ({
						id: r.ID_COMPRA,
						fechas: { creacion: r.FECHA_PEDIDO, esperada: r.FECHA_ENTREGA },
						proveedor: { nombre: r.NOMBRE_PROVEEDOR || (r.ID_PROVEEDOR ? String(r.ID_PROVEEDOR) : 'N/D'), telefono: '' },
						estado: r.ESTADO,
						productos: Array.isArray(r.productos) && r.productos.length ? r.productos : new Array(Number(r.PRODUCT_COUNT || 0)),
						total: r.TOTAL
					})));
				}
			} catch (e) {
				console.error('Error fetching compras', e);
			}
		}
		fetchCompras();
	}, [isActiveModal])

	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
				<section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
					{
						cardConfig.map((cfg, index) => (
							<InfoCard
								CardTitle={cfg.title}
								cardValue={cfg.key}
								cardIcon={<cfg.icon className={`h-4 w-4 md:h-6 md:w-6 text-${cfg.color}`} />}
								cardIconColor={cfg.color}
								key={index}
							/>
						))
					}
				</section>
				<section className='p-6 border border-dark/20 rounded-lg flex flex-col gap-4'>
					<div className='flex flex-col md:flex-row justify-between'>
						<div>
							<h2 className='md:text-2xl font-semibold'>
								Gestion de Cotizaciones
							</h2>
							<span className='text-sm md:text-medium text-dark/50'>
								Administra cotizaciones para clientes.
							</span>
						</div>
						<div>
							<Button
								text={'Nueva Orden'}
								className={'primary'}
								icon={<FiPlus />}
								func={() => router.push('/compras/nueva-compra')}
							/>
						</div>
					</div>
					<div className='flex gap-2 w-full flex-col'>
						<div className='w-[100%]'>
							<Input
								type={'search'}
								placeholder={'Buscar cotizaciones...'}
								iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
							/>
						</div>
						<div className='flex gap-2 w-full flex-col md:flex-row md:w-1/2'>
							<Input
								type={'date'}
								inputClass={'no icon'}
							/>
							<DropdownMenu
								options={['Todas', 'Pendiente', 'Recibida',]}
								defaultValue={'Todas'}
							/>
						</div>
					</div>
					<div>
						{!isMobile ? (
							<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
								<table className='w-full border-collapse'>
									<thead className=' w-full border-b border-dark/20'>
										<tr className='w-full'>
											<th className='text-start text-dark/50 font-semibold p-2'>ID</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Fecha</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Proveedor</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Productos</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Total</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Fecha Esperada</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{ordenesEjemplo.map((item, index) => (
											<tr key={index} className={`text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3`}>
												<td className='p-2 font-normal'>
													{item.id}
												</td>
												<td className='p-2 font-normal'>
													{formatDate(item.fechas?.creacion)}
												</td>
												<td className='p-2 flex flex-col'>
													<span>{item.proveedor.nombre}</span>
													<span className='text-sm text-dark/60'>{item.proveedor.telefono}</span>
												</td>
												<td className='p-2 text-center'>
													{item.productos.length}
												</td>
												<td className='p-2 text-primary'>
													C$ {item.total}
												</td>
												<td className='p-2 font-normal'>{formatDate(item.fechas?.esperada)}</td>
												<td className='p-2'>
													<span className={`${item.estado === 'Recibida' ? 'bg-success' : 'bg-yellow'} text-light rounded-full px-2 text-sm`}>
														{item.estado.charAt(0).toUpperCase() + item.estado.slice(1).toLowerCase()}
													</span>
												</td>
												<td className='p-2 flex justify-center items-center'>
													<div className='flex gap-2 justify-center w-1/2'>
														<Button className={'primary'} icon={<FiEye />} func={() => handleView(item)} />
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='flex flex-col gap-4'>
								{ordenesEjemplo.map((item, index) => (
									<div key={index} className={``}>
										<Card
											productName={item.proveedor.nombre || 'Consumidor Final'}
											status={item.estado}
											id={item.proveedor.telefono}
										>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>ID</span>
												<span className='text-lg font-semibold'>{item.id}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Productos</span>
												<span className='text-lg font-semibold'>{item.productos.length}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Total</span>
												<div className='text-lg font-semibold'>{item.total ? `C$${Number(item.total).toLocaleString()}` : (item.total_venta ? `C$${Number(item.total_venta).toLocaleString()}` : '-')}</div>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Fecha</span>
												<span className='text-lg font-semibold'>{formatDate(item.fechas?.creacion)}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Fecha Esperada</span>
												<span className='text-lg font-semibold'>{formatDate(item.fechas?.esperada)}</span>
											</div>
											<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
												<Button className={"primary"} text={"Ver"} icon={<FiEye />} />
											</div>
										</Card>
									</div>
								))}
							</div>
						)
						}
					</div>
				</section>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={"Detalles de la Compra"}
						modalDescription='Revisa los detalles de la compra y gestiona su proceso'
						isForm={true}
					>
						<div className='py-4'>
							<div className='grid grid-cols-3 gap-4'>
								<div className='mb-2 flex flex-col'>
									<div className='text-dark/70 font-semibold'>Cliente</div>
									<div className='font-semibold'>{purchaseData?.proveedor?.nombre || 'Consumidor Final'}</div>
								</div>
								<div className='mb-2 flex flex-col'>
									<div className='text-dark/70 font-semibold'>Telefono</div>
									<div className='font-semibold'>{purchaseData?.proveedor?.telefono || 'N/A'}</div>
								</div>
								<div className='mb-2 flex flex-col'>
									<div className='text-dark/70 font-semibold'>Fecha Creada</div>
									<div className='font-semibold'>{purchaseData?.fechas?.creacion ? formatDate(purchaseData?.fechas?.creacion) : ''}</div>
								</div>
								<div className='mb-2 flex flex-col'>
									<div className='text-dark/70 font-semibold'>Fecha Estimada</div>
									<div className='font-semibold'>{purchaseData?.fechas?.esperada ? formatDate(purchaseData?.fechas?.esperada) : ''}</div>
								</div>
								<div className='mb-2 flex flex-col'>
									<div className='text-dark/70 font-semibold'>Fecha Recepcion</div>
									<div className='font-semibold'>{purchaseData?.fechas?.recepcion ? formatDate(purchaseData?.fechas?.recepcion) : ''}</div>
								</div>
								<div className='mb-2 flex flex-col'>
									<div className='text-dark/70 font-semibold'>Estado</div>
									<div className={`font-semibold ${purchaseData.estado === 'Recibida' ? 'bg-success' : 'bg-yellow'} text-light rounded-full px-2 w-max`}>{purchaseData?.estado}</div>
								</div>
								<div className='mb-2 flex flex-col'>
									<div className='text-dark/70 font-semibold'>Codigo de Referencia</div>
									<div className='font-semibold'>{purchaseData?.id}</div>
								</div>
								{
									purchaseData?.estado !== 'Recibida' && mode !== 'procesar' &&
									<div className='mb-2 flex flex-col items-end col-span-2'>
										<div className='font-semibold'>
											<Button
												text={'Recibir Mercancia'}
												className={'transparent'}
												icon={<BsBoxSeam />}
												func={() => setMode('procesar')}
											/>
										</div>
									</div>
								}
							</div>
							<div className='mb-2  border-t border-dark/10'>
								<div className='mt-1'>
									{Array.isArray(purchaseData.productos) && purchaseData.productos.length ? (
										<div className='w-full overflow-y-scroll max-h-[200px]'>
											<table className='w-full border-collapse text-sm'>
												<thead>
													<tr className='text-left border-b border-dark/20'>
														{
															mode === 'procesar' &&
															<th className='p-2 text-center'></th>
														}
														<th className='p-2 text-center'>Cantidad</th>
														<th className='p-2'>Código</th>
														<th className='p-2'>Nombre</th>
														<th className='p-2'>Unidad<br />de Medida</th>
														<th className='p-2 text-center'>Precio</th>
														<th className='p-2 text-center'>Subtotal</th>
														{
															purchaseData?.estado === 'Recibida'
																? <th className='p-2'>Estado</th>
																: mode !== 'procesar' && <th className='p-2 text-center'>Acciones</th>
														}
													</tr>
												</thead>
												<tbody>
													{purchaseData.productos.map((it, i) => (
														<tr key={i} className='border-b border-dark/10'>
															{
																mode === 'procesar' &&
																<td className='p-2 text-center'>
																	<input
																		type='checkbox'
																		checked={it.entregado ? true : selectedDetalles.has(it.ID_DETALLES_COMPRA || it.id)}
																		onChange={() => toggleDetalle(it.ID_DETALLES_COMPRA || it.id)}
																		disabled={it.entregado}
																	/>
																</td>
															}
															<td className='p-2 text-center'>{it.cantidad ?? it.qty ?? '-'}</td>
															<td className='p-2'>{it.codigo || '-'}</td>
															<td className='p-2'>{it.producto || '-'}</td>
															<td className='p-2'>{it.measureUnit || '-'}</td>
															<td className='p-2 text-center'>{"C$ " + Number(it.precioUnitario || 0).toLocaleString()}</td>
															<td className='p-2 text-center'>{"C$ " + Number(it.cantidad * (it.precioUnitario || 0)).toLocaleString()}</td>
															{
																purchaseData?.estado === 'Recibida'
																	? <td className='p-2'>
																		<span className={`${it.estado === 'Entregado' ? 'bg-success' : 'bg-yellow'} rounded-full text-light px-2`}>
																			{it.estado || '-'}
																		</span>
																	</td>
																	: mode !== 'procesar' &&
																	<td className='p-2 text-center'>
																		{!it.entregado ? (
																			<Button
																				icon={<FiTrash2 />}
																				className={'danger'}
																				func={async () => {
																				try {
																					const detId = it.ID_DETALLES_COMPRA || it.id;
																					if (!detId) return;
																					const res = await fetch(`/api/compras?detalleId=${encodeURIComponent(detId)}`, { method: 'DELETE' });
																					const data = await res.json();
																					if (!res.ok) throw new Error(data?.error || 'Error deleting detalle');
													
																					// Si la compra fue eliminada completamente, cerrar modal y remover de la lista
																					if (data?.compraDeleted) {
																						setIsActiveModal(false);
																						setOrdenesEjemplo(prev => prev.filter(o => o.id !== data.deletedCompraId && o.id !== purchaseData?.id));
																						setPurchaseData({});
																						return;
																					}
													
																					// si no se eliminó la compra, recargar detalles de la compra
																					await handleView({ id: purchaseData?.id });
																				} catch (e) {
																				console.error('Error eliminando detalle', e);
																				}
																				}}
																			/>
																		) : (
																			<span className='text-sm text-dark/60'>Entregado</span>
																		)}
																	</td>
															}
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
							<div className='mt-4 flex justify-between gap-5 border-t border-dark/10 pt-2'>
								<div className='text-lg font-bold'>Total:</div>
								<div className='text-lg font-bold text-primary'>{purchaseData?.total ? `C$ ${Number(purchaseData?.total).toLocaleString()}` : (purchaseData?.total_venta ? `C$${Number(purchaseData?.total_venta).toLocaleString()}` : '-')}</div>
							</div>
							<div className='mb-2 flex flex-col'>
								<div className='text-dark/70 font-semibold'>Notas</div>
								<div className='font-semibold'>{purchaseData?.notas}</div>
							</div>
							<div className='mt-4 flex gap-4'>
								<Button
									text={'Cerrar'}
									className={'secondary'}
									func={() => {
										setIsActiveModal(false)
										setMode('')
									}}
								/>
								{
									purchaseData?.estado !== 'Recibida' &&
									<Button
										text={mode === 'procesar' ? 'Procesar Compra' : 'Guardar Cambios'}
										icon={<FiShoppingBag />}
										className={mode === 'procesar' ? 'success' : 'primary'}
										func={mode === 'procesar' ? () => handleProcessReceive() : () => handleSave()}
									/>
								}
							</div>
						</div>
					</ModalContainer>
				)
			}
		</>
	)
}
