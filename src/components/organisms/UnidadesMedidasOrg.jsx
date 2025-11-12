'use client'
import React, { useState, useEffect } from 'react'
import { Button, InfoCard, ModalContainer } from '../atoms'
import { BsUnity } from 'react-icons/bs'
import { Card, Input } from '../molecules'
import { useActive, useFilter, useIsMobile } from '@/hooks'
import UnidadesService from '@/services/UnidadesService'
import { FiEdit, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'

export default function UnidadesMedidasOrg() {
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const [searchTerm, setSearchTerm] = useState();
	const { isActiveModal, setIsActiveModal } = useActive();
	const [mode, setMode] = useState();
	const [unidad, setUnidad] = useState();
	const [unidades, setUnidades] = useState([]);
	const [loading, setLoading] = useState(false);
	const [formName, setFormName] = useState('');

	useEffect(() => {
		let mounted = true;
		const fetchUnidades = async () => {
			setLoading(true);
			try {
				const data = await UnidadesService.getUnidades();
				if (mounted) setUnidades(data.map(u => ({ id: u.id, unidad: u.unidad })));
			} catch (err) {
				console.error('Error cargando unidades', err);
			} finally {
				if (mounted) setLoading(false);
			}
		}
		fetchUnidades();
		return () => { mounted = false };
	}, []);

	const filteredUnidades = useFilter({
		data: unidades,
		searchTerm,
		matcher: (item, term) => item.unidad.toLowerCase().includes(term.toLowerCase())
	});

	const toggleModalType = (type, itemData) => {
		setMode(type);

		if (type === 'create') {
			setFormName('');
			setUnidad(undefined);
			setIsActiveModal(true);

		} else if (type === 'edit') {
			setUnidad(itemData);
			setFormName(itemData?.unidad || '');
			setIsActiveModal(true);

		} else if (type === 'delete') {
			setUnidad(itemData);
			setIsActiveModal(true);
		}
	}

	const handleSubmitCreate = async (e) => {
		e.preventDefault();
		if (!formName || !formName.trim()) return;
		try {
			const res = await UnidadesService.createUnidad({ nombre: formName.trim() });
			// Añadir al state local para reflejar cambios inmediatamente
			setUnidades((prev) => [...prev, { id: res.id, unidad: formName.trim() }]);
			setIsActiveModal(false);
		} catch (err) {
			console.error('Error creando unidad', err);
			// Mantener modal abierto para mostrar error en futuro
		}
	}

	const handleEditSubmit = async (e) => {
		e.preventDefault();
		if (!unidad || !unidad.id) return;
		if (!formName || !formName.trim()) return;
		try {
			await UnidadesService.editUnidad({ id: unidad.id, nombre: formName.trim() });
			setUnidades((prev) => prev.map(u => u.id === unidad.id ? { ...u, unidad: formName.trim() } : u));
			setIsActiveModal(false);
		} catch (err) {
			console.error('Error actualizando unidad', err);
		}
	}

	const confirmDelete = async () => {
		if (!unidad || !unidad.id) return setIsActiveModal(false);
		try {
			await UnidadesService.deleteUnidad({ id: unidad.id });
			setUnidades((prev) => prev.filter(u => u.id !== unidad.id));
			setIsActiveModal(false);
		} catch (err) {
			console.error('Error eliminando unidad', err);
			setIsActiveModal(false);
		}
	}

	return (
		<>
			<div className='p-6 w-full'>
				<section className='grid grid-cols-1 md:grid-cols-4'>
					<InfoCard
						CardTitle={"Total Unidades"}
						cardValue={unidades.length || 0}
						cardIconColor={"primary"}
						cardIcon={<BsUnity className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
					/>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
						<div className='flex flex-col'>
							<h2 className='md:text-2xl font-semibold'>Lista de Unidades de Medida</h2>
							<span className='text-sm md:text-medium text-dark/50'>Gestiona y administra la lista de unidades de medida</span>
						</div>
						<div>
							<Button
								text={"Nueva Unidad"}
								className={"primary"}
								icon={<FiPlus />}
								func={() => toggleModalType('create')}
							/>
						</div>
					</div>
					<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-4'>
						<Input
							placeholder={"Buscar Unidad..."}
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
											<th className='text-center text-dark/50 font-semibold p-2'>Unidad</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filteredUnidades.map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2 text-center'>{index + 1}</td>
												<td className='p-2 text-center'>{item.unidad}</td>
												<td className='p-2 text-center flex justify-center'>
													<div className='flex gap-2 w-1/2'>
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
									filteredUnidades.map((item, index) => (
										<Card
											key={index}
											productName={item.unidad}
										>
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
						modalTitle={mode === 'create' ? 'Crear nueva Unidad de medida' : mode === 'edit' ? 'Editar Unidad' : `¿Estas seguro que deseas eliminar a ${unidad.unidad} de la lista de Unidades?`}
						modalDescription={mode === 'create' ? 'Crear una nueva unidad de medida atravez de su nombre' : mode === 'edit' ? 'Edita la informacion de la unidad de medida' : 'Esta accion no se puede deshacer.'}
						isForm={mode === 'edit' ? true : false}
					>
						{
							mode === 'create' ? (
								<form className='w-full' onSubmit={handleSubmitCreate}>
									<Input
										label={'Nombre de la unidad de medida'}
										placeholder={'Ingrese nombre de la unidad de medida...'}
										inputClass={'no icon'}
										value={formName}
										onChange={(e) => setFormName(e.target.value)}
									/>
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
							) : (mode === 'edit' ? (
								<form className='w-full' onSubmit={handleEditSubmit}>
									<Input
										label={'Nombre de la unidad de medida'}
										placeholder={'Ingrese nombre de la unidad de medida...'}
										inputClass={'no icon'}
										value={formName}
										onChange={(e) => setFormName(e.target.value)}
									/>
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

							)
						}
					</ModalContainer>
				)
			}
		</>
	)
}
