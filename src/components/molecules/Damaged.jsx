import React from 'react'
import { FiAlertTriangle, FiDollarSign, FiTrendingDown, FiUser, FiXCircle } from 'react-icons/fi'
import { InfoCard } from '../atoms'
import { BsBoxSeam, BsBuilding } from 'react-icons/bs';
import { useIsMobile } from '@/hooks';
import Card from './Card';

export default function Damaged() {
	const isMobile = useIsMobile({ breakpoint: 768 });

	const cardData = {
		"danados": 5,
		"recuperables": 50,
		"perdida_total": 1,
		"valor_perdido": 150,
	}

	const cardsConfig = [
		{ key: "danados", title: "Dañados", icon: FiXCircle, color: "danger" },
		{ key: "recuperables", title: "Recuperables", icon: FiAlertTriangle, color: "yellow" },
		{ key: "perdida_total", title: "Perdida total", icon: FiTrendingDown, color: "secondary" },
		{ key: "valor_perdido", title: "Valor perdido", icon: FiDollarSign, color: "danger" },
	];

	const data = [
		{
			"codigo": "TOR001",
			"producto": "Tornillos Autroscantes 1/2\"",
			"sucursal": "Sucursal Norte",
			"ubicacion": "B-2-1",
			"cantidad": 5,
			"tipo_de_dano": "Deteriorado",
			"fecha": "2024-01-25",
			"reportado_por": "Carlos López",
			"perdida": 4.25,
			"estado": "Pérdida Total",
			"descripcion": "Tornillos oxidados por humedad."
		},
		{
			"codigo": "ELE021",
			"producto": "Cable Eléctrico 12 AWG",
			"sucursal": "Sucursal Centro",
			"ubicacion": "D-1-4",
			"cantidad": 5,
			"tipo_de_dano": "Defectuoso",
			"fecha": "2024-01-24",
			"reportado_por": "María García",
			"perdida": 42.50,
			"estado": "Recuperable",
			"descripcion": "Cable con aislamiento dañado."
		},
		{
			"codigo": "ELE021",
			"producto": "Cable Eléctrico 12 AWG",
			"sucursal": "Sucursal Centro",
			"ubicacion": "D-1-4",
			"cantidad": 5,
			"tipo_de_dano": "Defectuoso",
			"fecha": "2024-01-24",
			"reportado_por": "María García",
			"perdida": 42.50,
			"estado": "Recuperable",
			"descripcion": "Cable con aislamiento dañado. Cable con aislamiento dañado. Cable con aislamiento dañado. Cable con aislamiento dañado."
		},
		{
			"codigo": "ELE021",
			"producto": "Cable Eléctrico 12 AWG",
			"sucursal": "Sucursal Centro",
			"ubicacion": "D-1-4",
			"cantidad": 5,
			"tipo_de_dano": "Defectuoso",
			"fecha": "2024-01-24",
			"reportado_por": "María García",
			"perdida": 42.50,
			"estado": "Recuperable",
			"descripcion": "Cable con aislamiento dañado."
		},
		{
			"codigo": "ELE021",
			"producto": "Cable Eléctrico 12 AWG",
			"sucursal": "Sucursal Centro",
			"ubicacion": "D-1-4",
			"cantidad": 5,
			"tipo_de_dano": "Defectuoso",
			"fecha": "2024-01-24",
			"reportado_por": "María García",
			"perdida": 42.50,
			"estado": "Recuperable",
			"descripcion": "Cable con aislamiento dañado."
		},
		{
			"codigo": "PIN021",
			"producto": "Pintura Vinílica Blanca 4L",
			"sucursal": "Sucursal Sur",
			"ubicacion": "C-3-2",
			"cantidad": 4,
			"tipo_de_dano": "Vencido",
			"fecha": "2024-01-23",
			"reportado_por": "Ana Rodríguez",
			"perdida": 500.00,
			"estado": "Pérdida Total",
			"descripcion": "Pintura vencida, solidificada."
		}
	]

	const tiposConfig = [
		{ type: 'Deteriorado', bgColor: 'bg-danger', color: 'danger', textColor: 'text-danger' },
		{ type: 'Defectuoso', bgColor: 'bg-primary', color: 'primary', textColor: 'text-primary' },
		{ type: 'Vencido', bgColor: 'bg-danger', color: 'danger', textColor: 'text-danger' },
		{ type: 'Recuperable', bgColor: 'bg-success' },
		{ type: 'Pérdida Total', bgColor: 'bg-danger' },
	]

	return (
		<div>
			<div className='w-full flex flex-col mb-4'>
				<h2 className='md:text-2xl font-semibold flex items-center gap-2'>
					<FiXCircle className='text-danger' />
					Productos Dañados
				</h2>
				<span className='text-sm md:text-medium text-dark/50'>Productos dañados en todas las sucursales</span>
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
								{data.map((item, index) => {
									const cfgDano = tiposConfig.find(t => t.type === item.tipo_de_dano) || {};
									const cfgEstado = tiposConfig.find(t => t.type === item.estado) || {};
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
													<span className='text-sm text-light'>{item.tipo_de_dano}</span>
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
						{data.map((item, index) => {
							const cfg = tiposConfig.find(t => t.type === item.tipo_de_dano) || {};
							return (
								<Card
									key={index}
									productName={item.producto}
									id={item.codigo}
									sucursal={item.sucursal}
									other={item.tipo_de_dano}
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
