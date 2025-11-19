'use client'
import React, { useEffect, useState } from 'react'
import { Button, InfoCard, ModalContainer } from '../atoms'
import { CustomerService, ProveedorService } from '@/services';
import { FiEdit, FiSearch, FiTrash2, FiTruck, FiUsers } from 'react-icons/fi';
import { Card, DropdownMenu, Input } from '../molecules';
import { useActive, useFilter, useIsMobile } from '@/hooks';

export default function ProveedoresOrg() {
	const [proveedoresList, setProveedoresList] = useState([]);
	const [proveedor, setProveedor] = useState({});
	const [searchTerm, setSearchTerm] = useState('');
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const { isActiveModal, setIsActiveModal } = useActive();
	const [mode, setMode] = useState('');

	useEffect(() => {
		const getProveedores = async () => {
			const res = await ProveedorService.getProveedores();
			setProveedoresList(res.proveedores)
		}
		getProveedores();
	}, []);

	const filteredProveedores = useFilter({
		data: proveedoresList,
		searchTerm,
		matcher: (item, term) =>
			item.nombre.toLowerCase().includes(term.toLowerCase()) ||
			item.telefono.includes(term)
	});

	const toggleModalType = (type, itemData) => {
		setMode(type);

		if (type === 'edit') {
			setProveedor(itemData);
			setIsActiveModal(true);
		} else if (type === 'delete') {
			setProveedor(itemData);
			setIsActiveModal(true);
		}
	}

	const handleEditSubmit = (e) => {
		e.preventDefault();

		setIsActiveModal(false)
	}

	const confirmDelete = () => {
		setIsActiveModal(false)
	}

	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
					<InfoCard
						CardTitle={"Total Proveedores"}
						cardValue={proveedoresList.length.toString() || 0}
						cardIconColor={"primary"}
						cardIcon={<FiTruck className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
					/>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
						<div className='flex flex-col'>
							<h2 className='md:text-2xl font-semibold'>Lista de Proveedores</h2>
							<span className='text-sm md:text-medium text-dark/50'>Gestiona y administra la lista de proveedores</span>
						</div>
					</div>
					<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-4'>
						<Input
							placeholder={"Buscar proveedor..."}
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
											<th className='text-start text-dark/50 font-semibold p-2'>Nombre</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Telefono</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Empresa</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filteredProveedores.map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2 text-start'>{index + 1}</td>
												<td className='p-2 text-start'>{item.nombre}</td>
												<td className='p-2 text-start'>{item.telefono}</td>
												<td className='p-2 text-start'>{item.empresa || ''}</td>
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
									filteredProveedores.map((item, index) => (
										<Card
											key={index}
											productName={item.nombre}
										>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Telefono</span>
												<span className='text-lg font-semibold'>{item.telefono}</span>
											</div>
											<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
												<Button className={"blue"} text={"Editar"} icon={<FiEdit />} func={() => toggleModalType('edit', item)} />
												<Button className={"danger"} text={"Eliminar"} icon={<FiTrash2 />} func={() => toggleModalType('delete', item)} />
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
						modalTitle={mode === 'edit' ? 'Editar Proveedor' : `¿Estas seguro que deseas eliminar a ${proveedor.nombre} de la lista de proveedores?`}
						modalDescription={mode === 'edit' ? 'Edita la informacion del proveedor' : 'Esta accion no se puede deshacer.'}
						isForm={mode === 'edit' ? true : false}
					>
						{
							mode === 'edit' ? (
								<form className='w-full' onSubmit={handleEditSubmit}>
									<div className='w-full flex gap-4'>
										<Input
											label={'Nombre del Proveedor'}
											placeholder={'Ingrese nombre del proveedor...'}
											inputClass={'no icon'}
											value={proveedor.nombre}
										/>
										<Input
											label={'Telefono del proveedor'}
											placeholder={'Ingrese telefono del proveedor...'}
											inputClass={'no icon'}
											value={proveedor.telefono}
										/>
									</div>
									<div className='flex gap-2 mt-2'>
										<Button
											text={'Cancelar'}
											className={'secondary'}
											func={() => setIsActiveModal(false)}
										/>
										<Button
											text={'Guardar'}
											className={'success'}
										/>
									</div>
								</form>
							) : (
								<div className='flex gap-4 mt-2'>
									<Button
										text={'Cancelar'}
										className={'secondary'}
										func={() => setIsActiveModal(false)}
									/>
									<Button
										text={'Confirmar'}
										className={'success'}
										func={() => confirmDelete()}
									/>
								</div>
							)
						}
					</ModalContainer>
				)
			}
		</>
	)
}
