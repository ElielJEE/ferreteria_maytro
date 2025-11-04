'use client'
import React from 'react'
import { Button } from '@/components/atoms'
import { Input } from '@/components/molecules'

export default function TasaCambio() {
	return (
		<div className='p-6 w-1/2 flex items-end gap-4'>
			<Input
				label={"Actualizar Tasa de Cambio (Dolares a Cordobas)"}
				type={'number'}
				placeholder={'Ingrese valor de la tasa de cambio...'}
				inputClass={'no icon'}
			/>
			<div>
				<Button
					text={'Actualizar'}
					className={'success'}
				/>
			</div>
		</div>
	)
}
