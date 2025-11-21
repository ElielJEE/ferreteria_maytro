import React from 'react'
import { Button } from '../atoms'

export default function PaymentHistory({ data, onClose }) {
	return (
		<div>
			<h2 className='font-semibold text-xl'>Historial de Abonos</h2>
			<table className='w-full mt-4 table-auto border-collapse'>
				<thead className=''>
					<tr className='bg-primary/10'>
						<th className='p-2 text-left border-b border-dark/20'>Fecha</th>
						<th className='p-2 text-left border-b border-dark/20'>Hora</th>
						<th className='p-2 text-right border-b border-dark/20'>Monto</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td className='p-2 border-b border-dark/20'>{data?.fecha || '01/01/2024'}</td>
						<td className='p-2 border-b border-dark/20'>{data?.hora || '12:00 PM'}</td>
						<td className='p-2 border-b border-dark/20 text-right'>C$ {data?.monto || "0.00"}</td>
					</tr>
				</tbody>
			</table>
			<div className='w-full mt-4'>
				<Button
					className={'secondary'}
					text={'Cerrar'}
					func={() => { onClose() }}
				/>
			</div>
		</div>
	)
}
