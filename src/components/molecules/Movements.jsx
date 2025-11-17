import React from 'react'
import DropdownMenu from './DropdownMenu'
import Input from './Input'
import Card from './Card'
import { FiArrowDownCircle, FiArrowUpCircle, FiSearch, FiShoppingCart, FiUser, FiXCircle } from 'react-icons/fi'
import { useIsMobile } from '@/hooks'
import { BsBuilding } from 'react-icons/bs'
import { TbSwitchHorizontal } from "react-icons/tb";
import { GoGear } from "react-icons/go";

export default function Movements({ sucursalFilter }) {
	const [data, setData] = React.useState([]);
	const [loading, setLoading] = React.useState(false);
	const [search, setSearch] = React.useState('');
	const [tipoFiltro, setTipoFiltro] = React.useState('Todos los tipos de movimientos');

	const fetchMovimientos = React.useCallback(async (sucursal) => {
		try {
			setLoading(true);
			const StockService = (await import('@/services/StockService')).default;
			const res = await StockService.getMovimientos(sucursal || 'Todas');
			const movimientos = res && res.movimientos ? res.movimientos : [];
			setData(movimientos);
		} catch (err) {
			console.error('Error fetching movimientos:', err);
			setData([]);
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		fetchMovimientos(sucursalFilter || 'Todas');
	}, [fetchMovimientos, sucursalFilter]);

	React.useEffect(() => {
		const handler = () => fetchMovimientos(sucursalFilter || 'Todas');
		window.addEventListener('stock:updated', handler);
		return () => window.removeEventListener('stock:updated', handler);
	}, [fetchMovimientos, sucursalFilter]);

	const tiposConfig = [
		{ type: 'Entrada', Icon: <FiArrowUpCircle className='text-success h-4 w-5' />, bgColor: 'bg-success', textColor: 'text-success' },
		{ type: 'Salida', Icon: <FiArrowDownCircle className='text-secondary h-4 w-5' />, bgColor: 'bg-secondary', textColor: 'text-secondary' },
		{ type: 'Transferencia', Icon: <TbSwitchHorizontal className='text-yellow h-4 w-5' />, bgColor: 'bg-yellow', textColor: 'text-yellow' },
		{ type: 'Dañado', Icon: <FiXCircle className='text-danger h-4 w-5' />, bgColor: 'bg-danger', textColor: 'text-danger' },
		{ type: 'Reserva', Icon: <FiShoppingCart className='text-purple h-4 w-5' />, bgColor: 'bg-purple', textColor: 'text-purple' },
		{ type: 'Ajuste', Icon: <GoGear className='text-dark h-4 w-5' />, bgColor: 'bg-dark', textColor: 'text-dark' },
	]

	const isMobile = useIsMobile({ breakpoint: 768 });

	return (
		<>
			<div className='w-full flex flex-col mb-4'>
				<h2 className='md:text-2xl font-semibold'>Historial de Movimientos</h2>
				<span className='text-sm md:text-medium text-dark/50'>Movimientos de todas las sucursales</span>
			</div>
			<div className='w-full flex flex-col gap-1 sticky top-0 bg-light pt-2 mb-4'>
				<Input
					placeholder={'Buscar producto...'}
					type={'search'}
					iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<div className='md:w-1/2 w-full flex gap-2 flex-col md:flex-row'>
					<DropdownMenu
						options={['Todos los tipos de movimientos', ...data.map(item => item.tipo).filter((value, index, self) => self.indexOf(value) === index)]}
						defaultValue={tipoFiltro}
						onChange={(v) => setTipoFiltro(typeof v === 'string' ? v : v)}
					/>
				</div>
			</div>
			{
				data.length > 0 ?
					(!isMobile ? (
						<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
							<table className='w-full border-collapse'>
								<thead className=' w-full border-b border-dark/20'>
									<tr className='w-full'>
										<th className='text-start text-dark/50 font-semibold p-2'>Fecha/Hora</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Tipo</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Producto</th>
										<th className='text-center text-dark/50 font-semibold p-2'>Cantidad</th>
										<th className='text-center text-dark/50 font-semibold p-2'>Stock Anterior</th>
										<th className='text-center text-dark/50 font-semibold p-2'>Stock Nuevo</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Motivo</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Usuario</th>
										<th className='text-start text-dark/50 font-semibold p-2'>Referencia</th>
									</tr>
								</thead>
								<tbody className='w-full'>
									{(loading ? [] : data)
										.filter(item => {
											// search by product name or code
											if (!search) return true;
											const q = search.toLowerCase();
											return (item.producto?.nombre || '').toLowerCase().includes(q) || (item.producto?.codigo || '').toLowerCase().includes(q);
										})
										.filter(item => {
											if (!tipoFiltro || tipoFiltro === 'Todos los tipos de movimientos') return true;
											return item.tipo === tipoFiltro;
										})
										.map((item, index) => {
											const cfg = tiposConfig.find(t => t.type === item.tipo) || {};
											return (
												<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
													<td className='p-2'>
														<div className='flex flex-col justify-center'>
															{item.fecha}
															<span className='text-dark/60 text-xs'>{item.hora}</span>
														</div>
													</td>
													<td className='p-2'>
														<div className='flex items-center gap-1'>
															{cfg.Icon && cfg.Icon}
															<div className={`px-2 rounded-full ${cfg.bgColor ?? 'bg-dark/10'}`}>
																<span className='text-sm text-light'>{item.tipo}</span>
															</div>
														</div>
													</td>
													<td className='p-2 text-dark/70 max-w-[180px] truncate'>
														<span className='flex items-center gap-1'>
															<BsBuilding />
															{item.sucursal}
														</span>
													</td>
													<td className='p-2 flex flex-col'>
														<span className='md:truncate lg:whitespace-normal'>{item.producto.nombre}</span>
														<span className='text-dark/60 text-sm'>{item.producto.codigo}</span>
													</td>
													<td className={`p-2 text-center ${cfg.textColor} ${cfg.bgColor}/10`}>{item.cantidad}</td>
													<td className='p-2 text-center'>{item.stock_anterior}</td>
													<td className='p-2 text-center'>{item.stock_nuevo}</td>
													<td className="p-2 truncate max-w-[150px]" title={item.motivo}>{item.motivo}</td>
													<td className='p-2'>
														<div className='flex items-center gap-1 truncate'>
															<FiUser />
															{item.usuario}
														</div>
													</td>
													<td className='p-2'>{item.referencia}</td>
												</tr>
											)
										})}
								</tbody>
							</table>
						</div>
					) : (
						<div className='flex flex-col mt-2 gap-2'>
							{data.map((item, index) => {
								const cfg = tiposConfig.find(t => t.type === item.tipo) || {};
								return (
									<Card
										key={index}
										productName={item.producto.nombre}
										id={item.producto.codigo}
										sucursal={item.sucursal}
									>
										<div className='flex flex-col'>
											<span className='text-lg font-semibold'>{item.fecha}</span>
											<span className='text-sm text-dark/70'>{item.hora}</span>
										</div>
										<div className='flex items-center justify-between mb-2'>
											<div className='flex items-center gap-1'>
												{cfg.Icon}
												<div className={`inline-flex items-center gap-2 px-2 text-light py-1 rounded-full ${cfg.bgColor ?? 'bg-dark/10'}`}>
													<span className='text-sm'>{item.tipo}</span>
												</div>
											</div>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Cantidad</span>
											<span className='text-lg font-semibold'>{item.cantidad}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Stock Anterior</span>
											<span className='text-lg font-semibold'>{item.stock_anterior}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Stock Nuevo</span>
											<span className='text-lg font-semibold'>{item.stock_nuevo}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Usuario</span>
											<span className='text-lg font-semibold'>{item.usuario}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Motivo</span>
											<span className='text-lg font-semibold'>{item.motivo}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Referencia</span>
											<span className='text-lg font-semibold'>{item.referencia ? item.referencia : "-"}</span>
										</div>
									</Card>
								)
							})}
						</div>
					)) : (
						<div className='w-full text-2xl font-semibold p-10 text-center'>
							{
								data
									? "Cargando Movimientos..."
									: "No hay Movimientos registrados"
							}
						</div>
					)

			}
		</>
	)
}
