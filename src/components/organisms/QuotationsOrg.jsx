'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { Button, InfoCard, ModalContainer, SwitchButton } from '../atoms'
import { FiEdit, FiEye, FiFileText, FiPrinter, FiSearch, FiUser } from 'react-icons/fi'
import { Card, Input, QueoteView, QuoteEdit } from '../molecules'
import { useActive, useIsMobile } from '@/hooks'
import { BsBuilding } from 'react-icons/bs'
import { CotizacionesService, SalesService } from '@/services'


export default function QuotationsOrg() {
	const [mostrarExpirados, setMostrarExpirados] = useState(false);
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const [mode, setMode] = useState('ver');
	const { isActiveModal, setIsActiveModal } = useActive();
	const [selectedQuote, setSelectedQuote] = useState(null);
	const [quotes, setQuotes] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [filterDate, setFilterDate] = useState('');

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			const res = await CotizacionesService.getQuotes();
			if (!res.success) {
				setError(res.message || 'Error cargando cotizaciones');
			} else {
				setQuotes(res.cotizaciones || []);
			}
			setLoading(false);
		}
		load();
	}, []);

	const isExpired = (q) => {
		try {
			if (!q) return false;
			if ((q.estado || '').toLowerCase() === 'expirada') return true;
			if (!q.fechaExp) return false;
			const exp = new Date(q.fechaExp);
			if (isNaN(exp.getTime())) return false;
			const today = new Date();
			today.setHours(0,0,0,0); exp.setHours(0,0,0,0);
			// Inclusive: el mismo día de vencimiento ya se considera expirado
			return exp <= today;
		} catch { return false; }
	};

	const filtered = useMemo(() => {
		let list = quotes;
		if (search.trim()) {
			const term = search.toLowerCase();
			list = list.filter(q =>
				(q.id || '').toLowerCase().includes(term) ||
				(q.cliente || '').toLowerCase().includes(term) ||
				(q.telefono || '').toLowerCase().includes(term) ||
				(q.creadaPor || '').toLowerCase().includes(term)
			);
		}
		if (filterDate) {
			list = list.filter(q => String(q.fecha) === filterDate);
		}
		if (!mostrarExpirados) {
			list = list.filter(q => q.estado !== 'expirada');
		}
		return list;
	}, [quotes, search, filterDate, mostrarExpirados]);

		const refreshQuotes = async () => {
			const res = await CotizacionesService.getQuotes();
			if (res.success) setQuotes(res.cotizaciones || []);
		};

		const toggleModalMode = async (type, itemData) => {
		setMode(type);
		if (type === 'ver' || type === 'edit') {
			// Si no tenemos productos en la lista, traer detalle
			let quoteData = itemData;
			const detail = await CotizacionesService.getQuoteDetail(itemData.id);
			if (detail.success && detail.cotizacion) {
				quoteData = { ...itemData, ...detail.cotizacion };
			}
				setSelectedQuote(quoteData);
			setIsActiveModal(true);
		}
	}

	const handleProcessQuote = async () => {
		if (!selectedQuote?.id) return;
		try {
			// Llamar endpoint de procesamiento
			const res = await CotizacionesService.processQuote(selectedQuote.id);
			if (!res.success) {
				try { alert(res.message || 'No se pudo procesar la cotización'); } catch {}
				return;
			}
			// Marcar estado local
			setSelectedQuote(prev => prev ? { ...prev, estado: 'procesada' } : prev);
			await refreshQuotes();
			// Opcional: obtener detalle de factura creada y loguear
			if (res.facturaId) {
				try { await SalesService.getSaleDetail(res.facturaId); alert(`Venta creada. Factura #${res.facturaId}`); } catch { try { alert('Venta creada'); } catch {} }
			}
		} catch (e) {
			console.error('Error al procesar cotización:', e);
		}
	};

		const handleQuoteSaved = async () => {
			setIsActiveModal(false);
			await refreshQuotes();
		};

	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
        <section className='grid md:grid-cols-4 grid-cols-1'>
          <InfoCard
            CardTitle={"Total"}
            cardValue={String(quotes.length)}
            cardIcon={<FiFileText className='h-5 w-5 text-primary' />}
            cardIconColor={'primary'}
          />
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
						<SwitchButton
							text={'Mostrar Expirados'}
							onToggle={setMostrarExpirados}
						/>
					</div>
					<div className='flex gap-2 w-full'>
						<div className='w-[100%]'>
							<Input
								type={'search'}
								placeholder={'Buscar cotizaciones...'}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
							/>
						</div>
						<Input
								type={'date'}
								inputClass={'no icon'}
								value={filterDate}
								onChange={(e) => setFilterDate(e.target.value)}
							/>
					</div>
					<div>
						{loading ? (
							<div className='p-4 text-sm'>Cargando cotizaciones...</div>
						) : error ? (
							<div className='p-4 text-danger text-sm'>{error}</div>
						) : !isMobile ? (
							<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
								<table className='w-full border-collapse'>
									<thead className=' w-full border-b border-dark/20'>
										<tr className='w-full'>
											<th className='text-start text-dark/50 font-semibold p-2'>ID</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Fecha</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Cliente</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Productos</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Total</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Validad Hasta</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Creado por</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filtered.map((item, index) => (
											<tr key={index} className={`${!mostrarExpirados ? item.estado === 'expirada' && 'hidden' : ''} text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3`}>
												<td className='p-2 text-center'>
													{item.id}
												</td>
												<td className='p-2'>
													{item.fecha}
												</td>
												<td className='p-2 flex flex-col'>
													<span>{item.cliente}</span>
													<span className='text-sm text-dark/60'>{item.telefono}</span>
												</td>
												<td className='p-2 text-center'>
													{item.items}
												</td>
												<td className='p-2 text-primary'>
													C$ {item.total}
												</td>
												<td className='p-2'>{item.fechaExp}</td>
												<td className='p-2'>
													<span className={`${item.estado === 'activa' ? 'bg-success' : 'bg-dark'} text-light rounded-full px-2 text-sm`}>
														{item.estado.charAt(0).toUpperCase() + item.estado.slice(1).toLowerCase()}
													</span>
												</td>
												<td className='p-2'>
													<div className='flex items-center gap-1 truncate'>
														<FiUser />
														{item.creadaPor}
													</div>
												</td>
												<td className='p-2'>
													<div className='flex items-center gap-1 truncate text-dark/70'>
														<BsBuilding />
														{item.sucursal.name}
													</div>
												</td>
												<td className='p-2 flex justify-center items-center'>
													<div className='flex gap-2 justify-center w-1/2'>
														<Button className={'primary'} icon={<FiEye />} func={() => toggleModalMode('ver', item)} />
														<Button className={'blue'} icon={<FiEdit />} func={() => toggleModalMode('edit', item)} disabled={isExpired(item)} />
														<Button className={'success'} icon={<FiPrinter />} />
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='flex flex-col gap-4'>
									{filtered.map((item, index) => (
									<div key={index} className={`${!mostrarExpirados ? item.estado === 'expirada' && 'hidden' : ''}`}>
										<Card
											productName={item.cliente || 'Consumidor Final'}
											status={item.estado}
											id={item.id}
										>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Productos</span>
												<span className='text-lg font-semibold'>{item.items}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Total</span>
												<div className='text-lg font-semibold'>{item.total ? `C$${Number(item.total).toLocaleString()}` : (item.total_venta ? `C$${Number(item.total_venta).toLocaleString()}` : '-')}</div>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Fecha</span>
												<span className='text-lg font-semibold'>{item.fecha}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Valida Hasta</span>
												<span className='text-lg font-semibold'>{item.fechaExp}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Creado por</span>
												<span className='text-lg font-semibold'>{item.creadaPor}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Sucursal</span>
												<span className='text-lg font-semibold'>{item.sucursal.name}</span>
											</div>
											<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
												<Button className={"primary"} text={"Ver"} icon={<FiEye />} func={() => toggleModalMode('ver', item)} />
												<Button className={"blue"} text={"Editar"} icon={<FiEdit />} func={() => toggleModalMode('edit', item)} disabled={isExpired(item)} />
												<Button className={'success'} text={"Imprimir"} icon={<FiPrinter />} />
											</div>
										</Card>
									</div>
								))}
							</div>
						)
						}
					</div>
				</section >
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={mode === 'ver' ? 'Detalles de Cotizacion' : mode === 'edit' ? 'Editar Cotizacion' : mode === 'eliminar' ? 'Eliminar venta' : ''}
						modalDescription={mode === 'ver' ? 'Información completa de la cotizacion.' : mode === 'edit' ? 'Editar cotizacion' : mode === 'eliminar' ? 'Eliminar venta' : ''}
						isForm={mode === 'edit' ? true : false}
					>
						{mode === 'ver' && <QueoteView quote={selectedQuote} onClose={() => setIsActiveModal(false)} onProcess={handleProcessQuote} />}
						{mode === 'edit' && <QuoteEdit quote={selectedQuote} onClose={() => setIsActiveModal(false)} onSave={handleQuoteSaved} />}
					</ModalContainer>
				)
			}
		</>
	)
}
