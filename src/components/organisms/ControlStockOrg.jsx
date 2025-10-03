"use client"
import React, { useState } from 'react'
import { Button, InfoCard, ModalContainer } from '../atoms'
import { FiAlertTriangle, FiBox, FiDollarSign, FiEye, FiFile, FiGlobe, FiSearch, FiShoppingCart, FiTrendingUp, FiX, FiXCircle } from 'react-icons/fi'
import { BsBoxSeam, BsBuilding, BsGear } from 'react-icons/bs'
import { Card, DropdownMenu, Input } from '../molecules'
import { useActive, useIsMobile } from '@/hooks'

export default function ControlStockOrg() {
	const cardData = {
		"en_bodega": 1250,
		"en_stock": 12,
		"fisico_total": 1250,
		"danados": 5,
		"reservados": 50,
		"criticos": 1,
		"agotados": 150,
		"valor_total": 1250.00
	}

	const data = [
		{
			"codigo": "P001",
			"nombre": "Laptop MSI GF63",
			"categoria": "Tornilleria",
			"sucursal": "Central",
			"stock_actual": 12,
			"en_bodega": 8,
			"fisico_total": 20,
			"danados": 1,
			"reservados": 2,
			"min_stock": 5,
			"max_stock": 30,
			"estado": "Disponible",
			"valor": 15000.00
		},
		{
			"codigo": "P002",
			"nombre": "Mouse Logitech G203",
			"categoria": "Electricidad",
			"sucursal": "Sucursal Norte",
			"stock_actual": 45,
			"en_bodega": 30,
			"fisico_total": 75,
			"danados": 3,
			"reservados": 5,
			"min_stock": 20,
			"max_stock": 100,
			"estado": "Disponible",
			"valor": 5250.00
		},
		{
			"codigo": "P003",
			"nombre": "Teclado Mecánico Redragon K552",
			"categoria": "Plomeria",
			"sucursal": "Sucursal Sur",
			"stock_actual": 5,
			"en_bodega": 2,
			"fisico_total": 7,
			"danados": 0,
			"reservados": 3,
			"min_stock": 5,
			"max_stock": 20,
			"estado": "Bajo",
			"valor": 2100.00
		},
		{
			"codigo": "P004",
			"nombre": "Monitor Samsung 24''",
			"categoria": "Pinturas",
			"sucursal": "Central",
			"stock_actual": 0,
			"en_bodega": 0,
			"fisico_total": 0,
			"danados": 0,
			"reservados": 0,
			"min_stock": 2,
			"max_stock": 15,
			"estado": "Agotado",
			"valor": 0.00
		},
		{
			"codigo": "P005",
			"nombre": "Silla Gamer Cougar Armor",
			"categoria": "Herramientas Manuales",
			"sucursal": "Sucursal Norte",
			"stock_actual": 21,
			"en_bodega": 5,
			"fisico_total": 15,
			"danados": 1,
			"reservados": 4,
			"min_stock": 5,
			"max_stock": 20,
			"estado": "Exceso",
			"valor": 9750.00
		}
	]


	const cardsConfig = [
		{ key: "en_bodega", title: "En Bodega Disponible", icon: BsBoxSeam, color: "primary" },
		{ key: "en_stock", title: "En stock", icon: FiTrendingUp, color: "success" },
		{ key: "fisico_total", title: "Fisico Total", icon: FiEye, color: "blue" },
		{ key: "danados", title: "Dañados", icon: FiX, color: "danger" },
		{ key: "reservados", title: "Reservados", icon: FiShoppingCart, color: "purple" },
		{ key: "criticos", title: "Criticos", icon: FiAlertTriangle, color: "yellow" },
		{ key: "agotados", title: "Agotados", icon: BsBoxSeam, color: "secondary" },
		{ key: "valor_total", title: "Valor total", icon: FiDollarSign, color: "success", prefix: "C$ " },
	];

	const [activeTab, setActiveTab] = useState("Resumen");

	const tabs = [
		{ label: "Resumen", icon: <FiEye /> },
		{ label: "Movimientos", icon: <FiFile /> },
		{ label: "Alertas", icon: <FiAlertTriangle /> },
		{ label: "Dañados", icon: <FiXCircle /> },
		{ label: "Reservados", icon: <FiShoppingCart /> },
	];

	const isMobile = useIsMobile({ breakpoint: 768 });
	const { setIsActiveModal, isActiveModal } = useActive();


	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='flex flex-col md:flex-row w-full gap-1 md:items-center justify-start border border-dark/20 rounded-lg p-4 mb-4'>
					<div className='flex gap-1 items-center'>
						<FiGlobe className='h-4 w-4 md:h-5 md:w-5 text-blue' />
						<h3 className='md:text-lg font-semibold'>Sucursal: </h3>
					</div>
					<div className='lg:w-1/3 md:w-1/2'>
						<DropdownMenu
							options={['Vista general (Todas las sucursales)', 'sucursal 1', 'sucursal 2']}
							defaultValue={"Vista general (Todas las sucursales)"}
						/>
					</div>
				</section>
				<section className='w-full flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-4'>
					{
						cardsConfig.map((cfg, index) => (
							<div key={index} className='snap-start shrink-0 w-72 lg:w-auto'>
								<InfoCard
									CardTitle={cfg.title}
									cardValue={cardData[cfg.key]}
									cardIcon={<cfg.icon className={`h-4 w-4 md:h-6 md:w-6 text-${cfg.color}`} />}
									cardIconColor={cfg.color}
								/>
							</div>
						))
					}
				</section>
				<section className='w-full mt-6'>
					<div className='grid grid-cols-5 p-1 h-10 bg-dark/10 rounded-sm text-dark/50 font-semibold'>
						{tabs.map((tab) => (
							<div
								key={tab.label}
								className={`flex gap-2 items-center justify-center cursor-pointer rounded-sm ${activeTab === tab.label ? "bg-light text-dark" : ""
									}`}
								onClick={() => setActiveTab(tab.label)}
							>
								{tab.icon}
								<h2>{tab.label}</h2>
							</div>
						))}
					</div>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
						<div className='flex flex-col'>
							<h2 className='md:text-2xl font-semibold'>Estado Detallado del Inventario</h2>
							<span className='text-sm md:text-medium text-dark/50'>Vista consolidada de todas las surcusales</span>
						</div>
						<div className='flex xl:w-[20%] lg:w-[30%] md:w-[40%] sm:w-[50%] w-full md:justify-end'>
							<Button
								className={"primary"}
								text={"Ajustar Stock"}
								icon={<BsGear className='h-4 w-4' />}
								func={() => setIsActiveModal(true)}
							/>
						</div>
					</div>
					<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-4'>
						<Input
							placeholder={"Buscar producto..."}
							type={"search"}
							iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
						/>
						<div className='md:w-1/2 w-full flex gap-2 flex-col md:flex-row'>
							<DropdownMenu
								options={['Todas las Categorias', ...data.map(item => item.categoria).filter((value, index, self) => self.indexOf(value) === index)]}
								defaultValue={'Todas las Categorias'}
							/>
							<DropdownMenu
								options={['Todos los Estados', ...data.map(item => item.estado).filter((value, index, self) => self.indexOf(value) === index)]}
								defaultValue={'Todos los estados'}
							
							/>
						</div>
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
										<th className='text-center text-dark/50 font-semibold p-2'>Fisico Total</th>
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
											<td className='p-2'>{item.codigo}</td>
											<td className='p-2 max-w-[180px] truncate flex flex-col'>
												{item.nombre}
												<span className='text-dark/60 text-sm'>
													{item.categoria}
												</span>
											</td>
											<td className='p-2 text-dark/70 max-w-[180px] truncate'>
												<span className='flex items-center gap-1'>
													<BsBuilding />
													{item.sucursal}
												</span>
											</td>
											<td className='p-2 text-success bg-success/10 text-center'>{item.stock_actual}</td>
											<td className='p-2 text-primary bg-primary/10 text-center'>{item.en_bodega}</td>
											<td className='p-2 text-blue bg-blue/10 text-center'>{item.fisico_total}</td>
											<td className='p-2 text-danger bg-danger/10 text-center'>{item.danados}</td>
											<td className='p-2 text-purple bg-purple/10 text-center'>{item.reservados}</td>
											<td className='p-2 bg-dark/10 max-w-[180px] truncate text-center'>{item.min_stock} - {item.max_stock}</td>
											<td className='p-2'>
												<span className={`flex items-center justify-center p-1 rounded-full text-light text-xs
													${item.estado === 'Disponible'
														? 'bg-success'
														: item.estado === 'Exceso'
															? 'bg-blue'
															: item.estado === 'Bajo'
																? 'bg-yellow'
																: 'bg-danger'
													}`}>
													{item.estado}
												</span>
											</td>
											<td className='p-2'>C${item.valor}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className='flex flex-col mt-2 gap-2'>
							{
								data.map((item, index) => (
									<Card
										key={index}
										productName={item.nombre}
										category={item.categoria}
										status={item.estado}
										id={item.codigo}
										sucursal={item.sucursal}
									>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Stock Actual</span>
											<span className='text-lg font-semibold'>{item.stock_actual}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>En Bodega</span>
											<span className='text-lg font-semibold'>{item.en_bodega}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Fisico Total</span>
											<span className='text-lg font-semibold'>{item.fisico_total}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Dañados</span>
											<span className='text-lg font-semibold text-danger'>{item.danados}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Reservados</span>
											<span className='text-lg font-semibold text-purple'>{item.reservados}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Rango</span>
											<span className='text-lg font-semibold'>{item.min_stock} - {item.max_stock}</span>
										</div>
									</Card>
								))
							}
						</div>
					)}
				</section>
			</div>
			{
				isActiveModal &&
				<ModalContainer
					setIsActiveModal={setIsActiveModal}
					txtButton={'Registrar Movimiento'}
					modalTitle={'Ajustar Stock de Producto'}
					modalDescription={'Registra un movimiento de inventario'}
				>
					<form className='w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
						<DropdownMenu
							label={"Sucursal"}
							options={data.map(data => data.sucursal).filter((value, index, self) => self.indexOf(value) === index)}
							defaultValue={'Selecciona una sucursal'}
						/>
						<DropdownMenu
							label={"Producto"}
							options={data.map(data => data.nombre).filter((value, index, self) => self.indexOf(value) === index)}
							defaultValue={'Selecciona un producto'}
						/>
						<DropdownMenu
							label={"Tipo de Movimiento"}
							options={['Entrada (Aumentar Stock)', 'Salida (Reducir Stock)', 'Marcar como Dañado', 'Marcar como Reservado', 'Transferencia']}
							defaultValue={'Ajuste (Correccion)'}
						/>
						<Input
							label={"Cantidad"}
							placeholder={"0"}
							type={"number"}
							inputClass={"no icon"}
						/>
						<Input
							label={"Referencia (opcional)"}
							placeholder={"Ej: ORD-001, VEN-1234"}
							type={"text"}
							inputClass={"no icon"}
						/>
						<Input
							label={"Motivo"}
							placeholder={"Describe el motivo del ajuste..."}
							type={""}
							inputClass={"no icon"}
							isTextarea={true}
						/>
					</form>
				</ModalContainer>
			}
		</>
	)
}
