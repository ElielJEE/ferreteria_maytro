'use client'
import { useActive, useIsMobile } from '@/hooks';
import React, { useEffect, useMemo, useState } from 'react';
import { FiBox, FiCheck, FiCheckCircle, FiClock, FiEdit, FiEye, FiShoppingCart, FiUser } from 'react-icons/fi';
import { Button, InfoCard, ModalContainer } from '../atoms';
import { BsBuilding, BsTelephone } from 'react-icons/bs';
import Card from './Card';
import Input from './Input';
import StockService from '@/services/StockService';
import { MdOutlineCancel } from "react-icons/md";

export default function Reserved({ sucursalFilter = 'Todas' }) {
	const isMobile = useIsMobile({ breakpoint: 768 });
	const { isActiveModal, setIsActiveModal } = useActive();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [rows, setRows] = useState([]);
	const [type, setType] = useState('ver');
	const [selectedItem, setSelectedItem] = useState(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');
	const [enabled, setEnabled] = useState(false)

	const [form, setForm] = useState({
		cliente_nombre: '',
		telefono: '',
		fecha_entrega: '',
		notas: '',
		cantidad: ''
	});

	const fetchData = async (ignore = { v: false }) => {
		try {
			setLoading(true);
			setError('');
			const url = `/api/stock?tab=Reservados&sucursal=${encodeURIComponent(sucursalFilter || 'Todas')}`;
			const res = await fetch(url);
			const json = await res.json().catch(() => null);
			if (!res.ok) throw new Error(json?.error || json?.message || 'No se pudieron obtener reservados');
			const list = Array.isArray(json) ? json : (json?.reservados || []);
			if (!ignore.v) setRows(list);
		} catch (e) {
			if (!ignore.v) setError(e.message || 'Error al cargar reservados');
		} finally {
			if (!ignore.v) setLoading(false);
		}
	};

	useEffect(() => {
		const ignore = { v: false };
		fetchData(ignore);
		const handler = () => fetchData(ignore);
		window.addEventListener('stock:updated', handler);
		return () => { ignore.v = true; window.removeEventListener('stock:updated', handler); };
	}, [sucursalFilter]);

	const cardData = useMemo(() => {
		const total = rows.length;
		const pendientes = rows.filter(r => (r.estado || '').toLowerCase() === 'pendiente').length;
		const canceladas = rows.filter(r => (r.estado || '').toLowerCase() === 'cancelada').length;
		const entregados = rows.filter(r => ['entregada', 'completada', 'completado'].includes((r.estado || '').toLowerCase())).length;
		return { reservados: total, pendientes, canceladas, entregados };
	}, [rows]);

	const cardsConfig = [
		{ key: 'reservados', title: 'Reservados', icon: FiShoppingCart, color: 'purple' },
		{ key: 'pendientes', title: 'Pendientes', icon: FiClock, color: 'yellow' },
		{ key: 'canceladas', title: 'Canceladas', icon: MdOutlineCancel, color: 'secondary' },
		{ key: 'entregados', title: 'Entregados', icon: FiCheckCircle, color: 'success' },
	];

	const data = rows.map(r => ({
		codigo: r.codigo || '',
		producto: r.producto || '',
		sucursal: r.sucursal || '',
		cantidad: Number(r.cantidad || 0),
		cliente: r.cliente || { nombre: '', id: '' },
		telefono: r.telefono || '',
		fecha_reserva: r.fecha_reserva || '',
		fecha_entrega: r.fecha_entrega || '',
		estado: r.estado || 'Pendiente',
		reservado_por: r.reservado_por || '',
		notas: r.notas || '',
		id: r.id || '',
	}));

	const tiposConfig = [
		{ type: 'pendiente', bgColor: 'bg-yellow', color: 'yellow', textColor: 'text-yellow' },
		{ type: 'entregada', bgColor: 'bg-success', color: 'success', textColor: 'text-success' },
		{ type: 'cancelada', bgColor: 'bg-secondary', color: 'secondary', textColor: 'text-secondary' },
	];

	const toggleModalType = (modalType, item) => {
		if (modalType === 'ver') {
			setType('ver');
			setSelectedItem(item);
			setIsActiveModal(true);
		} else if (modalType === 'editar') {
			setType('editar');
			setSelectedItem(item || null);
			setForm({
				cliente_nombre: item?.cliente?.nombre || '',
				telefono: item?.telefono || '',
				fecha_entrega: item?.fecha_entrega || '',
				notas: item?.notas || '',
				cantidad: item?.cantidad ?? ''
			});
			setIsActiveModal(true);
		}
	};

	const handleConfirm = async () => {
		if (!selectedItem) return;
		try {
			setSaving(true);
			const res = await StockService.confirmarEntrega({ id: selectedItem.id, fecha_entrega: selectedItem?.fecha_entrega || undefined });
			if (!res.success) {
				setError(res.message || 'No se pudo confirmar entrega');
			} else {
				setMessage('Entrega confirmada');
				setIsActiveModal(false);
				await fetchData();
				try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('stock:updated')); } catch { }
			}
		} finally {
			setSaving(false);
		}
	};

	const handleCancelReserva = async () => {
		if (!selectedItem) return;
		try {
			setSaving(true);
			const res = await StockService.cancelarReserva({ id: selectedItem.id });
			if (!res.success) {
				setError(res.message || 'No se pudo cancelar la reserva');
			} else {
				setMessage('Reserva cancelada');
				setIsActiveModal(false);
				await fetchData();
				try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('stock:updated')); } catch { }
			}
		} finally {
			setSaving(false);
		}
	};

	const handleSubmitEdit = async (e) => {
		e?.preventDefault?.();
		if (!selectedItem) return;
		try {
			setSaving(true);
			const payload = {
				id: selectedItem.id,
				cantidad: form.cantidad === '' ? undefined : Number(form.cantidad),
				cliente: { nombre: form.cliente_nombre },
				telefono: form.telefono,
				fecha_entrega: form.fecha_entrega || null,
				notas: form.notas,
			};
			const res = await StockService.updateReserva(payload);
			if (!res.success) {
				setError(res.message || 'No se pudo actualizar');
			} else {
				setMessage('Reserva actualizada');
				setIsActiveModal(false);
				await fetchData();
				try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('stock:updated')); } catch { }
			}
		} finally {
			setSaving(false);
		}
	};

	setTimeout(() => {
		setMessage('')
	}, 5000);

	return (
		<>
			<div>
				<div className='w-full flex flex-col md:flex-row mb-4 justify-between'>
					<div>
						<h2 className='md:text-2xl font-semibold flex items-center gap-2'>
							<FiShoppingCart className='text-purple' />
							Productos Reservados
						</h2>
						<span className='text-sm md:text-medium text-dark/50'>
							Productos reservados {sucursalFilter && sucursalFilter !== 'Todas' ? `en ${sucursalFilter}` : 'en todas las sucursales'}
						</span>
					</div>
					<div className='flex items-center gap-2'>
						<span className='font-semibold'>Mostar cancelados</span>
						<button
							onClick={() => setEnabled(!enabled)}
							className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${enabled ? "bg-primary" : "bg-gray-400"}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${enabled 
									? "translate-x-6" : "translate-x-1"}`}
							/>
						</button>
					</div>
				</div>

				{error && <div className='text-danger text-sm mb-2'>{error}</div>}
				{loading && <div className='text-dark/60 text-sm mb-2'>Cargando…</div>}

				<section className='grid grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
					{cardsConfig.map((cfg, index) => (
						<InfoCard
							key={index}
							CardTitle={cfg.title}
							cardValue={cardData[cfg.key]}
							cardIcon={<cfg.icon className={`h-4 w-4 md:h-6 md:w-6 text-${cfg.color}`} />}
							cardIconColor={cfg.color}
						/>
					))}
				</section>

				<section>
					{!isMobile ? (
						<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
							<table className='w-full border-collapse'>
								<thead className=' w-full border-b border-dark/20'>
									<tr className='w-full'>
										<th className='text-start text-dark/50 font-semibold p-2'>Codigo</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Producto</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
										<th className='text-center text-dark/50 font-semibold p-2'>Cantidad</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Cliente</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Telefono</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Fecha<br />Reserva</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Fecha<br />Entrega</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Reservado Por</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Notas</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Acciones</th>
									</tr>
								</thead>
								<tbody className='w-full'>
									{data.map((item, index) => {
										const cfg = tiposConfig.find(t => t.type === item.estado) || {};
										return (
											<tr key={index} className={`${!enabled ? item.estado === 'cancelada' && 'hidden' : ''} text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3`}>
												<td className='p-2'>{item.codigo}</td>
												<td className='p-2 md:truncate lg:whitespace-normal'>{item.producto}</td>
												<td className='p-2 text-dark/70 max-w-[180px] truncate'>
													<span className='flex items-center gap-1'>
														<BsBuilding />
														{item.sucursal}
													</span>
												</td>
												<td className={`p-2 text-center ${cfg.textColor} ${cfg.bgColor}/10`}>{item.cantidad}</td>
												<td className='p-2 flex flex-col'>
													<span className='md:truncate lg:whitespace-normal'>{item.cliente.nombre}</span>
													{item?.cliente?.id && isNaN(Number(item.cliente.id)) && (
														<span className='text-dark/60 text-sm'>{item.cliente.id}</span>
													)}
												</td>
												<td className='p-2'>
													<div className='flex items-center gap-1'>
														<BsTelephone />
														{item.telefono}
													</div>
												</td>
												<td className='p-2'>{item.fecha_reserva}</td>
												<td className='p-2'>{item.fecha_entrega}</td>
												<td className='p-2'>
													<div className={`px-2 text-center rounded-full ${cfg.bgColor ?? 'bg-dark/10'}`}>
														<span className='text-sm text-light'>{item.estado}</span>
													</div>
												</td>
												<td className='p-2'>
													<div className='flex items-center gap-1 font-normal'>
														<FiUser />
														{item.reservado_por}
													</div>
												</td>
												<td className='p-2 truncate max-w-[150px]' title={item.notas}>
													<span>{item.notas}</span>
												</td>
												<td className='p-2 flex'>
													<Button icon={<FiEye />} className={'none'} func={() => toggleModalType('ver', item)} />
													<Button icon={<FiEdit />} className={'none'} func={() => toggleModalType('editar', item)} />
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<div className='flex flex-col mt-2 gap-2'>
							{data.map((item, index) => {
								const cfg = tiposConfig.find(t => t.type === item.estado) || {};
								return (
									<Card key={index} productName={item.producto} id={item.codigo} sucursal={item.sucursal} other={item.estado} bgColor={cfg.color}>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Cantidad</span>
											<span className='text-lg font-semibold'>{item.cantidad}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Cliente</span>
											<span className='text-lg font-semibold'>{item.cliente.nombre}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Telefono</span>
											<span className='text-lg font-semibold'>{item.telefono}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Reservado Por</span>
											<span className='text-lg font-semibold'>{item.reservado_por}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Fecha Reserva</span>
											<span className='text-lg font-semibold'>{item.fecha_reserva}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Fecha Entrega</span>
											<span className='text-lg font-semibold'>{item.fecha_entrega}</span>
										</div>
										<div className='flex flex-col col-span-2'>
											<span className='text-sm text-dark/70'>Notas</span>
											<span className='text-lg font-semibold'>{item.notas}</span>
										</div>
										<Button text={'Revisar Entrega'} icon={<FiEye />} className={'success'} func={() => toggleModalType('ver', item)} />
										<Button text={'Editar'} icon={<FiEdit />} className={'blue'} func={() => toggleModalType('editar', item)} />
									</Card>
								);
							})}
						</div>
					)}
				</section>

				{isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={type === 'ver' ? 'Ver Reservado' : 'Editar Reservado'}
						modalDescription={type === 'ver' ? 'Revisar Reserva y confirmar entrega' : 'Actualiza la información del reservado'}
					>
						{type === 'ver' ? (
							selectedItem && (
								<div className='flex flex-col gap-4'>
									<div className='grid grid-cols-2 gap-2'>
										<div>
											<span className='text-sm text-dark/70'>Cliente</span>
											<div className='font-semibold'>{selectedItem?.cliente?.nombre || ''}</div>
										</div>
										<div>
											<span className='text-sm text-dark/70'>Telefono</span>
											<div className='font-semibold'>{selectedItem?.telefono || ''}</div>
										</div>
										<div>
											<span className='text-sm text-dark/70'>Fecha Reserva</span>
											<div className='font-semibold'>{selectedItem?.fecha_reserva || ''}</div>
										</div>
										<div>
											<span className='text-sm text-dark/70'>Fecha Entrega</span>
											<div className='font-semibold'>{selectedItem?.fecha_entrega || ''}</div>
										</div>
										<div>
											<span className='text-sm text-dark/70'>Reservado por</span>
											<div className='font-semibold'>{selectedItem?.reservado_por || ''}</div>
										</div>
										<div>
											<span className='text-sm text-dark/70'>Sucursal</span>
											<div className='font-semibold'>{selectedItem?.sucursal || ''}</div>
										</div>
										<div className='col-span-2'>
											<span className='text-sm text-dark/70'>Notas</span>
											<div className='font-semibold'>{selectedItem?.notas || ''}</div>
										</div>
									</div>
									<div className='sm:w-2xl w-full'>
										<table className='w-full border-collapse text-sm'>
											<thead>
												<tr>
													<th className='p-2 text-start'>Código</th>
													<th className='p-2 text-start'>Producto</th>
													<th className='p-2 text-start'>Cantidad</th>
												</tr>
											</thead>
											<tbody>
												<tr className='border-b border-dark/10'>
													<td className='p-2'>{selectedItem?.codigo || ''}</td>
													<td className='p-2' title={selectedItem?.producto}>{selectedItem?.producto || ''}</td>
													<td className='p-2'>{selectedItem?.cantidad || ''}</td>
												</tr>
											</tbody>
										</table>
									</div>
									<div className='flex gap-2 mt-2'>
										<Button text={'Cerrar'} className={'danger'} func={() => setIsActiveModal(false)} />
										<Button text={'Cancelar Reserva'} className={'secondary'} func={handleCancelReserva} disabled={saving || ['completada', 'cancelada'].includes((selectedItem?.estado || '').toLowerCase())} />
										<Button text={'Confirmar Entrega'} icon={<FiCheck />} className={'success'} func={handleConfirm} disabled={saving || ['completada', 'cancelada'].includes((selectedItem?.estado || '').toLowerCase())} />
									</div>
								</div>
							)
						) : (
							selectedItem && (
								<form onSubmit={handleSubmitEdit} className='flex flex-col gap-3'>
									<div className='grid grid-cols-2 gap-2'>
										<Input label={'Cliente'} placeholder={'Nombre del cliente'} inputClass={'no icon'} value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))} />
										<Input label={'Telefono'} placeholder={'Telefono del cliente'} inputClass={'no icon'} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
										<Input label={'Fecha de Entrega'} placeholder={'Fecha de entrega'} inputClass={'no icon'} type={'date'} value={form.fecha_entrega} onChange={e => setForm(f => ({ ...f, fecha_entrega: e.target.value }))} />
										<Input label={'Notas'} placeholder={'Agregar Notas...'} inputClass={'no icon'} isTextarea={true} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
									</div>
									<div className='grid grid-cols-2 gap-2 items-end'>
										<Input label={'Producto'} inputClass={'no icon'} value={selectedItem?.producto || ''} readOnly />
										<Input label={'Cantidad'} placeholder={'Cantidad'} inputClass={'no icon'} type={'number'} value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
									</div>
									<div className='flex gap-2'>
										<Button text={'Cancelar'} className={'danger'} func={() => setIsActiveModal(false)} />
										<Button text={'Guardar Cambios'} className={'success'} type={'submit'} disabled={saving} />
									</div>
								</form>
							)
						)}
					</ModalContainer>
				)}

				{message && <div className='fixed top-4 right-4 bg-dark/80 text-white px-3 py-2 rounded'>{message}</div>}
			</div>
		</>
	);
}
