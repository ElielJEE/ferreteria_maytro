'use client'
import React, { useState } from 'react'
import { Button, InfoCard, ModalContainer } from '../atoms'
import { FiActivity, FiDollarSign, FiEdit, FiEye, FiFile, FiPrinter, FiSearch, FiStopCircle, FiUser } from 'react-icons/fi'
import { BsBuilding, BsStop } from 'react-icons/bs'
import { MdBlock } from 'react-icons/md'
import { useActive, useFilter, useIsMobile } from '@/hooks'
import { Card, CreditosView, Input } from '../molecules'

export default function CreditosOrg() {
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const [searchTerm, setSearchTerm] = useState('');
	const [dateFilter, setDateFilter] = useState('');
	const [mode, setMode] = React.useState('')
	const [selectedCredit, setSelectedCredit] = React.useState(null)
	const { isActiveModal, setIsActiveModal } = useActive();

	const creditosDataEjemplo = [
		{
			id: 'CRE-001',
			cliente: {
				nombre: 'Juan Perez',
				telefono: '12345678',
			},
			deudaInicio: '2000.00',
			deudaActual: '1000.00',
			estado: 'Activa',
			items: [
				{
					productName: 'Martillo',
					cantidad: 5,
					productCode: 'HER001',
					unitPrice: 5,
					unidad: 'pzs'
				},
				{
					productName: 'Casa',
					cantidad: 2,
					productCode: 'HER001',
					unitPrice: 25,
					unidad: 'latas'
				},
				{
					productName: 'Carro',
					cantidad: 3,
					productCode: 'HER001',
					unitPrice: 15,
					unidad: 'mts'
				},
			],
			sucursal: {
				label: 'Sucursal Sur',
				value: 'S1'
			},
			fecha: '01/01/25',
			hecho_por: 'Ana Julia Orozco Gonzales',
			numeroFactura: 'FAC-001',
		},
		{
			id: 'CRE-001',
			cliente: {
				nombre: 'Julio Peralta',
				telefono: '12345678',
			},
			deudaInicio: '2000.00',
			deudaActual: '1000.00',
			estado: 'Activa',
			items: [
				{
					productName: 'Martillo',
					cantidad: 5,
					productCode: 'HER001',
					unitPrice: 5,
					unidad: 'pzs'
				},
				{
					productName: 'Casa',
					cantidad: 2,
					productCode: 'HER001',
					unitPrice: 25,
					unidad: 'latas'
				},
				{
					productName: 'Carro',
					cantidad: 3,
					productCode: 'HER001',
					unitPrice: 15,
					unidad: 'mts'
				},
			],
			sucursal: {
				label: 'Sucursal Centro',
				value: 'S1'
			},
			fecha: '01/01/25',
			hecho_por: 'Ana Julia Orozco Gonzales',
			numeroFactura: 'FAC-001',
		},
	]

	const filteredSales = useFilter({
		data: creditosDataEjemplo,
		searchTerm: searchTerm,
		selectedDate: dateFilter,
		matcher: (item, term) => {
			if (!term) return true;
			const q = term.toLowerCase();
			return (
				(item.cliente.nombre || '').toLowerCase().includes(q) ||
				(item.cliente.telefono || '').toLowerCase().includes(q) ||
				(item.numeroFactura?.toString() || '').toLowerCase().includes(q) // 👈 número de factura
			);
		},
	});


	const toggleModalType = async (type, item = null) => {
		setMode(type)
		if (type === 'ver' && item) {
			setSelectedCredit(item);
			setIsActiveModal(true)

		} else if (type === 'editar') {
			setSelectedSale(item);
			if (success) {
				setIsActiveModal(true)
			}

		} else if (type === 'print') {

		}
	}

	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
				<section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
					<InfoCard
						CardTitle={'Total de Creditos'}
						cardIcon={<FiFile className='h-5 w-5 text-secondary' />}
						cardIconColor={'secondary'}
						cardValue={'0'}
					/>
					<InfoCard
						CardTitle={'Total de Activos'}
						cardIcon={<FiActivity className='h-5 w-5 text-yellow' />}
						cardIconColor={'yellow'}
						cardValue={'0'}
					/>
					<InfoCard
						CardTitle={'Total de Cancelados'}
						cardIcon={<MdBlock className='h-5 w-5 text-danger' />}
						cardIconColor={'danger'}
						cardValue={'0'}
					/>
					<InfoCard
						CardTitle={'Valor Total'}
						cardIcon={<FiDollarSign className='h-5 w-5 text-success' />}
						cardIconColor={'success'}
						cardValue={'0'}
					/>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					<div className='w-full p-4'>
						<div className='w-full flex flex-col mb-4'>
							<h2 className='md:text-2xl font-semibold'>Historial de Creditos</h2>
							<span className='text-sm md:text-medium text-dark/50'>Listado de Creditos realizados</span>
						</div>

						<div className='w-full flex flex-col gap-1 sticky top-0 bg-light pt-2 mb-4'>
							<Input
								placeholder={'Buscar por cliente o N° Factura...'}
								type={'search'}
								iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
							<div className='md:w-1/2 w-full flex gap-2 flex-col md:flex-row'>
								<Input
									type={"date"}
									inputClass={'no icon'}
									value={dateFilter}
									onChange={(e) => setDateFilter(e.target.value)}
								/>
							</div>
						</div>
						{!isMobile ? (
							<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
								<table className='w-full border-collapse'>
									<thead className=' w-full border-b border-dark/20'>
										<tr className='w-full'>
											<th className='text-start text-dark/50 font-semibold p-2'>ID</th>
											<th className='text-start text-dark/50 font-semibold p-2'>N° Factura</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Fecha</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Cliente</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Deuda<br />Inicial</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Deuda<br />Actual</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Usuario</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filteredSales.map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2 text-start'>
													{item.id}
												</td>
												<td className='p-2'>
													{item.numeroFactura}
												</td>
												<td className='p-2 flex flex-col'>
													<span>{item.fecha}</span>
													<span className='text-sm text-dark/60'>{item.hora}</span>
												</td>
												<td className='p-2 text-dark/70 max-w-[180px] truncate'>
													<span className='flex items-center gap-1'>
														<BsBuilding />
														{item.sucursal ? item.sucursal.label : ''}
													</span>
												</td>
												<td className='p-2'>
													<div className='flex items-center gap-1'>
														<FiUser />
														{item.cliente.nombre || 'Consumidor Final'}
													</div>
													<span className='text-sm text-dark/60 font-normal'>{item.cliente.telefono || '-'}</span>
												</td>
												<td className='p-2 text-start text-primary'>{item.deudaInicio ? `C$${Number(item.deudaInicio).toLocaleString()}` : '-'}</td>
												<td className='p-2 text-start text-success'>{item.deudaActual ? `C$${Number(item.deudaActual).toLocaleString()}` : '-'}</td>
												<td className='p-2'>
													<div className='flex items-center gap-1'>
														<FiUser />
														{item.hecho_por}
													</div>
												</td>
												<td className='p-2'>
													<div className={`${item.estado === 'Activa' ? 'bg-success' : 'bg-secondary'} text-light rounded-full text-center px-2 text-sm`}>
														{item.estado}
													</div>
												</td>
												<td className='p-2 flex justify-center items-center'>
													<div className='flex gap-2 justify-center w-1/2'>
														<Button className={'primary'} icon={<FiEye />} func={() => toggleModalType('ver', item)} />
														<Button className={'blue'} icon={<FiEdit />} func={() => toggleModalType('editar', item)} />
														<Button className={'success'} icon={<FiPrinter />} func={() => toggleModalType('print', item)} />
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='flex flex-col mt-2 gap-2'>
								{filteredSales.map((item, index) => (
									<Card
										productName={`${item.cliente.nombre || 'Consumidor Final'} | ${item.cliente.telefono || 'N/A'}`}
										key={index}
										sucursal={item.sucursal.label || ''}
										status={item.estado.toLowerCase()}
										id={item.id}
									>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Fecha</span>
											<span className='text-lg font-semibold'>{item.fecha}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>N° Factura</span>
											<div className='text-lg font-semibold'>{item.numeroFactura}</div>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Deuda Inicial</span>
											<span className='text-lg font-semibold text-primary'>C${item.deudaInicio}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Deuda Actual</span>
											<div className='text-lg font-semibold text-success'>C${item.deudaActual}</div>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Usuario</span>
											<span className='text-lg font-semibold'>{item.hecho_por}</span>
										</div>
										<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
											<Button className={"primary"} text={"Ver"} icon={<FiEye />} func={() => toggleModalType('ver', item)} />
											<Button className={"blue"} text={"Editar"} icon={<FiEdit />} func={() => toggleModalType('editar', item)} />
											<Button className={'success'} text={"Imprimir"} icon={<FiPrinter />} func={() => toggleModalType('print', item)} />
										</div>
									</Card>
								))}
							</div>
						)}
					</div>
				</section>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={mode === 'ver' ? 'Detalles del Credito' : mode === 'editar' ? 'Editar Credito' : mode === 'eliminar' ? 'Eliminar venta' : ''}
						modalDescription={mode === 'ver' ? 'Información completa de la transacción' : mode === 'editar' ? 'Editar Credito' : mode === 'eliminar' ? 'Eliminar venta' : ''}
						isForm={mode === 'editar' ? true : false}
					>
						{mode === 'ver' && <CreditosView creditData={selectedCredit} onClose={() => setIsActiveModal(false)} />}
						{mode === 'editar' && <SaleEdit sale={selectedSale} onClose={() => setIsActiveModal(false)} onSaved={() => fetchSales()} />}
						{mode === 'eliminar' && <SaleDelete sale={selectedSale} onClose={() => setIsActiveModal(false)} onDeleted={() => fetchSales()} />}
					</ModalContainer>
				)
			}
		</>
	)
}
