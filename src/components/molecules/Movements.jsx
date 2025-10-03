import React from 'react'
import DropdownMenu from './DropdownMenu'
import Input from './Input'
import Card from './Card'
import { FiArrowDownCircle, FiArrowUpCircle, FiSearch, FiShoppingCart, FiUser, FiXCircle } from 'react-icons/fi'
import { useIsMobile } from '@/hooks'
import { BsBuilding } from 'react-icons/bs'
import { TbSwitchHorizontal } from "react-icons/tb";
import { GoGear } from "react-icons/go";

export default function Movements() {
	const data = [
		{
			"fecha": "2024-01-25",
			"hora": "09:30",
			"tipo": "Entrada",
			"sucursal": "Sucursal Centro",
			"producto": {
				"nombre": "Martillo de Carpintero 16oz",
				"codigo": "HER001"
			},
			"cantidad": 50,
			"stock_anterior": 25,
			"stock_nuevo": 75,
			"motivo": "Compra a proveedor",
			"usuario": "Juan Pérez",
			"referencia": "ORD-001"
		},
		{
			"fecha": "2024-01-25",
			"hora": "11:15",
			"tipo": "Salida",
			"sucursal": "Sucursal Centro",
			"producto": {
				"nombre": "Destornillador Phillips #2",
				"codigo": "HER002"
			},
			"cantidad": 5,
			"stock_anterior": 50,
			"stock_nuevo": 45,
			"motivo": "Venta al cliente",
			"usuario": "María García",
			"referencia": "VEN-1234"
		},
		{
			"fecha": "2024-01-25",
			"hora": "14:20",
			"tipo": "Dañado",
			"sucursal": "Sucursal Norte",
			"producto": {
				"nombre": "Tornillos Autorroscantes 1/2\"",
				"codigo": "TOR001"
			},
			"cantidad": 2,
			"stock_anterior": 10,
			"stock_nuevo": 8,
			"motivo": "Productos dañados por humedad",
			"usuario": "Carlos López",
			"referencia": null
		},
		{
			"fecha": "2024-01-25",
			"hora": "16:30",
			"tipo": "Reserva",
			"sucursal": "Sucursal Sur",
			"producto": {
				"nombre": "Martillo de Carpintero 16oz",
				"codigo": "HER001"
			},
			"cantidad": 3,
			"stock_anterior": 20,
			"stock_nuevo": 17,
			"motivo": "Reserva para cliente VIP",
			"usuario": "Ana Rodríguez",
			"referencia": null
		}
	]

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
				<h2 className='md:text-2xl font-semibold'>Estado Detallado del Inventario</h2>
				<span className='text-sm md:text-medium text-dark/50'>Vista consolidada de todas las surcusales</span>
			</div>
			<div className='w-full flex flex-col gap-1 sticky top-0 bg-light pt-2 mb-4'>
				<Input
					placeholder={'Buscar producto...'}
					type={'search'}
					iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
				/>
				<div className='md:w-1/2 w-full flex gap-2 flex-col md:flex-row'>
					<DropdownMenu
						options={['Todos los tipos de movimientos', ...data.map(item => item.tipo).filter((value, index, self) => self.indexOf(value) === index)]}
						defaultValue={'Todos los tipos de movimientos'}
					/>
				</div>
			</div>
			{!isMobile ? (
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
							{data.map((item, index) => {
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
										<td className='p-2 md:truncate lg:whitespace-normal'>{item.motivo}</td>
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
			)}
		</>
	)
}
