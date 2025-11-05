'use client'
import { useActive, useFilter, useIsMobile } from '@/hooks';
import { SucursalesService } from '@/services';
import React, { useEffect, useState } from 'react'
import { FiEdit, FiPlus, FiSearch, FiTrash2, FiUsers } from 'react-icons/fi';
import { Button, InfoCard, ModalContainer } from '../atoms';
import { Card, Input } from '../molecules';
import { BsBuilding } from 'react-icons/bs';

export default function SucursalesOrg() {
	const [sucursales, setSucursales] = useState([]);
	const [searchTerm, setSearchTerm] = useState();
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const { isActiveModal, setIsActiveModal } = useActive();

	useEffect(() => {
		const fetchSucursales = async () => {
			const res = await SucursalesService.getSucursales();
			const sucursalesData = res.sucursales;
			setSucursales(sucursalesData || []);
		}
		fetchSucursales();
	}, []);
	console.log(sucursales);

	const filteredSucursales = useFilter({
		data: sucursales,
		searchTerm,
		matcher: (item, term) =>
			item.label.toLowerCase().includes(term.toLowerCase())
	});

	const handleSubmit = (e) => {
		e.preventDefault()

		setIsActiveModal(false)
	}

	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
					<InfoCard
						CardTitle={"Total Clientes"}
						cardValue={sucursales.length.toString() || 0}
						cardIconColor={"primary"}
						cardIcon={<BsBuilding className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
					/>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
						<div className='flex flex-col'>
							<h2 className='md:text-2xl font-semibold'>Lista de Sucursales</h2>
							<span className='text-sm md:text-medium text-dark/50'>Gestiona y administra la lista de sucursales</span>
						</div>
						<div>
							<Button
								text={'Nueva Sucursal'}
								icon={<FiPlus />}
								className={'primary'}
								func={() => setIsActiveModal(true)}
							/>
						</div>
					</div>
					<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-4'>
						<Input
							placeholder={"Buscar sucursal..."}
							type={"search"}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
						/>
					</div>
					{!isMobile ?
						(
							<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
								<table className='w-full border-collapse'>
									<thead className=' w-full border-b border-dark/20'>
										<tr className='w-full'>
											<th className='text-start text-dark/50 font-semibold p-2'>#</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Codigo</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Nombre</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filteredSucursales.map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2 text-start'>{index + 1}</td>
												<td className='p-2 text-start'>{item.value}</td>
												<td className='p-2 text-start'>{item.label}</td>
												<td className='p-2 text-center'>
													<div className='flex gap-2 justify-center'>
														<Button
															className={"blue"}
															icon={<FiEdit className='h-4 w-4' />}
															func={() => toggleModalType('edit', item)}
														/>
														<Button
															className={"danger"}
															icon={<FiTrash2 className='h-4 w-4' />}
															func={() => toggleModalType('delete', item)}
														/>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='w-full overflow-x-auto mt-2 flex flex-col gap-2'>
								{
									filteredSucursales.map((item, index) => (
										<Card
											key={index}
											productName={item.nombre}
										>
											<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
												<Button className={"blue"} text={"Editar"} icon={<FiEdit />} />
												<Button className={"danger"} text={"Eliminar"} icon={<FiTrash2 />} />
											</div>
										</Card>
									))
								}
							</div>
						)
					}
				</section>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={"Crea una nueva sucursal"}
						modalDescription={"Crea una nueva sucursal para ferreteria El Maytro"}
						isForm={true}
					>
						<form action="" className='flex flex-col gap-4' onSubmit={handleSubmit}>
							<Input
								label={'Nombre de la Sucursal'}
								inputClass={'no icon'}
								placeholder={'Ingrese nombre de la nueva sucursal...'}
							/>
							<Input
								label={'Codigo de la Sucursal'}
								inputClass={'no icon'}
								placeholder={"Ingrese codigo de la nueva sucursal..."}
							/>
							<div className='flex gap-4'>
								<Button 
									text={"Cancelar"}
									className={'secondary'}
									func={() => setIsActiveModal(false)}
								/>
								<Button 
									text={'Agregar'}
									className={'success'}
								/>
							</div>
						</form>
					</ModalContainer>
				)
			}
		</>
	)
}
