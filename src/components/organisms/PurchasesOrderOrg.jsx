'use client'
import React, { useState } from 'react'
import { FiCheckCircle, FiClock, FiDollarSign, FiEye, FiPlus, FiSearch, FiShoppingBag, FiShoppingCart } from 'react-icons/fi';
import { Button, InfoCard } from '../atoms';
import { Card, DropdownMenu, Input } from '../molecules';
import { useIsMobile } from '@/hooks';
import { useRouter } from 'next/navigation';

export default function PurchasesOrderOrg() {
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const router = useRouter();

	const ordenesEjemplo = [
		{
			id: "ORD-001",
			proveedor: {
				nombre: "Ferretería Central",
				telefono: "555-1234"
			},
			fechas: {
				creacion: "2024-01-25",
				esperada: "2024-02-01",
				recepcion: "2025-10-31"
			},
			estado: "Recibida",
			productos: [
				{
					codigo: "HER001",
					producto: "Martillo de Carpintero 16oz",
					cantidad: 50,
					precioUnitario: 35.00,
					subtotal: 1750.00,
					estado: "Pendiente"
				},
				{
					codigo: "HER002",
					producto: "Destornillador Phillips #2",
					cantidad: 100,
					precioUnitario: 8.50,
					subtotal: 850.00,
					estado: "Pendiente"
				},
				{
					codigo: "PIN001",
					producto: "Pintura Vinílica Blanca 4L",
					cantidad: 30,
					precioUnitario: 95.00,
					subtotal: 2850.00,
					estado: "Pendiente"
				}
			],
			notas: "Pedido urgente para reabastecimiento",
			total: 3900.00
		},
		{
			id: "ORD-001",
			proveedor: {
				nombre: "Ferretería Central",
				telefono: "555-1234"
			},
			fechas: {
				creacion: "2024-01-25",
				esperada: "2024-02-01",
				recepcion: "2025-10-31"
			},
			estado: "Recibida",
			productos: [
				{
					codigo: "HER001",
					producto: "Martillo de Carpintero 16oz",
					cantidad: 50,
					precioUnitario: 35.00,
					subtotal: 1750.00,
					estado: "Pendiente"
				},
				{
					codigo: "HER002",
					producto: "Destornillador Phillips #2",
					cantidad: 100,
					precioUnitario: 8.50,
					subtotal: 850.00,
					estado: "Pendiente"
				},
				{
					codigo: "PIN001",
					producto: "Pintura Vinílica Blanca 4L",
					cantidad: 30,
					precioUnitario: 95.00,
					subtotal: 2850.00,
					estado: "Pendiente"
				}
			],
			notas: "Pedido urgente para reabastecimiento",
			total: 3900.00
		}
	];


	const cardConfig = [
		{ key: 0, title: 'Total', color: 'primary', icon: FiShoppingCart },
		{ key: 0, title: 'Pendientes', color: 'yellow', icon: FiClock },
		{ key: 0, title: 'Recibidas', color: 'success', icon: FiCheckCircle },
		{ key: 0, title: 'Valor Total', color: 'success', icon: FiDollarSign },
	]



	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
				<section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
					{
						cardConfig.map((cfg, index) => (
							<InfoCard
								CardTitle={cfg.title}
								cardValue={cfg.key}
								cardIcon={<cfg.icon className={`h-4 w-4 md:h-6 md:w-6 text-${cfg.color}`} />}
								cardIconColor={cfg.color}
								key={index}
							/>
						))
					}
				</section>
				<section className='p-6 border border-dark/20 rounded-lg flex flex-col gap-4'>
					<div className='flex flex-col md:flex-row justify-between'>
						<div>
							<h2 className='md:text-2xl font-semibold'>
								Gestion de Cotizaciones
							</h2>
							<span className='text-sm md:text-medium text-dark/50'>
								Administra cotizaciones para clientes.
							</span>
						</div>
						<div>
							<Button
								text={'Nueva Orden'}
								className={'primary'}
								icon={<FiPlus />}
								func={() => router.push('/compras/nueva-compra')}
							/>
						</div>
					</div>
					<div className='flex gap-2 w-full flex-col'>
						<div className='w-[100%]'>
							<Input
								type={'search'}
								placeholder={'Buscar cotizaciones...'}
								iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
							/>
						</div>
						<div className='flex gap-2 w-full flex-col md:flex-row md:w-1/2'>
							<Input
								type={'date'}
								inputClass={'no icon'}
							/>
							<DropdownMenu
								options={['Todas', 'Pendiente', 'Procesado',]}
								defaultValue={'Todas'}
							/>
						</div>
					</div>
					<div>
						{!isMobile ? (
							<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
								<table className='w-full border-collapse'>
									<thead className=' w-full border-b border-dark/20'>
										<tr className='w-full'>
											<th className='text-start text-dark/50 font-semibold p-2'>ID</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Fecha</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Proveedor</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Productos</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Total</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Fecha Esperada</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{ordenesEjemplo.map((item, index) => (
											<tr key={index} className={`text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3`}>
												<td className='p-2 font-normal'>
													{item.id}
												</td>
												<td className='p-2 font-normal'>
													{item.fechas.creacion}
												</td>
												<td className='p-2 flex flex-col'>
													<span>{item.proveedor.nombre}</span>
													<span className='text-sm text-dark/60'>{item.proveedor.telefono}</span>
												</td>
												<td className='p-2 text-center'>
													{item.productos.length}
												</td>
												<td className='p-2 text-primary'>
													C$ {item.total}
												</td>
												<td className='p-2 font-normal'>{item.fechas.esperada}</td>
												<td className='p-2'>
													<span className={`${item.estado === 'Recibida' ? 'bg-success' : 'bg-yellow'} text-light rounded-full px-2 text-sm`}>
														{item.estado.charAt(0).toUpperCase() + item.estado.slice(1).toLowerCase()}
													</span>
												</td>
												<td className='p-2 flex justify-center items-center'>
													<div className='flex gap-2 justify-center w-1/2'>
														<Button className={'primary'} icon={<FiEye />} /* func={() => toggleModalMode('ver', item)} */ />
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='flex flex-col gap-4'>
								{ordenesEjemplo.map((item, index) => (
									<div key={index} className={``}>
										<Card
											productName={item.proveedor.nombre || 'Consumidor Final'}
											status={item.estado}
											id={item.proveedor.telefono}
										>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>ID</span>
												<span className='text-lg font-semibold'>{item.id}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Productos</span>
												<span className='text-lg font-semibold'>{item.productos.length}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Total</span>
												<div className='text-lg font-semibold'>{item.total ? `C$${Number(item.total).toLocaleString()}` : (item.total_venta ? `C$${Number(item.total_venta).toLocaleString()}` : '-')}</div>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Fecha</span>
												<span className='text-lg font-semibold'>{item.fechas.creacion}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Fecha Esperada</span>
												<span className='text-lg font-semibold'>{item.fechas.esperada}</span>
											</div>
											<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
												<Button className={"primary"} text={"Ver"} icon={<FiEye />} />
											</div>
										</Card>
									</div>
								))}
							</div>
						)
						}
					</div>
				</section>
			</div>
		</>
	)
}
