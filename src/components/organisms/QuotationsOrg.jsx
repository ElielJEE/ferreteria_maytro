'use client'
import React, { useState } from 'react'
import { Button, InfoCard, ModalContainer, SwitchButton } from '../atoms'
import { FiEdit, FiEye, FiFileText, FiPrinter, FiSearch, FiUser } from 'react-icons/fi'
import { Card, Input, QueoteView, QuoteEdit } from '../molecules'
import { useActive, useIsMobile } from '@/hooks'
import { BsBuilding } from 'react-icons/bs'


export default function QuotationsOrg() {
	const [mostrarExpirados, setMostrarExpirados] = useState();
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const [mode, setMode] = useState('ver');
	const { isActiveModal, setIsActiveModal } = useActive();
	const [selectedQuote, setSelectedQuote] = useState();

	const cotizacionesEjemplo = [
		{
			id: 'COT-001', fecha: '09/10/2025', cliente: 'Juan Perez', telefono: '84005907', items: '5', total: '2900.00', fechaExp: '11/10/2025', estado: 'activa', creadaPor: 'Maria Garcia', sucursal: {
				id: 's1',
				name: 'sucursal sur'
			}, products: [
				{ productName: 'martillo', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'cable', productCode: '1234', cantidad: '3', measureUnit: 'metro', unitPrice: '20' },
				{ productName: 'pala', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'taladro', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'tornillos', productCode: '1234', cantidad: '40', measureUnit: 'pieza', unitPrice: '20' },
			], subtotal: 2900.00
		},
		{
			id: 'COT-001', fecha: '09/10/2025', cliente: 'Juan Perez', telefono: '84005907', items: '5', total: '2900.00', fechaExp: '11/10/2025', estado: 'expirada', creadaPor: 'Maria Garcia', sucursal: {
				id: 's1',
				name: 'sucursal sur'
			}, products: [
				{ productName: 'martillo', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'cable', productCode: '1234', cantidad: '3', measureUnit: 'metro', unitPrice: '20' },
				{ productName: 'pala', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'taladro', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'tornillos', productCode: '1234', cantidad: '40', measureUnit: 'pieza', unitPrice: '20' },
			], subtotal: 2900.00
		},
		{
			id: 'COT-001', fecha: '09/10/2025', cliente: 'Juan Perez', telefono: '84005907', items: '5', total: '2900.00', fechaExp: '11/10/2025', estado: 'activa', creadaPor: 'Maria Garcia', sucursal: {
				id: 's1',
				name: 'sucursal sur'
			}, products: [
				{ productName: 'martillo', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'cable', productCode: '1234', cantidad: '3', measureUnit: 'metro', unitPrice: '20' },
				{ productName: 'pala', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'taladro', productCode: '1234', cantidad: '3', measureUnit: 'unidad', unitPrice: '20' },
				{ productName: 'tornillos', productCode: '1234', cantidad: '40', measureUnit: 'pieza', unitPrice: '20' },
			], subtotal: 2900.00
		},
	]

	const toggleModalMode = (type, itemData) => {
		setMode(type);
		if (type === 'ver') {
			setSelectedQuote(itemData);
			setIsActiveModal(true)
		} else if (type === 'edit') {
			setSelectedQuote(itemData);
			setIsActiveModal(true)
		}
	}

	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
				<section className='grid md:grid-cols-4 grid-cols-1'>
					<InfoCard
						CardTitle={"Total"}
						cardValue={"3"}
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
										{cotizacionesEjemplo.map((item, index) => (
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
														<Button className={'blue'} icon={<FiEdit />} func={() => toggleModalMode('edit', item)} />
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
								{cotizacionesEjemplo.map((item, index) => (
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
												<Button className={"primary"} text={"Ver"} icon={<FiEye />} />
												<Button className={"blue"} text={"Editar"} icon={<FiEdit />} />
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
						modalTitle={mode === 'ver' ? 'Detalles de Cotizacion' : mode === 'editar' ? 'Editar Cotizacion' : mode === 'eliminar' ? 'Eliminar venta' : ''}
						modalDescription={mode === 'ver' ? 'Información completa de la cotizacion.' : mode === 'editar' ? 'Editar cotizacion' : mode === 'eliminar' ? 'Eliminar venta' : ''}
					>
						{mode === 'ver' && <QueoteView quote={selectedQuote} onClose={() => setIsActiveModal(false)} />}
						{mode === 'edit' && <QuoteEdit quote={selectedQuote} onClose={() => setIsActiveModal(false)} />}
					</ModalContainer>
				)
			}
		</>
	)
}
