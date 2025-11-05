'use client'
import React, { useState } from 'react'
import { Button, InfoCard, ModalContainer } from '../atoms'
import { FiCheckCircle, FiClock, FiEdit, FiEye, FiFileText, FiPlus, FiPrinter, FiRotateCcw, FiSearch } from 'react-icons/fi'
import { Card, DropdownMenu, Input, ReturnCreate, ReturnEdit, ReturnView } from '../molecules'
import { useActive, useIsMobile } from '@/hooks'
import { BsBuilding } from 'react-icons/bs'

export default function ReturnsOrg() {
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const [mode, setMode] = useState();
	const { isActiveModal, setIsActiveModal } = useActive();
	const [returnData, setReturnData] = useState({});

	const devolucionesEjemplos = [
		{
			id: 'DEV-001', productName: 'Martillo', productCode: 'H001', cliente: 'juan perez', sucursal: {
				id: "s1",
				name: "Sucursal Sur",
			}, telefono: '84005907', cantidad: '3', fecha: '08/05/2025', hora: '13:23', motivo: "El motivo de la devolucion."
		},
		{
			id: 'DEV-001', productName: 'Martillo', productCode: 'H001', cliente: 'juan perez', sucursal: {
				id: "s1",
				name: "Sucursal Sur",
			}, telefono: '84005907', cantidad: '3', fecha: '08/05/2025', hora: '13:23', motivo: "El motivo de la devolucion."
		},
		{
			id: 'DEV-001', productName: 'Martillo', productCode: 'H001', cliente: 'juan perez', sucursal: {
				id: "s1",
				name: "Sucursal Sur",
			}, telefono: '84005907', cantidad: '3', fecha: '08/05/2025', hora: '13:23', motivo: "El motivo de la devolucion."
		},
	]

	const toggleModalType = (type, data) => {
		setMode(type)

		if (type === 'create') {
			setIsActiveModal(true);

		} else if (type === 'edit') {
			setReturnData(data);
			setIsActiveModal(true);

		} else if (type === 'ver') {
			setReturnData(data);
			setIsActiveModal(true);

		}
	}

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
					</div>
					<div className='flex flex-col md:flex-row gap-2 w-full'>
						<div className='w-full'>
							<Input
								type={'search'}
								placeholder={'Buscar cotizaciones...'}
								iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
							/>
						</div>
						<Input
							type={'date'}
							inputClass={'no icon'}
						/>
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
											<th className='text-start text-dark/50 font-semibold p-2'>Motivo</th>
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
												<td className='p-2 truncate max-w-[180px]' title={item.motivo}>
													{item.motivo || 'Sin Evaluar'}
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
												<span className='text-lg font-semibold'>{item.evaluacion || 'Sin Evaluar'}</span>
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
			{
				isActiveModal &&
				<ModalContainer
					setIsActiveModal={setIsActiveModal}
					modalTitle={mode === 'create' ? 'Agregar devolucion' : mode === 'edit' ? 'Editar devolucion' : 'Detalles de la devolucion'}
					modalDescription={mode === 'create' ? 'Agregar nueva devolucion de producto' : mode === 'edit' ? 'Editar o Corregir la devolucion del producto' : 'Detalles y Proceso de la devolucion del producto'}
					isForm={true}
				>
					{mode === 'create' && <ReturnCreate onClose={() => setIsActiveModal(false)} />}
					{mode === 'edit' && <ReturnEdit returnData={returnData} onClose={() => setIsActiveModal(false)} />}
					{mode === 'ver' && <ReturnView returnData={returnData} onClose={() => setIsActiveModal(false)} />}
				</ModalContainer>
			}
		</>
	)
}
