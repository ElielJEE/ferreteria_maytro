'use client'
import React, { useState } from 'react'
import { DescuentoCard, Input } from '../molecules'
import { FiActivity, FiEdit, FiPlus, FiPower, FiTag, FiTrash2 } from 'react-icons/fi'
import { Button, ModalContainer } from '../atoms'
import { BsStop } from 'react-icons/bs'
import { MdBlock, MdStop } from 'react-icons/md'
import { useActive } from '@/hooks'
import { COMPILER_INDEXES } from 'next/dist/shared/lib/constants'

export default function DescuentosOrg() {
	const [mode, setMode] = useState('');
	const [selectedDiscount, setSelectedDiscount] = useState('');
	const { isActiveModal, setIsActiveModal } = useActive();

	const discountDataEjemplo = [
		{
			name: 'Decuento por Antiguedad',
			description: 'Descuento para los clientes con muchas ventas',
			codigo: 'ANTIGCLI123',
			porcentaje: '15',
			estado: 'activo',
		},
		{
			name: 'Decuento por Algo',
			description: 'Descuento para los clientes con muchas ventas',
			codigo: 'ANTIGCLI123',
			porcentaje: '15',
			estado: 'inactivo',
		},
		{
			name: 'Decuento por alguna otra cosa',
			description: 'Descuento para los clientes con muchas ventas',
			codigo: 'ANTIGCLI123',
			porcentaje: '15',
			estado: 'activo',
		}
	]

	const activeDiscounts = discountDataEjemplo.filter(d => d.estado === 'activo');
	const deactivatedDiscounts = discountDataEjemplo.filter(d => d.estado === 'inactivo');

	const toggleTypeModal = (type, itemData) => {
		setMode(type);

		if (type === 'create') {
			setIsActiveModal(true);

		} else if (type === 'edit') {
			setSelectedDiscount(itemData);
			setIsActiveModal(true)

		} else if (type === 'delete') {
			setSelectedDiscount(itemData)
			setIsActiveModal(true)
		}
	}

	const handleSubmitCreation = (e) => {
		e.preventDefault();
		setIsActiveModal(false)
	}

	const handleSubmitEdit = (e) => {
		e.preventDefault();
	}

	const handleDeactiveDiscount = () => {

	}

	const handleDelete = () => {
		setIsActiveModal(false)
	}

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
									title={discount.name}
									code={discount.codigo}
									description={discount.description}
									percentValue={discount.porcentaje}
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
									title={discount.name}
									code={discount.codigo}
									description={discount.description}
									percentValue={discount.porcentaje}
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
						modalTitle={mode === 'create' ? "Crear nuevo descuento" : mode === 'edit' ? "Editar Descuento" : `¿Esta seguro que desea eliminar ${selectedDiscount.name}`}
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
									/>
									<Input
										label={"Nombre"}
										inputClass={"no icon"}
										placeholder={"ej: Descuendo de Antiguedad"}
									/>
									<Input
										label={"Valor del Descuento (%)"}
										inputClass={"no icon"}
										type={"number"}
										placeholder={0}
									/>
									<div className='col-span-3'>
										<Input
											isTextarea={true}
											label={"Descripcion"}
											placeholder={"Describe el descuento..."}
											inputClass={'no icon'}
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
										value={selectedDiscount.codigo}
									/>
									<Input
										label={"Nombre"}
										inputClass={"no icon"}
										placeholder={"ej: Descuendo de Antiguedad"}
										value={selectedDiscount.name}
									/>
									<Input
										label={"Valor del Descuento (%)"}
										inputClass={"no icon"}
										type={"number"}
										placeholder={0}
										value={selectedDiscount.porcentaje}
									/>
									<div className='col-span-3'>
										<Input
											isTextarea={true}
											label={"Descripcion"}
											placeholder={"Describe el descuento..."}
											inputClass={'no icon'}
											value={selectedDiscount.description}
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
							<div className='flex gap-2'>
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
