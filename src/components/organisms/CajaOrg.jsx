'use client'
import React, { useEffect, useState } from 'react'
import { SucursalesService } from '@/services';
import { Input } from '../molecules';
import { Button } from '../atoms';
import { FiLock, FiTrash2, FiUnlock } from 'react-icons/fi';

export default function CajaOrg() {
	const [sucursales, setSucursales] = useState([]);
	const [cajas, setCajas] = useState('Abierta');
	const [cerrarCaja, setCerrarCaja] = useState(false);
	const [diferencia, setDiferencia] = useState(0)
	const historialCantidadEjemplo = [1, 2, 3, 4];
	console.log(sucursales);

	useEffect(() => {
		const fetchSucursal = async () => {
			const res = await SucursalesService.getSucursales();
			const sucursalesData = res.sucursales;
			setSucursales(sucursalesData || []);

			const initialState = {};
			(sucursalesData || []).forEach(s => {
				initialState[s.value] = {
					status: 'Cerrada',
					montoInicial: 0,
					horaApertura: null
				};
			});
			setCajas(initialState);
		}
		fetchSucursal();
	}, [])

	const handleOpenCaja = (id, monto) => {
		const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

		setCajas(prev => ({
			...prev,
			[id]: {
				...prev[id],
				status: 'Abierta',
				montoInicial: monto,
				horaApertura: horaActual
			}
		}));
	};

	const handleCloseCaja = (id) => {
		setCajas(prev => ({
			...prev,
			[id]: {
				...prev[id],
				status: 'Cerrada'
			}
		}));
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
															func={() => handleCloseCaja(sucursal.value)}
														/>
													</>
												) : (
													<div className='bg-dark/5 rounded-lg p-4 flex flex-col w-full gap-2'>
														<Input
															label={'Monto Final en Caja (C$)'}
															placeholder={'0.00'}
															inputClass={'no icon'}
														/>
														<Input
															label={'Total de Ventas (C$)'}
															placeholder={'0.00'}
															inputClass={'no icon'}
														/>
														<div className='p-2 bg-dark/10 rounded-md flex flex-col w-full gap-2'>
															<div className='flex flex-col'>
																<div className='flex justify-between'>
																	<span>Monto Inicial:</span>
																	<span className='font-semibold'>C$1000</span>
																</div>
																<div className='flex justify-between'>
																	<span>Ventas:</span>
																	<span className='font-semibold'>C$1000</span>
																</div>
															</div>
															<div className='flex flex-col py-1 border-y border-light/50'>
																<div className='flex justify-between'>
																	<span>Esperado:</span>
																	<span className='font-semibold text-primary'>C$1000</span>
																</div>
																<div className='flex justify-between'>
																	<span>Real:</span>
																	<span className='font-semibold text-primary'>C$1000</span>
																</div>
															</div>
															<div className='flex flex-col'>
																<div className={`flex justify-between ${diferencia === 0 ? 'text-success' : diferencia > 0 ? 'text-blue' : 'text-danger'}`}>
																	<span>Diferencia:</span>
																	<span className='font-semibold'>C$0</span>
																</div>
															</div>
														</div>
														<div className='flex gap-2'>
															<Button
																text={'Cerrar Caja'}
																className={'success'}
																func={() => handleCloseCaja(sucursal.value)}
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
							Historial ({historialCantidadEjemplo.length})
						</h2>
						<div className='flex flex-col gap-2 max-h-[477px] overflow-y-auto'>
							{historialCantidadEjemplo.map((index) => (
								<div key={index} className='p-4 border border-dark/20 rounded-lg grid grid-cols-2 gap-2'>
									<span className='font-semibold text-lg'>Sucursal Sur</span>
									<span className='border rounded-full text-center border-dark/30 font-semibold'>2025-05-11 23:05</span>
									<div className='flex flex-col'>
										<span className='font-semibold text-sm text-dark/60'>Monto Inicial</span>
										<span className='font-semibold'>C$1000.00</span>
									</div>
									<div className='flex flex-col'>
										<span className='font-semibold text-sm text-dark/60'>Monto Final</span>
										<span className='font-semibold text-primary'>C$1000.00</span>
									</div>
									<span className={`${diferencia === 0 ? 'text-success bg-success/20' : diferencia > 0 ? 'text-blue bg-blue/20' : 'text-danger bg-danger/20'} col-span-2 px-2 py-1 rounded-sm font-semibold`}>Diferencia: C$0.00</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
