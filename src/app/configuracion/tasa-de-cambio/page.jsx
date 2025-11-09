'use client'
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/atoms'
import { Input } from '@/components/molecules'

export default function TasaCambio() {
	const [tasa, setTasa] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');

	const load = async () => {
		try {
			const res = await fetch('/api/tasa-cambio', { cache: 'no-store' });
			const data = await res.json();
			if (res.ok) setTasa(String(data?.tasa ?? ''));
		} catch (e) { /* noop */ }
	};

	useEffect(() => { load(); }, []);

	const update = async () => {
		const val = Number(tasa);
		if (!val || isNaN(val) || val <= 0) {
			setMessage('Ingresa una tasa válida (> 0)');
			return;
		}
		setLoading(true);
		setMessage('');
		try {
			const res = await fetch('/api/tasa-cambio', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tasa: val })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error al actualizar tasa');
			setMessage('Tasa de cambio actualizada');
		} catch (e) {
			setMessage(e.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='p-6 w-full max-w-xl flex items-end gap-4'>
			<div className='flex-1'>
				<Input
					label={"Actualizar Tasa de Cambio (Dólar → Córdoba)"}
					type={'number'}
					placeholder={'Ingrese valor de la tasa de cambio...'}
					inputClass={'no icon'}
					value={tasa}
					onChange={(e) => setTasa(e.target.value)}
				/>
				{message && <div className='text-sm mt-1'>{message}</div>}
			</div>
			<div>
				<Button
					text={loading ? 'Guardando…' : 'Actualizar'}
					className={'success'}
					func={update}
				/>
			</div>
		</div>
	)
}
