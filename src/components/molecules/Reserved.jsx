import { useIsMobile } from '@/hooks';
import React from 'react'
import { FiBox, FiCheckCircle, FiClock, FiShoppingCart, FiUser } from 'react-icons/fi';
import { InfoCard } from '../atoms';
import { BsBuilding, BsTelephone } from 'react-icons/bs';
import Card from './Card';

export default function Reserved() {
	const isMobile = useIsMobile({ breakpoint: 768 });

	const cardData = {
		"reservados": 5,
		"pendientes": 3,
		"parciales": 1,
		"entregados": 1,
	}

	const cardsConfig = [
		{ key: "reservados", title: "Reservados", icon: FiShoppingCart, color: "purple" },
		{ key: "pendientes", title: "Pendientes", icon: FiClock, color: "yellow" },
		{ key: "parciales", title: "Parciales", icon: FiBox, color: "blue" },
		{ key: "entregados", title: "Entregados", icon: FiCheckCircle, color: "success" },
	];

	const data = [
		{
			"codigo": "HER801",
			"producto": "Martillo de Carpintero 16oz",
			"sucursal": "Sucursal Sur",
			"cantidad": 3,
			"cliente": {
				"nombre": "Roberto Silva",
				"id": "cust001"
			},
			"telefono": "555-1001",
			"fecha_reserva": "2024-01-25",
			"fecha_entrega": "2024-01-28",
			"estado": "Pendiente",
			"reservado_por": "Ana Rodríguez",
			"notas": "Cliente VIP, entrega prioritaria"
		},
		{
			"codigo": "HER802",
			"producto": "Destornillador Phillips #2",
			"sucursal": "Sucursal Centro",
			"cantidad": 2,
			"cliente": {
				"nombre": "Luis Martínez",
				"id": "cust002"
			},
			"telefono": "555-1002",
			"fecha_reserva": "2024-01-24",
			"fecha_entrega": "2024-01-26",
			"estado": "Pendiente",
			"reservado_por": "Juan Pérez",
			"notas": "Reserva para proyecto eléctrico"
		},
		{
			"codigo": "ELE801",
			"producto": "Cable Eléctrico 12 AWG",
			"sucursal": "Sucursal Centro",
			"cantidad": 3,
			"cliente": {
				"nombre": "Carmen López",
				"id": "cust003"
			},
			"telefono": "555-1003",
			"fecha_reserva": "2024-01-23",
			"fecha_entrega": "No definida",
			"estado": "Parcial",
			"reservado_por": "María García",
			"notas": "Entrega parcial realizada"
		}
	]

	const tiposConfig = [
		{ type: 'Pendiente', bgColor: 'bg-yellow', color: 'yellow', textColor: 'text-yellow' },
		{ type: 'Parcial', bgColor: 'bg-blue', color: 'blue', textColor: 'text-blue' },
		{ type: 'Entregado', bgColor: 'bg-success', color: 'success', textColor: 'text-success' },
	]

	return (
		<div>
			<div className='w-full flex flex-col mb-4'>
				<h2 className='md:text-2xl font-semibold flex items-center gap-2'>
					<FiShoppingCart className='text-purple' />
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
									<th className='text-start text-dark/50 font-semibold p-2'>Cliente</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Telefono</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Fecha<br />Reserva</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Fecha<br />Entrega</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Reservado Por</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Notas</th>
								</tr>
							</thead>
							<tbody className='w-full'>
								{data.map((item, index) => {
									const cfg = tiposConfig.find(t => t.type === item.estado) || {};
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
											<td className={`p-2 text-center ${cfg.textColor} ${cfg.bgColor}/10`}>{item.cantidad}</td>
											<td className='p-2 flex flex-col'>
												<span className='md:truncate lg:whitespace-normal'>{item.cliente.nombre}</span>
												<span className='text-dark/60 text-sm'>{item.cliente.id}</span>
											</td>
											<td className='p-2'>
												<div className='flex items-center gap-1'>
													<BsTelephone />
													{item.telefono}
												</div>
											</td>
											<td className='p-2'>{item.fecha_reserva}</td>
											<td className='p-2'>{item.fecha_entrega}</td>
											<td className='p-2'>
												<div className='flex items-center gap-1 font-normal'>
													<FiUser />
													{item.reservado_por}
												</div>
											</td>
											<td className='p-2'>
												<div className={`px-2 text-center rounded-full ${cfg.bgColor ?? 'bg-dark/10'}`}>
													<span className='text-sm text-light'>{item.estado}</span>
												</div>
											</td>
											<td className="p-2 truncate max-w-[150px]" title={item.notas}>
												<span>{item.notas}</span>
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
							const cfg = tiposConfig.find(t => t.type === item.estado) || {};
							return (
								<Card
									key={index}
									productName={item.producto}
									id={item.codigo}
									sucursal={item.sucursal}
									other={item.estado}
									bgColor={cfg.color}
								>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Cantidad</span>
										<span className='text-lg font-semibold'>{item.cantidad}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Cliente</span>
										<span className='text-lg font-semibold'>{item.cliente.nombre}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Telefono</span>
										<span className='text-lg font-semibold'>{item.telefono}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Reservado Por</span>
										<span className='text-lg font-semibold'>{item.reservado_por}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Fecha Reserva</span>
										<span className='text-lg font-semibold'>{item.fecha_reserva}</span>
									</div>
									<div className='flex flex-col'>
										<span className='text-sm text-dark/70'>Fecha Entrega</span>
										<span className='text-lg font-semibold'>{item.fecha_entrega}</span>
									</div>
									<div className='flex flex-col col-span-2'>
										<span className='text-sm text-dark/70'>Notas</span>
										<span className='text-lg font-semibold'>{item.notas}</span>
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
