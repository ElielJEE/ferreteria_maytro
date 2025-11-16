'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { SucursalesService, CajaService, SalesService } from '@/services';
import { Input } from '../molecules';
import { Button } from '../atoms';
import { FiLock, FiTrash2, FiUnlock } from 'react-icons/fi';

export default function CajaOrg() {
	const [sucursales, setSucursales] = useState([]);
	const [cajas, setCajas] = useState({}); // por sucursal: { status, montoInicial, horaApertura, sesionId }
	const [cerrarCaja, setCerrarCaja] = useState({}); // flags por sucursal
	const [diferenciaMap, setDiferenciaMap] = useState({});
	const [historial, setHistorial] = useState([]);
	const [totalVentas, setTotalVentas] = useState({}); // map sucursalId -> total ventas hoy
	const [esperadoMap, setEsperadoMap] = useState({});
	const [cajaErrors, setCajaErrors] = useState({}); // sucursalId -> error message
	console.log(sucursales);

	useEffect(() => {
		const fetchData = async () => {
			const res = await SucursalesService.getSucursales();
			const sucursalesData = res.sucursales || [];
			setSucursales(sucursalesData);
			// cargar estado de caja por sucursal
			const initialState = {};
			for (const s of sucursalesData) {
				try {
					const est = await CajaService.getEstado(s.value);
					const abierta = est?.abierta;
					if (abierta) {
								initialState[s.value] = {
									status: 'Abierta',
									montoInicial: Number(abierta.MONTO_INICIAL || 0),
									horaApertura: new Date(abierta.FECHA_APERTURA).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
									fechaApertura: abierta.FECHA_APERTURA,
									sesionId: abierta.ID_SESION,
								};
					} else {
						initialState[s.value] = { status: 'Cerrada', montoInicial: 0, horaApertura: null, sesionId: null };
					}
				} catch {
					initialState[s.value] = { status: 'Cerrada', montoInicial: 0, horaApertura: null, sesionId: null };
				}
			}
			setCajas(initialState);
			// cargar historial general (últimos 20)
			try {
				const h = await CajaService.getHistorial({ limit: 20 });
				setHistorial(h?.historial || []);
			} catch {}
		}
		fetchData();
	}, [])

	// Cuando se abre el panel de cierre para una sucursal, cargar total de ventas del dia y calcular esperado
	useEffect(() => {
		const keys = Object.keys(cerrarCaja).filter(k => cerrarCaja[k]);
		if (!keys.length) return;
		for (const sucId of keys) {
			(async () => {
				try {
					// pedir historial de ventas para la sucursal (ruta /api/ventas?sucursal=...)
					const res = await SalesService.getSalesHistory(sucId);
					let ventas = [];
					if (!res) ventas = [];
					else if (Array.isArray(res)) ventas = res;
					else if (Array.isArray(res.ventas)) ventas = res.ventas;
					// sumar solo las ventas de hoy (la API devuelve campo fecha en 'YYYY-MM-DD')
					const today = new Date();
					const y = today.getFullYear();
					const m = String(today.getMonth() + 1).padStart(2, '0');
					const d = String(today.getDate()).padStart(2, '0');
					const todayStr = `${y}-${m}-${d}`;
					const totalHoy = (ventas || []).reduce((acc, v) => {
						const vFecha = (v.fecha || '').toString();
						if (vFecha === todayStr) return acc + Number(v.total || 0);
						return acc;
					}, 0);
					setTotalVentas(prev => ({ ...prev, [sucId]: Number(totalHoy.toFixed(2)) }));
					const inicial = Number(cajas?.[sucId]?.montoInicial || 0);
					setEsperadoMap(prev => ({ ...prev, [sucId]: Number((inicial + totalHoy).toFixed(2)) }));
				} catch (err) {
					console.error('Error cargando ventas para cierre de caja:', err);
				}
			})();
		}
	}, [cerrarCaja]);

	// Recalcular diferencias cuando cambia el esperado (ventas cargadas) o montoFinal en cajas
	useEffect(() => {
		const open = Object.keys(cerrarCaja).filter(k => cerrarCaja[k]);
		for (const sucId of open) {
			const esperado = Number(esperadoMap[sucId] || 0);
			const montoFinal = Number(cajas?.[sucId]?.montoFinal || 0);
			setDiferenciaMap(prev => ({ ...prev, [sucId]: Number((montoFinal - esperado).toFixed(2)) }));
		}
	}, [esperadoMap, cajas, cerrarCaja]);

	const handleOpenCaja = async (id, monto) => {
		try {
			const res = await CajaService.abrirCaja({ sucursal_id: id, monto_inicial: Number(monto || 0) });
			const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			setCajas(prev => ({
				...prev,
				[id]: { status: 'Abierta', montoInicial: Number(monto || 0), horaApertura: horaActual, sesionId: res?.sesion_id || null }
			}));
			// refrescar historial
			const h = await CajaService.getHistorial({ limit: 20 });
			setHistorial(h?.historial || []);
		} catch (e) {
			console.error('Abrir caja error:', e);
		}
	};

	const handleCloseCaja = async (id, montoFinal) => {
		try {
			// Validar que el usuario haya ingresado algo (campo obligatorio)
			const raw = cajas?.[id]?.montoFinalRaw;
			if (raw === undefined || raw === null || String(raw).trim() === '') {
				setCajaErrors(prev => ({ ...prev, [id]: 'Ingresa el monto final antes de cerrar.' }));
				return;
			}
			setCajaErrors(prev => ({ ...prev, [id]: undefined }));
			const sesionId = cajas?.[id]?.sesionId || null;
			await CajaService.cerrarCaja({ sesion_id: sesionId, sucursal_id: id, monto_final: Number(montoFinal || 0) });
			setCajas(prev => ({ ...prev, [id]: { status: 'Cerrada', montoInicial: 0, horaApertura: null, sesionId: null } }));
			setCerrarCaja(prev => ({ ...prev, [id]: false }));
			// refrescar historial y aplicar la diferencia calculada localmente para que se muestre inmediatamente
			const h = await CajaService.getHistorial({ limit: 20 });
			const rawHist = h?.historial || [];
			let updatedHist = rawHist;
			// Si tenemos el id de sesión cerrado, actualizar su DIFERENCIA con el valor calculado en diferenciaMap
			if (sesionId) {
				const diffVal = Number(diferenciaMap[id] || 0);
				updatedHist = rawHist.map(item => (item.ID_SESION === sesionId ? { ...item, DIFERENCIA: diffVal } : item));
			}
			setHistorial(updatedHist);
		} catch (e) {
			console.error('Cerrar caja error:', e);
		}
	};

	return (
		<div className='p-6'>
			<h2 className='md:text-2xl font-semibold'>Configuracion de cajas en sucursales</h2>
			<span className='text-sm md:text-medium text-dark/50'>Configura el monto de la apertura de caja para cada una de las sucursales.</span>
			<div className='grid grid-cols-3 gap-4 mt-4'>
				<div className='col-span-2 flex flex-col gap-4'>
					{sucursales &&
						sucursales.map((sucursal, index) => {
							const caja = cajas[sucursal.value];
							return (
								<div key={index} className='border border-dark/20 p-4 rounded-lg flex flex-col gap-2'>
									<h2 className='md:text-lg font-semibold'>Caja {sucursal.label}</h2>
									{caja?.status === 'Cerrada' && (
										<div className='flex gap-2'>
											<div className='w-full'>
												<Input
													inputClass={'no icon'}
													placeholder={'Ingrese monto de apertura de caja...'}
													type={'number'}
													value={cajas[sucursal.value]?.montoInicial || ''}
													onChange={(e) =>
														setCajas(prev => ({
															...prev,
															[sucursal.value]: {
																...prev[sucursal.value],
																montoInicial: Number(e.target.value)
															}
														}))
													}
												/>
											</div>
											<div className='w-1/2'>
												<Button
													text={'Abrir caja'}
													className={'success'}
													icon={<FiUnlock />}
													func={() => handleOpenCaja(sucursal.value, cajas[sucursal.value]?.montoInicial || 0)}
												/>
											</div>
										</div>
									)}
									{caja?.status === 'Abierta' && (
										<div className='grid grid-cols-3'>
											<div className='flex flex-col gap-1'>
												<span className='text-dark/60 font-semibold'>Hora de Apertura</span>
												<span className='font-bold'>{caja.horaApertura}</span>
											</div>
											<div className='flex flex-col gap-1'>
												<span className='text-dark/60 font-semibold'>Monto Inicial</span>
												<span className='font-bold text-primary'>C${cajas[sucursal.value]?.montoInicial.toFixed(2)}</span>
											</div>
											<div className='flex flex-col gap-1'>
												<span className='text-dark/60 font-semibold'>Estado</span>
												<span className='font-semibold bg-success/20 border border-success rounded-full px-2 w-max text-sm text-success flex items-center gap-1'>
													<FiUnlock />
													Abierta
												</span>
											</div>
											<div className='border-t col-span-3 pt-3 mt-3 border-dark/20 flex gap-2'>
												{!cerrarCaja[sucursal.value] ? (
													<>
														<Button
															text={'Cerrar Caja'}
															className={'secondary'}
															icon={<FiLock />}
															func={() =>
																setCerrarCaja(prev => ({ ...prev, [sucursal.value]: true }))
															}
														/>
														<Button
															text={'Deshacer Apertura'}
															className={'danger'}
															icon={<FiTrash2 />}
															func={() => handleCloseCaja(sucursal.value, 0)}
														/>
													</>
												) : (
													<div className='bg-dark/5 rounded-lg p-4 flex flex-col w-full gap-2'>
														<Input
															label={'Monto Final en Caja (C$)'}
															placeholder={'0.00'}
															inputClass={'no icon'}
															type={'number'}
															value={cajas?.[sucursal.value]?.montoFinalRaw ?? ''}
															onChange={(e) => {
																const rawVal = e.target.value;
																const numVal = rawVal === '' ? null : Number(rawVal);
																setCajas(prev => ({ ...prev, [sucursal.value]: { ...prev[sucursal.value], montoFinalRaw: rawVal, montoFinal: numVal ?? 0 } }));
																// calcular diferencia usando esperadoMap (si no existe, calcular con montoInicial + totalVentas)
																const inicial = Number(cajas?.[sucursal.value]?.montoInicial || 0);
																const ventas = Number(totalVentas[sucursal.value] || 0);
																const esperado = Number((esperadoMap[sucursal.value] ?? (inicial + ventas)).toFixed(2));
																setEsperadoMap(prev => ({ ...prev, [sucursal.value]: esperado }));
																const diffBase = numVal == null ? 0 : numVal;
																setDiferenciaMap(prev => ({ ...prev, [sucursal.value]: Number((diffBase - esperado).toFixed(2)) }));
																if (rawVal !== '') setCajaErrors(prev => ({ ...prev, [sucursal.value]: undefined }));
															}}
															/>
															{cajaErrors[sucursal.value] && <span className='text-danger text-xs'>{cajaErrors[sucursal.value]}</span>}
														<Input
															label={'Total de Ventas (C$)'}
															placeholder={'0.00'}
															inputClass={'no icon'}
															value={Number(totalVentas[sucursal.value] || 0).toFixed(2)}
															onChange={() => {}}
														/>
														<div className='p-2 bg-dark/10 rounded-md flex flex-col w-full gap-2'>
															<div className='flex flex-col'>
																<div className='flex justify-between'>
																	<span>Monto Inicial:</span>
																	<span className='font-semibold'>C${Number(cajas[sucursal.value]?.montoInicial || 0).toFixed(2)}</span>
																</div>
																<div className='flex justify-between'>
																	<span>Ventas:</span>
																	<span className='font-semibold'>C${Number(totalVentas[sucursal.value] || 0).toFixed(2)}</span>
																</div>
															</div>
															<div className='flex flex-col py-1 border-y border-light/50'>
																<div className='flex justify-between'>
																	<span>Esperado:</span>
																	<span className='font-semibold text-primary'>C${Number(esperadoMap[sucursal.value] || 0).toFixed(2)}</span>
																</div>
																<div className='flex justify-between'>
																	<span>Real:</span>
																	<span className='font-semibold text-primary'>C${Number(cajas?.[sucursal.value]?.montoFinal || 0).toFixed(2)}</span>
																</div>
															</div>
															<div className='flex flex-col'>
																<div className={`flex justify-between ${((diferenciaMap[sucursal.value] || 0) === 0) ? 'text-success' : (diferenciaMap[sucursal.value] || 0) > 0 ? 'text-blue' : 'text-danger'}`}>
																	<span>Diferencia:</span>
																	<span className='font-semibold'>C${Number(diferenciaMap[sucursal.value] || 0).toFixed(2)}</span>
																</div>
															</div>
														</div>
														<div className='flex gap-2'>
															<Button
																text={'Cerrar Caja'}
																className={'success'}
																func={() => handleCloseCaja(sucursal.value, cajas?.[sucursal.value]?.montoFinal || 0)}
															/>
															<Button
																text={'Cancelar'}
																className={'transparent'}
																func={() =>
																	setCerrarCaja(prev => ({ ...prev, [sucursal.value]: false }))
																}
															/>
														</div>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							)
						})
					}
				</div>
				<div className='flex gap-2 flex-col'>
					<div className='p-6 bg-dark/5 border border-dark/20 rounded-lg flex flex-col'>
						<h2 className='font-semibold text-lg'>Resumen del Dia</h2>
						<div className='flex flex-col pb-2 pt-2'>
							<span className='font-semibold text-sm text-dark/50'>CAJAS ABIERTAS</span>
							<span className='text-primary text-2xl font-bold'>
								{Object.values(cajas).filter(c => c.status === 'Abierta').length}
							</span>
						</div>
						<div className='flex flex-col border-t border-b border-dark/10 pb-2 pt-2'>
							<span className='font-semibold text-sm text-dark/50'>TOTAL INICIAL ABIERTO</span>
							<span className='text-dark text-2xl font-bold'>
								C$ {Object.values(cajas)
									.filter(c => c.status === 'Abierta')
									.reduce((acc, c) => acc + (c.montoInicial || 0), 0)
									.toFixed(2)}</span>
						</div>
						<div className='flex flex-col pt-2'>
							<span className='font-semibold text-sm text-dark/50'>CAJAS CERRADAS</span>
							<span className='text-dark/70 text-2xl font-bold'>
								{Object.values(cajas).filter(c => c.status === 'Cerrada').length}
							</span>
						</div>
					</div>
					<div className='p-6 border border-dark/20 rounded-lg flex flex-col gap-2'>
						<h2 className='flex gap-1 items-center text-lg font-semibold'>
							<FiLock />
							Historial ({historial.length})
						</h2>
						<div className='flex flex-col gap-2 max-h-[477px] overflow-y-auto'>
							{historial.map((h) => {
								const montoFinalMostrar = h.ESTADO === 'cerrada' && h.MONTO_FINAL != null ? Number(h.MONTO_FINAL).toFixed(2) : '--';
								const sucursalNombre = h.NOMBRE_SUCURSAL || h.ID_SUCURSAL || 'Sucursal';
								const diff = Number(h.DIFERENCIA || 0);
								return (
									<div key={h.ID_SESION} className='p-4 border border-dark/20 rounded-lg grid grid-cols-2 gap-2'>
										<span className='font-semibold text-lg'>{sucursalNombre}</span>
										<span className='border rounded-full text-center border-dark/30 font-semibold'>{new Date(h.FECHA_APERTURA).toLocaleString()}</span>
										<div className='flex flex-col'>
											<span className='font-semibold text-sm text-dark/60'>Monto Inicial</span>
											<span className='font-semibold'>C${Number(h.MONTO_INICIAL || 0).toFixed(2)}</span>
										</div>
										<div className='flex flex-col'>
											<span className='font-semibold text-sm text-dark/60'>Monto Final</span>
											<span className='font-semibold text-primary'>C${montoFinalMostrar}</span>
										</div>
										<span className={`${diff === 0 ? 'text-success bg-success/20' : diff > 0 ? 'text-blue bg-blue/20' : 'text-danger bg-danger/20'} col-span-2 px-2 py-1 rounded-sm font-semibold`}>Diferencia: C${diff.toFixed(2)}</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
