import React, { useEffect, useState } from 'react'
import { FiAlertTriangle, FiDollarSign, FiTrendingDown, FiUser, FiXCircle } from 'react-icons/fi'
import { InfoCard } from '../atoms'
import { BsBuilding } from 'react-icons/bs';
import { useIsMobile } from '@/hooks';
import Card from './Card';
import StockService from '@/services/StockService';

export default function Damaged({ sucursalFilter = 'Todas' }) {
	const isMobile = useIsMobile({ breakpoint: 768 });

	const [loading, setLoading] = useState(false);
	const [cardData, setCardData] = useState({ danados: 0, recuperables: 0, perdida_total: 0, valor_perdido: 0 });
	const [rows, setRows] = useState([]);

	const cardsConfig = [
		{ key: "danados", title: "Dañados", icon: FiXCircle, color: "danger" },
		{ key: "recuperables", title: "Recuperables", icon: FiAlertTriangle, color: "yellow" },
		{ key: "perdida_total", title: "Perdida total", icon: FiTrendingDown, color: "secondary" },
		{ key: "valor_perdido", title: "Valor perdido", icon: FiDollarSign, color: "danger" },
	];

	// rows state will hold the list of damaged records returned by the API

	const tiposConfig = [
		{ type: 'Deteriorado', bgColor: 'bg-danger', color: 'danger', textColor: 'text-danger' },
		{ type: 'Defectuoso', bgColor: 'bg-primary', color: 'primary', textColor: 'text-primary' },
		{ type: 'Vencido', bgColor: 'bg-danger', color: 'danger', textColor: 'text-danger' },
		{ type: 'Recuperable', bgColor: 'bg-success' },
		{ type: 'Pérdida Total', bgColor: 'bg-danger' },
	]

	useEffect(() => {
		const fetchDamaged = async () => {
			try {
				setLoading(true);
				const res = await StockService.getDanados(sucursalFilter || 'Todas');
				if (res && res.success) {
					const danados = res.danados || [];
					setRows(danados);
					// Normalizar estados para cálculo de tarjetas
					const norm = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
					const toNum = (v) => (v == null || v === '' ? 0 : Number(v));
					const totalUnidades = danados.reduce((acc, r) => acc + toNum(r.cantidad), 0);
					const recuperables = danados.reduce((acc, r) => acc + (norm(r.estado) === 'recuperable' ? toNum(r.cantidad) : 0), 0);
					const perdidasTotales = danados.reduce((acc, r) => acc + (norm(r.estado) === 'perdida total' ? toNum(r.cantidad) : 0), 0);
					const valorPerdido = danados.reduce((acc, r) => acc + toNum(r.perdida), 0);
					setCardData({ danados: totalUnidades, recuperables, perdida_total: perdidasTotales, valor_perdido: valorPerdido });
				} else {
					setRows([]);
					setCardData({ danados: 0, recuperables: 0, perdida_total: 0, valor_perdido: 0 });
				}
			} catch (err) {
				console.error('Error cargando dañados:', err);
				setRows([]);
				setCardData({ danados: 0, recuperables: 0, perdida_total: 0, valor_perdido: 0 });
			} finally {
				setLoading(false);
			}
		};
		fetchDamaged();

		const handler = () => fetchDamaged();
		window.addEventListener('stock:updated', handler);
		return () => window.removeEventListener('stock:updated', handler);
	}, [sucursalFilter]);

	return (
		<div>
			<div className='w-full flex flex-col mb-4'>
				<h2 className='md:text-2xl font-semibold flex items-center gap-2'>
					<FiXCircle className='text-danger' />
					Productos Dañados
				</h2>
				<span className='text-sm md:text-medium text-dark/50'>Productos dañados {sucursalFilter && sucursalFilter !== 'Todas' ? `en ${sucursalFilter}` : 'en todas las sucursales'}</span>
			</div>
			<section className='grid grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
				{
					cardsConfig.map((cfg, index) => (
						<InfoCard
							key={index}
							CardTitle={cfg.title}
							cardValue={cardData[cfg.key]}
							cardIcon={<cfg.icon className={`h-4 w-4 md:h-6 md:w-6 text-${cfg.color}`} />}
							cardIconColor={cfg.color}
						/>
					))
				}
			</section>
			<section>
				{!isMobile ? (
					<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
						<table className='w-full border-collapse'>
							<thead className=' w-full border-b border-dark/20'>
								<tr className='w-full'>
									<th className='text-start text-dark/50 font-semibold p-2'>Codigo</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Producto</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
									<th className='text-center text-dark/50 font-semibold p-2'>Cantidad</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Tipo de daño</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Fecha</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Reportado por</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Perdida</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Descripcion</th>
								</tr>
							</thead>
							<tbody className='w-full'>
								{rows.map((item, index) => {
									const findCfg = (arr, value) => {
										const norm = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
										const nv = norm(value);
										return arr.find(t => norm(t.type) === nv) || {};
									};
									const cfgDano = findCfg(tiposConfig, item.tipo_dano);
									const cfgEstado = findCfg(tiposConfig, item.estado);
									return (
										<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
											<td className='p-2'>{item.codigo}</td>
											<td className='p-2 md:truncate lg:whitespace-normal'>{item.producto}</td>
											<td className='p-2 text-dark/70 max-w-[180px] truncate'>
												<span className='flex items-center gap-1'>
													<BsBuilding />
													{item.sucursal}
												</span>
											</td>
											<td className={`p-2 text-center ${cfgDano.textColor} ${cfgDano.bgColor}/10`}>{item.cantidad}</td>
											<td className='p-2'>
												<div className={`px-2 text-center rounded-full ${cfgDano.bgColor ?? 'bg-dark/10'}`}>
													<span className='text-sm text-light'>{item.tipo_dano}</span>
												</div>
											</td>
											<td className="p-2">{item.fecha}</td>
											<td className='p-2'>
												<div className='flex items-center gap-1 truncate'>
													<FiUser />
													{item.reportado_por}
												</div>
											</td>
											<td className='p-2 text-danger'>{item.perdida}</td>
											<td className='p-2'>
												<div className={`px-2 text-center rounded-full ${cfgEstado.bgColor ?? 'bg-dark/10'}`}>
													<span className='text-sm text-light'>{item.estado}</span>
												</div>
											</td>
											<td className="p-2 truncate max-w-[150px]" title={item.descripcion}>
												<span>{item.descripcion}</span>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				) : (
					<div className='flex flex-col mt-2 gap-2'>
								{rows.map((item, index) => {
								const findCfg = (arr, value) => {
									const norm = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
									const nv = norm(value);
									return arr.find(t => norm(t.type) === nv) || {};
								};
								const cfg = findCfg(tiposConfig, item.tipo_dano);
							return (
								<Card
									key={index}
									productName={item.producto}
									id={item.codigo}
									sucursal={item.sucursal}
										other={item.tipo_dano}
									status={item.estado}
									bgColor={cfg.color}
								>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Cantidad</span>
										<span className='text-lg font-semibold'>{item.cantidad}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Perdida</span>
										<span className='text-lg font-semibold'>{item.perdida}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Fecha</span>
										<span className='text-lg font-semibold'>{item.fecha}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Reportado por</span>
										<span className='text-lg font-semibold'>{item.reportado_por}</span>
									</div>
									<div className='flex flex-col col-span-2'>
										<span className='text-sm text-dark/70'>Descripcion</span>
										<span className='text-lg font-semibold'>{item.descripcion}</span>
									</div>
								</Card>
							)
						})}
					</div>
				)}
			</section>
		</div>
	)
}
