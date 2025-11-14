import React from 'react'
import Input from './Input'
import { Button } from '../atoms'

export default function CreditosPayment({ creditData, onClose, onSave }) {
	const [monto, setMonto] = React.useState('');
	const [cordobas, setCordobas] = React.useState('');
	const [dolares, setDolares] = React.useState('');

	const handleSubmit = async (e) => {
		e && e.preventDefault();
		try {
			const amount = Number(monto || cordobas || 0);
			const payload = {
				id: creditData.id,
				cordobas: Number(cordobas || 0),
				dolares: Number(dolares || 0),
				// tasaCambio optional: frontend could fetch from config; leave server to resolve if omitted
			};
			const svc = await import('@/services/CreditosService');
			const res = await svc.default.payCredit(payload);
			if (res && res.success) {
				onSave && onSave(res);
				onClose && onClose();
			} else {
				console.error('Error registering payment:', res);
			}
		} catch (e) { console.error(e); }
	}

	return (
		<div>
			<form className='flex flex-col gap-4' onSubmit={handleSubmit}>
				<Input
					label={"Monto a pagar"}
					inputClass={'no icon'}
					placeholder={"Ingrese el monton a pagar..."}
					value={monto}
					onChange={(e) => setMonto(e.target.value)}
				/>
				<Input
					label={"Monton Recibido en Cordobas"}
					inputClass={'no icon'}
					placeholder={"Ingrese el monton recibido en cordobas..."}
					value={cordobas}
					onChange={(e) => setCordobas(e.target.value)}
				/>
				<Input
					label={"Monto Recibido en Dolares"}
					inputClass={'no icon'}
					placeholder={"Ingrese el monton recibido en dolares..."}
					value={dolares}
					onChange={(e) => setDolares(e.target.value)}
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
						func={handleSubmit}
					/>
				</div>
			</form>
		</div>
	)
}
