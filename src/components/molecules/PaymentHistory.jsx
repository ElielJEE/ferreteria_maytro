import React, { useMemo } from 'react'
import { Button } from '../atoms'

export default function PaymentHistory({ creditData, onClose }) {
	const pagos = Array.isArray(creditData?.pagos) ? creditData.pagos : [];
    const rows = useMemo(() => pagos.map((pago, idx) => ({
        id: pago.id ?? idx,
        fecha: pago.fecha || pago.fechaIso || pago.fechaFiltro || '',
        fechaDisplay: pago.fecha || '',
        hora: pago.hora || '',
        montoAplicado: Number(pago.montoAplicado ?? pago.monto ?? 0),
		metodo: pago.metodo || 'efectivo',
		usuarioNombre: pago.usuarioNombre || pago.usuario || ''
    })), [pagos]);
	return (
		<div>
			{rows.length === 0 ? (
				<div className='mt-4 text-sm text-dark/60'>No se han registrado pagos para este crédito.</div>
			) : (
				<table className='w-full mt-4 table-auto border-collapse'>
					<thead>
						<tr className='bg-primary/10 text-sm'>
							<th className='p-2 text-left border-b border-dark/20'>Fecha</th>
							<th className='p-2 text-left border-b border-dark/20'>Hora</th>
							<th className='p-2 text-left border-b border-dark/20'>Método</th>
							<th className='p-2 text-left border-b border-dark/20'>Usuario</th>
							<th className='p-2 text-right border-b border-dark/20'>Monto</th>
						</tr>
					</thead>
					<tbody>
						{rows.map(row => (
							<tr key={row.id} className='text-sm'>
								<td className='p-2 border-b border-dark/20'>{row.fechaDisplay || row.fecha || '-'}</td>
								<td className='p-2 border-b border-dark/20'>{row.hora || '-'}</td>
								<td className='p-2 border-b border-dark/20 capitalize'>{row.metodo}</td>
								<td className='p-2 border-b border-dark/20'>{row.usuarioNombre || '-'}</td>
								<td className='p-2 border-b border-dark/20 text-right'>C$ {row.montoAplicado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
			<div className='w-full mt-4'>
				<Button
					className={'secondary'}
					text={'Cerrar'}
					func={() => { onClose && onClose() }}
				/>
			</div>
		</div>
	)
}
