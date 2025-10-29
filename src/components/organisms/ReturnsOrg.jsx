'use client'
import React from 'react'
import { Button, InfoCard } from '../atoms'
import { FiCheckCircle, FiClock, FiEdit, FiEye, FiFileText, FiPlus, FiPrinter, FiRotateCcw, FiSearch } from 'react-icons/fi'
import { Card, DropdownMenu, Input } from '../molecules'
import { useIsMobile } from '@/hooks'
import { BsBuilding } from 'react-icons/bs'

export default function ReturnsOrg() {
	const isMobile = useIsMobile({ breakpoint: 1024 })

	const devolucionesEjemplos = [
		{
			id: 'DEV-001', productName: 'Martillo', productCode: 'H001', cliente: 'juan perez', sucursal: {
				id: "s1",
				name: "Sucursal Sur",
			}, telefono: '84005907', cantidad: '3', fecha: '08/05/2025', hora: '13:23', estado: 'pendiente', evaluacion: 'sin evaluar'
		},
		{
			id: 'DEV-001', productName: 'Martillo', productCode: 'H001', cliente: 'juan perez', sucursal: {
				id: "s1",
				name: "Sucursal Sur",
			}, telefono: '84005907', cantidad: '3', fecha: '08/05/2025', hora: '13:23', estado: 'procesado', evaluacion: 'daniado por oxidacion'
		},
		{
			id: 'DEV-001', productName: 'Martillo', productCode: 'H001', cliente: 'juan perez', sucursal: {
				id: "s1",
				name: "Sucursal Sur",
			}, telefono: '84005907', cantidad: '3', fecha: '08/05/2025', hora: '13:23', estado: 'procesado', evaluacion: 'producto en buen estado, se hizo cambio al cliente.'
		},
	]

	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
				<section className='grid md:grid-cols-4 grid-cols-1 gap-4'>
					<InfoCard
						CardTitle={"Total Devoluciones"}
						cardValue={"3"}
						cardIcon={<FiRotateCcw className='h-5 w-5 text-primary' />}
						cardIconColor={'primary'}
					/>
					<InfoCard
						CardTitle={"Total Pendientes"}
						cardValue={"1"}
						cardIcon={<FiClock className='h-5 w-5 text-yellow' />}
						cardIconColor={'yellow'}
					/>
					<InfoCard
						CardTitle={"Total Procesadas"}
						cardValue={"2"}
						cardIcon={<FiCheckCircle className='h-5 w-5 text-success' />}
						cardIconColor={'success'}
					/>
				</section>
				<section className='p-6 border border-dark/20 rounded-lg flex flex-col gap-4'>
					<div className='flex flex-col md:flex-row justify-between'>
						<div>
							<h2 className='md:text-2xl font-semibold'>
								Gestion de Devoluciones
							</h2>
							<span className='text-sm md:text-medium text-dark/50'>
								Administra y Evalua las devoluciones de productos.
							</span>
						</div>
						<div>
							<Button
								text={'Agregar Devolucion'}
								className={'primary'}
								icon={<FiPlus />}
							/>
						</div>
					</div>
					<div className='flex flex-col gap-2 w-full'>
						<Input
							type={'search'}
							placeholder={'Buscar cotizaciones...'}
							iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
						/>
						<div className='md:w-1/2 w-full flex gap-2 flex-col md:flex-row'>
							<Input
								type={'date'}
								inputClass={'no icon'}
							/>
							<DropdownMenu
								options={['Todas', 'Pendiente', 'Procesado',]}
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
											<th className='text-start text-dark/50 font-semibold p-2'>Producto</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Cliente</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Cantidad</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Fecha</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Evaluacion</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{devolucionesEjemplos.map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2 text-start'>
													{item.id}
												</td>
												<td className='p-2'>
													<div className='flex flex-col'>
														<span>{item.productName}</span>
														<span className='text-sm text-dark/60'>{item.productCode}</span>
													</div>
												</td>
												<td className='p-2'>
													<div className='flex items-center gap-1 truncate text-dark/70'>
														<BsBuilding />
														{item.sucursal.name}
													</div>
												</td>
												<td className='p-2'>
													<div className='flex flex-col'>
														<span>{item.cliente}</span>
														<span className='text-sm text-dark/60'>{item.telefono}</span>
													</div>
												</td>
												<td className='p-2 text-center'>
													{item.cantidad}
												</td>
												<td className='p-2 flex flex-col'>
													<span>{item.fecha}</span>
													<span className='text-sm text-dark/60'>{item.hora}</span>
												</td>
												<td className='p-2'>
													<span className={`${item.estado === 'procesado' ? 'bg-success' : 'bg-yellow'} text-light rounded-full px-2 text-sm`}>
														{item.estado.charAt(0).toUpperCase() + item.estado.slice(1).toLowerCase()}
													</span>
												</td>
												<td className='p-2 truncate max-w-[180px]' title={item.evaluacion}>
													{item.evaluacion}
												</td>
												<td className='p-2 flex justify-center items-center'>
													<div className='flex gap-2 justify-center w-1/2'>
														<Button className={'primary'} icon={<FiEye />} />
														<Button className={'blue'} icon={<FiEdit />} />
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='flex flex-col gap-4'>
								{devolucionesEjemplos.map((item, index) => (
									<div key={index}>
										<Card
											productName={item.productName}
											status={item.estado}
											id={item.productCode}
										>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Cliente</span>
												<span className='text-lg font-semibold'>{item.cliente}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Telefono</span>
												<span className='text-lg font-semibold'>{item.telefono}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Cantidad</span>
												<span className='text-lg font-semibold'>{item.cantidad}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Fecha</span>
												<span className='text-lg font-semibold'>{item.fecha}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Hora</span>
												<span className='text-lg font-semibold'>{item.hora}</span>
											</div>
											<div className='flex flex-col col-span-2'>
												<span className='text-sm text-dark/70'>Evaluacion</span>
												<span className='text-lg font-semibold'>{item.evaluacion}</span>
											</div>
											<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
												<Button className={"primary"} text={"Ver"} icon={<FiEye />} />
												<Button className={"blue"} text={"Editar"} icon={<FiEdit />} />
											</div>
										</Card>
									</div>
								))}
							</div>
						)
						}
					</div>
				</section >
			</div >
		</>
	)
}
