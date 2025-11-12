'use client'
import React, { useEffect, useState } from 'react'
import { DescuentoCard, Input } from '../molecules'
import { FiActivity, FiEdit, FiPlus, FiPower, FiTag, FiTrash2 } from 'react-icons/fi'
import { Button, ModalContainer } from '../atoms'
import { BsStop } from 'react-icons/bs'
import { MdBlock, MdCheck, MdStop } from 'react-icons/md'
import { useActive } from '@/hooks'
import { COMPILER_INDEXES } from 'next/dist/shared/lib/constants'
import { DescuentoService } from '@/services'

export default function DescuentosOrg() {
	const [mode, setMode] = useState('');
	const [selectedDiscount, setSelectedDiscount] = useState('');
	const { isActiveModal, setIsActiveModal } = useActive();
	const [descuentos, setDescuentos] = useState([]);
	const [error, setError] = useState({
		nombre: '',
		codigo: '',
		descripcion: '',
		valor_porcentaje: '',
		general: '',
	});
	const [newDiscount, setNewDiscount] = useState({
		codigo_descuento: "",
		nombre_descuento: "",
		valor_porcentaje: 0,
		descripcion: "",
		estado: "Activo"
	});
	const [editDiscount, setEditDiscount] = useState({
		id: "",
		codigo_descuento: "",
		nombre_descuento: "",
		valor_porcentaje: 0,
		descripcion: "",
		estado: "Activo"
	});


	useEffect(() => {
		const fetchDescuentos = async () => {
			const res = await DescuentoService.getDescuentos();
			setDescuentos(res)
		}
		fetchDescuentos();
	}, [])

	console.log(descuentos);

	const activeDiscounts = descuentos.filter(d => d.ESTADO === 'Activo');
	const deactivatedDiscounts = descuentos.filter(d => d.ESTADO === 'Inactivo');

	const toggleTypeModal = (type, itemData) => {
		setMode(type);

		if (type === 'create') {
			setIsActiveModal(true);

		} else if (type === 'edit') {
			setEditDiscount({
				id: itemData.ID_DESCUENTO,
				codigo_descuento: itemData.CODIGO_DESCUENTO || '',
				nombre_descuento: itemData.NOMBRE_DESCUENTO || '',
				valor_porcentaje: itemData.VALOR_PORCENTAJE || '',
				descripcion: itemData.DESCRIPCION || '',
				estado: 'Activo',
			})
			setIsActiveModal(true)

		} else if (type === 'delete') {
			setSelectedDiscount(itemData)
			setIsActiveModal(true)
		}
	}

	const handleSubmitCreation = async (e) => {
		e.preventDefault();

		try {
			const dataDiscount = await DescuentoService.createDescuento(newDiscount);

			setDescuentos([dataDiscount, ...descuentos]);

			setIsActiveModal(false)

			setNewDiscount({
				codigo_descuento: "",
				nombre_descuento: "",
				valor_porcentaje: 0,
				descripcion: "",
				estado: "Activo"
			});
		} catch (error) {
			console.error("Error creando descuento:", error)
			setError({ general: 'Ocurrio un Error al crear el descuenot.' });
		}
	}

	const handleSubmitEdit = async (e) => {
		e.preventDefault();

		try {
			const dataDiscount = await DescuentoService.updateDescuento(editDiscount);

			setDescuentos([dataDiscount, ...descuentos]);

			setEditDiscount({
				codigo_descuento: "",
				nombre_descuento: "",
				valor_porcentaje: 0,
				descripcion: "",
				estado: "Activo"
			})
			setIsActiveModal(false)
		} catch (error) {
			console.error("Error actulizando descuento:", error)
			setError({ general: 'Ocurrio un Error al actulizar el descuento.' });
		}
	}

	const toggleActiveDiscount = async (discountData, status) => {
		try {
			const dataDiscount = await DescuentoService.changeEstadoDescuento(discountData.ID_DESCUENTO, status);

			setDescuentos((prevDescuentos) =>
				prevDescuentos.map((d) =>
					d.ID_DESCUENTO === dataDiscount.ID_DESCUENTO
						? { ...d, ESTADO: status } // actualiza solo el estado del que cambió
						: d
				)
			);
		} catch (error) {
			console.error("Error actulizando descuento:", error)
			setError({ general: 'Ocurrio un Error al desactivar o activar el descuento.' });
		}
	}

	const handleDelete = async () => {
		try {
			await DescuentoService.deleteDescuento(selectedDiscount.ID_DESCUENTO);

			setDescuentos((prev) => prev.filter((c) => c.ID_DESCUENTO !== selectedDiscount.ID_DESCUENTO));
			setIsActiveModal(false)
		} catch (error) {
			console.error("Error eliminando descuento:", error)
			setError({ general: 'Ocurrio un Error al eliminar el descuento.' });
		}
	}

	console.log(selectedDiscount);

	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
				<section className='flex flex-col gap-4'>
					<div className='text-2xl flex gap-1 items-center font-semibold justify-between'>
						<div className='flex gap-1 items-center'>
							<FiTag className='text-primary' />
							Descuentos Activos ({activeDiscounts.length})
						</div>
						<div>
							<Button
								text={"Agregar Descuento"}
								className={'primary'}
								icon={<FiPlus />}
								func={() => toggleTypeModal('create', 'sexo')}
							/>
						</div>
					</div>
					{activeDiscounts.length > 0 ? (
						<div className='grid grid-cols-2 gap-4'>
							{activeDiscounts.map((discount, index) => (
								<DescuentoCard
									title={discount.NOMBRE_DESCUENTO}
									code={discount.CODIGO_DESCUENTO}
									description={discount.DESCRIPCION}
									percentValue={discount.VALOR_PORCENTAJE}
									fecha={new Date(discount.FECHA_CREACION).toLocaleString('es-NI', {
										timeZone: 'America/Managua'
									})}
									key={index}
								>
									<Button
										text={"Editar"}
										className={"blue"}
										icon={<FiEdit />}
										func={() => toggleTypeModal('edit', discount)}
									/>
									<Button
										text={"Desactivar"}
										className={"secondary"}
										icon={<MdBlock />}
										func={() => toggleActiveDiscount(discount, 'Inactivo')}
									/>
									<Button
										text={"Eliminar"}
										className={"danger"}
										icon={<FiTrash2 />}
										func={() => toggleTypeModal('delete', discount)}
									/>
								</DescuentoCard>
							))
							}
						</div>
					) : (
						<div>
							<span>No hay descuentos activos.</span>
						</div>
					)}
				</section>
				{deactivatedDiscounts.length > 0 &&
					<section className='flex flex-col gap-4'>
						<div className='text-2xl flex gap-1 items-center font-semibold justify-between'>
							<div className='flex gap-1 items-center'>
								<FiTag className='text-primary' />
								Descuentos inactivos ({deactivatedDiscounts.length})
							</div>
						</div>
						<div className='grid grid-cols-2 gap-4 opacity-60'>
							{deactivatedDiscounts.map((discount, index) => (
								<DescuentoCard
									title={discount.NOMBRE_DESCUENTO}
									code={discount.CODIGO_DESCUENTO}
									description={discount.DESCRIPCION}
									percentValue={discount.VALOR_PORCENTAJE}
									fecha={new Date(discount.FECHA_CREACION).toLocaleString('es-NI', {
										timeZone: 'America/Managua'
									})}
									key={index}
								>
									<Button
										text={"Editar"}
										className={"blue"}
										icon={<FiEdit />}
										func={() => toggleTypeModal('edit', discount)}
									/>
									<Button
										text={"Activar"}
										className={"success"}
										icon={<MdCheck />}
										func={() => toggleActiveDiscount(discount, 'Activo')}
									/>
									<Button
										text={"Eliminar"}
										className={"danger"}
										icon={<FiTrash2 />}
										func={() => toggleTypeModal('delete', discount)}
									/>
								</DescuentoCard>
							))
							}
						</div>
					</section>
				}
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={mode === 'create' ? "Crear nuevo descuento" : mode === 'edit' ? "Editar Descuento" : `¿Esta seguro que desea eliminar ${selectedDiscount.NOMBRE_DESCUENTO}`}
						modalDescription={mode === 'create' ? "completa los datos para crear un nuevo descuento" : mode === 'edit' ? "Actualiza los datos del descuento." : "Esta accion no se puede deshacer ¿Desea continuar?"}
						isForm={mode === 'create' || mode === 'edit' ? true : false}
					>
						{mode === 'create' ? (

							<form action="" onSubmit={handleSubmitCreation}>
								<div className='grid grid-cols-3 gap-4'>
									<Input
										label={"Codigo de Descuento"}
										inputClass={"no icon"}
										placeholder={"ej: ANTIGUO2025"}
										value={newDiscount.codigo_descuento}
										onChange={(e) => setNewDiscount({ ...newDiscount, codigo_descuento: e.target.value })}
									/>
									<Input
										label={"Nombre"}
										inputClass={"no icon"}
										placeholder={"ej: Descuendo de Antiguedad"}
										value={newDiscount.nombre_descuento}
										onChange={(e) => setNewDiscount({ ...newDiscount, nombre_descuento: e.target.value })}
									/>
									<Input
										label={"Valor del Descuento (%)"}
										inputClass={"no icon"}
										type={"number"}
										placeholder={0}
										value={newDiscount.valor_porcentaje}
										onChange={(e) => setNewDiscount({ ...newDiscount, valor_porcentaje: e.target.value })}
									/>
									<div className='col-span-3'>
										<Input
											isTextarea={true}
											label={"Descripcion"}
											placeholder={"Describe el descuento..."}
											inputClass={'no icon'}
											value={newDiscount.descripcion}
											onChange={(e) => setNewDiscount({ ...newDiscount, descripcion: e.target.value })}
										/>
									</div>
								</div>
								<div className='flex gap-4 mt-4'>
									<Button
										text={'Cancelar'}
										className={'secondary'}
										func={() => setIsActiveModal(false)}
									/>
									<Button
										text={'Crear Descuento'}
										className={'success'}
										type={'submit'}
									/>
								</div>
							</form>
						) : (mode === 'edit' ? (
							<form onSubmit={handleSubmitEdit}>
								<div className='grid grid-cols-3 gap-4'>
									<Input
										label={"Codigo de Descuento"}
										inputClass={"no icon"}
										placeholder={"ej: ANTIGUO2025"}
										value={editDiscount.codigo_descuento}
										onChange={(e) => {
											setEditDiscount({ ...editDiscount, codigo_descuento: e.target.value })
											setError({ ...error, codigo: '' })
										}}
									/>
									<Input
										label={"Nombre"}
										inputClass={"no icon"}
										placeholder={"ej: Descuendo de Antiguedad"}
										value={editDiscount.nombre_descuento}
										onChange={(e) => {
											setEditDiscount({ ...editDiscount, nombre_descuento: e.target.value })
											setError({ ...error, nombre: '' })
										}}
									/>
									<Input
										label={"Valor del Descuento (%)"}
										inputClass={"no icon"}
										type={"number"}
										placeholder={0}
										value={editDiscount.valor_porcentaje}
										onChange={(e) => {
											setEditDiscount({ ...editDiscount, valor_porcentaje: e.target.value })
											setError({ ...error, descripcion: '' })
										}}
									/>
									<div className='col-span-3'>
										<Input
											isTextarea={true}
											label={"Descripcion"}
											placeholder={"Describe el descuento..."}
											inputClass={'no icon'}
											value={editDiscount.descripcion}
											onChange={(e) => {
												setEditDiscount({ ...editDiscount, descripcion: e.target.value })
												setError({ ...error, descripcion: '' })
											}}
										/>
									</div>
								</div>
								<div className='flex gap-4 mt-4'>
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
							<div className='flex gap-2 mt-4'>
								<Button
									text={"Cancelar"}
									className={'danger'}
									func={() => setIsActiveModal(false)}
								/>
								<Button
									text={"Confirmar Eliminacion"}
									className={'success'}
									func={() => handleDelete()}
								/>
							</div>
						)

						)}
					</ModalContainer>
				)
			}
		</>
	)
}
