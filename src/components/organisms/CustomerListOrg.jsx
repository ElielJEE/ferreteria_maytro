'use client'
import React, { useEffect, useState } from 'react'
import { Button, InfoCard } from '../atoms'
import { CustomerService } from '@/services';
import { FiEdit, FiSearch, FiTrash2, FiUsers } from 'react-icons/fi';
import { Card, DropdownMenu, Input } from '../molecules';
import { useFilter, useIsMobile } from '@/hooks';

export default function CustomerListOrg() {
	const [clientesList, setClientesList] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const isMobile = useIsMobile({ breakpoint: 1024 })

	useEffect(() => {
		const getCustomers = async () => {
			const res = await CustomerService.getClientes();
			console.log(res);
			setClientesList(res.clientes)
		}
		getCustomers();
	}, []);

	const filteredCustomers = useFilter({
		data: clientesList,
		searchTerm,
		matcher: (item, term) =>
			item.nombre.toLowerCase().includes(term.toLowerCase()) ||
			item.telefono.includes(term)
	});

	console.log(clientesList);

	return (
		<div className='w-full p-6 flex flex-col'>
			<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
				<InfoCard
					CardTitle={"Total Clientes"}
					cardValue={clientesList.length.toString() || 0}
					cardIconColor={"primary"}
					cardIcon={<FiUsers className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
				/>
			</section>
			<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
				<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
					<div className='flex flex-col'>
						<h2 className='md:text-2xl font-semibold'>Lista de Clientes</h2>
						<span className='text-sm md:text-medium text-dark/50'>Gestiona y administra la lista de clientes</span>
					</div>
				</div>
				<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-4'>
					<Input
						placeholder={"Buscar cliente..."}
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
										<th className='text-center text-dark/50 font-semibold p-2'>#</th>
										<th className='text-center text-dark/50 font-semibold p-2'>Nombre</th>
										<th className='text-center text-dark/50 font-semibold p-2'>Telefono</th>
										<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
									</tr>
								</thead>
								<tbody className='w-full'>
									{filteredCustomers.map((item, index) => (
										<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
											<td className='p-2 text-center'>{index + 1}</td>
											<td className='p-2 text-center'>{item.nombre}</td>
											<td className='p-2 max-w-[180px] truncate text-center'>{item.telefono}</td>
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
								filteredCustomers.map((item, index) => (
									<Card
										key={index}
										productName={item.nombre}
									>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Telefono</span>
											<span className='text-lg font-semibold'>{item.telefono}</span>
										</div>
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
				{/* <div className='w-full flex justify-center items-center'>
					{visibleItems < filteredProducts.length && (
						<div className='w-full mt-4 md:w-1/4'>
							<Button
								className={"transparent"}
								text={"Ver Mas"}
								func={loadMore}
							/>
						</div>
					)}
				</div> */}
			</section>
		</div>
	)
}
