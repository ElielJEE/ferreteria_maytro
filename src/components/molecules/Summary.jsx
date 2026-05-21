'use client'
import { useIsMobile } from '@/hooks';
import React, { useEffect, useState, useMemo } from 'react';
import DropdownMenu from './DropdownMenu';
import Input from './Input';
import { FiSearch } from 'react-icons/fi';
import { BsBuilding } from 'react-icons/bs'
import Card from './Card';
import StockService from '@/services/StockService';

export default function Summary({ sucursalFilter }) {
	const [data, setData] = useState([]);
	const [search, setSearch] = useState('');
	const isMobile = useIsMobile({ breakpoint: 768 });

	const filteredData = useMemo(() => {
		if (!search) return data;
		const query = search.toLowerCase();
		return data.filter(item => {
			const nombre = (item.PRODUCT_NAME || '').toString().toLowerCase();
			const codigo = (item.CODIGO_PRODUCTO || '').toString().toLowerCase();
			const sucursal = (item.NOMBRE_SUCURSAL || '').toString().toLowerCase();
			return nombre.includes(query) || codigo.includes(query) || sucursal.includes(query);
		});
	}, [data, search]);

	const computeEstado = (item) => {
		// El backend devuelve en minúsculas por case mapping
		const stock = Number(item?.stock_sucursal || item?.STOCK_SUCURSAL || 0);
		
		// Obtener min y max de forma defensiva
		let minVal = item?.MINIMO || item?.minimo;
		let maxVal = item?.MAXIMO || item?.maximo;
		
		const min = (minVal && minVal !== '' && !isNaN(minVal)) ? Number(minVal) : null;
		const max = (maxVal && maxVal !== '' && !isNaN(maxVal)) ? Number(maxVal) : null;

		// Lógica según especificación:
		// 1. Si stock es 0 → Agotado
		if (stock === 0) return 'Agotado';
		
		// 2. Si stock está por debajo del mínimo → Bajo
		if (min !== null && stock < min) return 'Bajo';
		
		// 3. Si stock es mayor al máximo → Exceso
		if (max !== null && stock > max) return 'Exceso';
		
		// 4. Si está dentro del rango o sin rango definido → Disponible
		return 'Disponible';
	};

	const estadoStyles = {
		disponible: 'bg-success',
		bajo: 'bg-danger',
		agotado: 'bg-danger',
		exceso: 'bg-blue',
		default: 'bg-dark',
	};

	useEffect(() => {
		const fetchResumen = async () => {
			const result = await StockService.getResumen(sucursalFilter);
			if (!result.success) {
				console.error('Error fetching resumen:', result.message);
				setData([]);
				return;
			}
			const rows = (result.resumen || []).map(r => ({
				...r,
				STOCK_SUCURSAL: r.STOCK_SUCURSAL ?? r.stock_sucursal ?? 0,
				STOCK_BODEGA: r.STOCK_BODEGA ?? r.stock_bodega ?? 0,
				FISICO_TOTAL: r.FISICO_TOTAL ?? r.fisico_total ?? 0,
				DANADOS: r.DANADOS ?? r.danados ?? 0,
				RESERVADOS: r.RESERVADOS ?? r.reservados ?? 0,
				MINIMO: r.MINIMO ?? r.minimo ?? '',
				MAXIMO: r.MAXIMO ?? r.maximo ?? '',
				PRODUCT_NAME: r.PRODUCT_NAME ?? r.producto ?? '',
				CODIGO_PRODUCTO: r.CODIGO_PRODUCTO ?? r.codigo ?? '',
				NOMBRE_SUCURSAL: r.NOMBRE_SUCURSAL ?? r.sucursal ?? '',
				status: r.STATUS || r.status || ''
			}));
			setData(rows);
		};
		fetchResumen();

		// Re-fetch when stock is updated elsewhere
		const handler = () => fetchResumen();
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
				value={search}
				onChange={(e) => setSearch(e.target.value)}
					type={'search'}
					iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
				/>
				{/* Puedes agregar filtros dinámicos aquí si lo deseas */}
			</div>
			{
				data.length > 0 ? (
					!isMobile ? (
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
									</tr>
								</thead>
								<tbody className='w-full'>
									{filteredData.map((item, index) => (
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
											<td className='p-2 text-success bg-success/10 text-center'>{item.stock_sucursal}</td>
											<td className='p-2 text-primary bg-primary/10 text-center'>{item.STOCK_BODEGA}</td>
											<td className='p-2 text-blue bg-blue/10 text-center'>{item.FISICO_TOTAL}</td>
											<td className='p-2 text-danger bg-danger/10 text-center'>{item.DANADOS !== undefined && item.DANADOS !== null ? item.DANADOS : ''}</td>
											<td className='p-2 text-purple bg-purple/10 text-center'>{item.RESERVADOS !== undefined && item.RESERVADOS !== null ? item.RESERVADOS : ''}</td>
											<td className='p-2 bg-dark/10 max-w-[180px] truncate text-center'>
												{(item.MINIMO || item.MAXIMO) ? `${item.MINIMO || 0} - ${item.MAXIMO || 0}` : ''}
											</td>
											<td className='p-2 text-center'>
												{(() => {
													const estado = computeEstado(item);
													return (
														<span className={`flex items-center justify-center p-1 rounded-full text-light text-xs ${estadoStyles[estado.toLowerCase()]}`}>
															{estado}
														</span>
													);
												})()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className='flex flex-col mt-2 gap-2'>
							{filteredData.map((item, index) => (
								<Card
									key={index}
									productName={item.PRODUCT_NAME}
									category={item.SUBCATEGORY}
									status={computeEstado(item)}
									id={item.CODIGO_PRODUCTO}
									sucursal={item.NOMBRE_SUCURSAL ? item.NOMBRE_SUCURSAL : 'Bodega'}
								>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Stock Actual</span>
										<span className='text-lg font-semibold'>{item.STOCK_SUCURSAL}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>En Bodega</span>
										<span className='text-lg font-semibold'>{item.STOCK_BODEGA}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Fisico Total</span>
										<span className='text-lg font-semibold'>{item.FISICO_TOTAL}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Dañados</span>
										<span className='text-lg font-semibold text-danger'>{item.DANADOS}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Reservados</span>
										<span className='text-lg font-semibold text-purple'>{item.RESERVADOS}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Rango</span>
										<span className='text-lg font-semibold'>{item.MINIMO} - {item.MAXIMO}</span>
									</div>
								</Card>
							))}
						</div>
					)) : (
					<div className='w-full text-2xl font-semibold p-10 text-center'>
						{
							data
								? "Cargando Datos..."
								: "No hay Datos para mostrar"
						}
					</div>
				)
			}
		</>
	)
}