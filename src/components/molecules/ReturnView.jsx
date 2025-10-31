'use client'
import React, { useState } from 'react'
import DropdownMenu from './DropdownMenu';
import Input from './Input';
import { Button } from '../atoms';

export default function ReturnView({ returnData, onClose, onSave }) {
	const productStatus = [
		'En Buen Estado',
		'Dañado',
		'Vencido',
		'Defectuoso',
	]

	const actions = [
		'Reintegrar al inventario',
		'Descartar producto',
		'Enviar a reparacion',
		'Cambiar por nuevo',
	]

	const statusOpts = productStatus.map(status => ({ label: status, value: status }))
	const actionOpts = actions.map(actions => ({ label: actions, value: actions }))

	const handleSubmit = (e) => {
		e.preventDefault();

		onClose && onClose();
		onSave && onSave();
	}


	return (
		<div>
			<div className='bg-dark/5 py-2 px-4 rounded-lg flex flex-col mt-4 sm:w-120 w-full'>
				<h2 className='text-medium font-semibold'>{returnData?.productName || ''}</h2>
				<span className='text-dark/60'>Cantidad: {returnData?.cantidad || ''} | Cliente: {returnData?.cliente || ''}</span>
				<span className='text-dark/60'>Motivo: {returnData?.motivo || ''}</span>
			</div>
			<form className='flex flex-col gap-4 mt-4' onSubmit={(e) => handleSubmit(e)}>
				<DropdownMenu
					label={'Estado del producto'}
					defaultValue={'Selecciona un Estado'}
					options={statusOpts}
				/>
				<DropdownMenu
					label={'Accion a tomar'}
					defaultValue={'Selecciona una Accion'}
					options={actionOpts}
				/>
				<Input
					label={'Notas de Evaluacion'}
					isTextarea={true}
					placeholder={'Ingrese notas de la evaluacion del producto...'}
					inputClass={'no icon'}
				/>
				<div className='flex gap-4'>
					<Button
						text={'Cerrar'}
						className={'secondary'}
						func={onClose}
					/>
					<Button
						text={'Procesar'}
						className={'success'}
					/>
				</div>
			</form>
		</div>
	)
}
