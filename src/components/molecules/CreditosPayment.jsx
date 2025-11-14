import React, { useEffect, useMemo, useState } from 'react'
import Input from './Input'
import { Button } from '../atoms'

export default function CreditosPayment({ creditData, onClose, onSave }) {
	const [montoPagar, setMontoPagar] = useState('');
	const [cordobas, setCordobas] = useState('');
	const [dolares, setDolares] = useState('');
	const [tasaCambio, setTasaCambio] = useState(36.55);
	const deudaActual = useMemo(() => Number(creditData?.deudaActual || 0), [creditData]);
	const [error, setError] = useState('');

	useEffect(() => {
		const loadTasa = async () => {
			try {
				const res = await fetch('/api/tasa-cambio', { cache: 'no-store' });
				const data = await res.json();
				if (res.ok && data?.tasa) setTasaCambio(Number(data.tasa));
			} catch { }
		};
		loadTasa();
	}, []);

	const recibidoCord = useMemo(() => Number(cordobas || 0), [cordobas]);
	const recibidoDol = useMemo(() => Number(dolares || 0), [dolares]);
	const totalRecibidoC = useMemo(() => Number((recibidoCord + recibidoDol * tasaCambio).toFixed(2)), [recibidoCord, recibidoDol, tasaCambio]);
	const montoPagarNum = useMemo(() => Number(montoPagar || 0), [montoPagar]);
	const cambio = useMemo(() => {
		if (!montoPagarNum) return 0;
		const diff = totalRecibidoC - montoPagarNum;
		return diff > 0 ? Number(diff.toFixed(2)) : 0;
	}, [totalRecibidoC, montoPagarNum]);

	const validate = () => {
		const mp = Number(montoPagar || 0);
		if (!mp || mp <= 0) return 'Ingrese el monto a pagar.';
		if (mp > deudaActual) return 'Monto a pagar no puede ser mayor a la deuda actual.';
		if (totalRecibidoC < mp) return 'El monto recibido es menor al monto a pagar.';
		return '';
	};

	const handleSubmit = async (e) => {
		e && e.preventDefault();
		const err = validate();
		if (err) { setError(err); return; }
		setError('');
		try {
			const payload = {
				id: creditData.id,
				montoPagar: Number(montoPagar || 0),
				cordobas: Number(cordobas || 0),
				dolares: Number(dolares || 0),
				tasaCambio: Number(tasaCambio || 36.55),
			};
			const svc = await import('@/services/CreditosService');
			const res = await svc.default.payCredit(payload);
			if (res && res.success) {
				onSave && onSave(res);
				onClose && onClose();
			} else {
				setError(res?.message || 'No se pudo registrar el pago');
			}
		} catch (e) { console.error(e); setError(e?.message || 'Error de conexión'); }
	};

	return (
		<div>
			<form className='flex flex-col gap-4' onSubmit={handleSubmit}>
				<Input
					label={'Monto a pagar'}
					inputClass={'no icon'}
					placeholder={'Ingrese el monto a pagar...'}
					value={montoPagar}
					onChange={(e) => setMontoPagar(e.target.value)}
				/>
				<Input
					label={'Monto Recibido en Cordobas'}
					inputClass={'no icon'}
					placeholder={'Ingrese el monto recibido en cordobas...'}
					value={cordobas}
					onChange={(e) => setCordobas(e.target.value)}
				/>
				<Input
					label={'Monto Recibido en Dolares'}
					inputClass={'no icon'}
					placeholder={'Ingrese el monto recibido en dolares...'}
					value={dolares}
					onChange={(e) => setDolares(e.target.value)}
				/>
				{error ? <div className='text-danger text-sm'>{error}</div> : null}
				<div className='text-sm text-dark/70'>
					Recibido total: C${totalRecibidoC.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
				</div>
				<div className='text-lg font-semibold text-success'>
					Cambio: C${cambio.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
				</div>
				<div className='flex gap-2'>
					<Button text={'Cancelar'} className={'secondary'} func={onClose} />
					<Button text={'Realizar Pago'} className={'success'} func={handleSubmit} />
				</div>
			</form>
		</div>
	)
}
