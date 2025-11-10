import React from 'react'
import Input from './Input'
import { Button } from '../atoms'

export default function CreditosPayment({ creditosData, onClose, onSave }) {
	const handleSubmit = (e) => {
		e.preventDefault();

		onSave && onSave();
		onClose && onClose();
	}


	return (
		<div>
			<form className='flex flex-col gap-4' onSubmit={handleSubmit}>
				<Input
					label={"Monto a pagar"}
					inputClass={'no icon'}
					placeholder={"Ingrese el monton a pagar..."}
				/>
				<Input
					label={"Monton Recibido en Cordobas"}
					inputClass={'no icon'}
					placeholder={"Ingrese el monton recibido en cordobas..."}
				/>
				<Input
					label={"Monto Recibido en Dolares"}
					inputClass={'no icon'}
					placeholder={"Ingrese el monton recibido en dolares..."}
				/>
				<div className='flex gap-2'>
					<Button
						text={'Cancelar'}
						className={'secondary'}
						func={onClose}
					/>
					<Button
						text={'Realizar Pago'}
						className={'success'}
					/>
				</div>
			</form>
		</div>
	)
}
