import { useIsMobile } from '@/hooks';
import React, { useEffect, useState, useCallback } from 'react';
import DropdownMenu from './DropdownMenu';
import Input from './Input';
import { FiSearch } from 'react-icons/fi';
import { BsBuilding } from 'react-icons/bs';
import Card from './Card';
import StockService from '@/services/StockService';

export default function Summary({ sucursalFilter }) {
	const [data, setData] = useState([]);
	const isMobile = useIsMobile({ breakpoint: 768 });

	useEffect(() => {
			const fetchResumen = async () => {
				try {
					const result = await StockService.getResumen(sucursalFilter);
					const rows = (result.resumen || []).map(r => ({ ...r, status: r.STATUS || '' }));
					setData(rows);
				} catch (e) {
					console.error('Error fetching resumen:', e.message || e);
					setData([]);
				}
			};
		fetchResumen();

		// Re-fetch or apply local update when stock is updated elsewhere
		const handler = (e) => {
			try {
				const detail = e && e.detail;
				if (detail && detail.result && detail.result.stock) {
					// apply local update to the row matching product+Sucursal
					const updated = detail.result.stock;
					setData(prev => {
						const idx = prev.findIndex(r => Number(r.ID_PRODUCT) === Number(updated.ID_PRODUCT) && Number(r.ID_SUCURSAL) === Number(updated.ID_SUCURSAL));
						if (idx === -1) return prev;
						const copy = [...prev];
						copy[idx] = { ...copy[idx], ...updated, status: updated.STATUS || copy[idx].status };
						return copy;
					});
				} else {
					fetchResumen();
				}
			} catch (err) {
				console.error('Error handling stock:updated event', err);
				fetchResumen();
			}
		};
		window.addEventListener('stock:updated', handler);
		return () => window.removeEventListener('stock:updated', handler);
	}, [sucursalFilter]);

	return (
		<>
			<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
				<div className='flex flex-col'>
					<h2 className='md:text-2xl font-semibold'>Estado Detallado del Inventario</h2>
					<span className='text-sm md:text-medium text-dark/50'>Vista consolidada de todas las surcusales</span>
				</div>
			</div>
			<div className='w-full flex flex-col gap-1 sticky top-0 bg-light pt-2 mb-4'>
				<Input
					placeholder={'Buscar producto...'}
					type={'search'}
					iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
				/>
				{/* Puedes agregar filtros dinámicos aquí si lo deseas */}
			</div>
			{!isMobile ? (
				<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
					<table className='w-full border-collapse'>
						<thead className=' w-full border-b border-dark/20'>
							<tr className='w-full'>
								<th className='text-start text-dark/50 font-semibold p-2'>Codigo</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Producto</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
								<th className='text-center text-dark/50 font-semibold p-2'>Stock Actual</th>
								<th className='text-center text-dark/50 font-semibold p-2'>En Bodega</th>
								<th className='text-center text-dark/50 font-semibold p-2'>Físico Total</th>
								<th className='text-center text-dark/50 font-semibold p-2'>Dañados</th>
								<th className='text-center text-dark/50 font-semibold p-2'>Reservados</th>
								<th className='text-center text-dark/50 font-semibold p-2'>Rango Min-Max</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Valor</th>
							</tr>
						</thead>
						<tbody className='w-full'>
							{data.map((item, index) => (
								<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
									<td className='p-2'>{item.CODIGO_PRODUCTO}</td>
									<td className='p-2 flex flex-col'>
										{item.PRODUCT_NAME}
										{item.SUBCATEGORY && (
											<span className='text-sm text-dark/50 mt-1'>{item.SUBCATEGORY}</span>
										)}
									</td>
									<td className='p-2 text-dark/70 max-w-[180px] truncate'>
										<span className='flex items-center gap-1'>
											<BsBuilding />
											{item.NOMBRE_SUCURSAL ? item.NOMBRE_SUCURSAL : 'Bodega'}
										</span>
									</td>
									<td className='p-2 text-success bg-success/10 text-center'>{item.STOCK_SUCURSAL}</td>
									<td className='p-2 text-primary bg-primary/10 text-center'>{item.STOCK_BODEGA}</td>
									<td className='p-2 text-blue bg-blue/10 text-center'>{item.FISICO_TOTAL}</td>
									<td className='p-2 text-danger bg-danger/10 text-center'>{item.DANADOS || ''}</td>
									<td className='p-2 text-purple bg-purple/10 text-center'>{item.RESERVADOS || ''}</td>
									<td className='p-2 bg-dark/10 max-w-[180px] truncate text-center'></td>
									<td className='p-2 text-center'>{item.status || ''}</td>
									<td className='p-2'></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className='flex flex-col mt-2 gap-2'>
					{data.map((item, index) => (
						<Card
							key={index}
							productName={item.PRODUCT_NAME}
							category={item.SUBCATEGORY || ''}
							status={''}
							id={item.CODIGO_PRODUCTO}
							sucursal={item.NOMBRE_SUCURSAL}
						>
							<div className='flex flex-col'>
								<span className='text-sm text-dark/70'>Stock Actual</span>
								<span className='text-lg font-semibold'>{item.STOCK_SUCURSAL}</span>
							</div>
							<div className='flex flex-col'>
								<span className='text-sm text-dark/70'>En Bodega</span>
								<span className='text-lg font-semibold'>{item.STOCK_BODEGA}</span>
							</div>
						</Card>
					))}
				</div>
			)}
		</>
	)
}