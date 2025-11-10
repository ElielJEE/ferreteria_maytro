'use client'
import React, { useState } from 'react'
import { DescuentoCard, Input } from '../molecules'
import { FiEdit, FiPlus, FiTag, FiTrash2 } from 'react-icons/fi'
import { Button, ModalContainer } from '../atoms'
import { BsStop } from 'react-icons/bs'
import { MdBlock, MdStop } from 'react-icons/md'
import { useActive } from '@/hooks'

export default function DescuentosOrg() {
	const [mode, setMode] = useState('');
	const { isActiveModal, setIsActiveModal } = useActive();

	const toggleTypeModal = (type, itemData) => {
		setMode(type);

		if (type === 'create') {
			setIsActiveModal(true);
		}
	}

	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
				<div className='text-2xl flex gap-1 items-center font-semibold justify-between'>
					<div className='flex gap-1 items-center'>
						<FiTag className='text-primary' />
						Descuentos Activos (1)
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
				<div className='grid grid-cols-2 gap-4'>
					<DescuentoCard>
						<Button
							text={"Editar"}
							className={"blue"}
							icon={<FiEdit />}
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
						/>
					</DescuentoCard>
					<DescuentoCard>
						<Button
							text={"Editar"}
							className={"blue"}
							icon={<FiEdit />}
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
						/>
					</DescuentoCard>
				</div>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={mode === 'create' && "Crear nuevo descuento"}
						modalDescription={mode === 'create' && "completa los datos para crear un nuevo descuento"}
						isForm={mode === 'create' && true}
					>
						<form action="">
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
					</ModalContainer>
				)
			}
		</>
	)
}
