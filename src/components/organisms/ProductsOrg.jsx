"use client"
import React from 'react'
import { Button, InfoCard } from '@/components/atoms'
import { FiAlertTriangle, FiBox, FiDelete, FiEdit, FiPlus, FiSearch, FiTrash, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { BsBoxSeam, BsFillBoxFill } from 'react-icons/bs'
import { DropdownMenu, Input } from '../molecules'

export default function ProductsOrg() {
	const tools = [
		{ id: "H12345", name: 'Martillo de acero ultramega fuerte oh yeah!', category: 'Tools', stock: 50, purchasePrice: 10, salePrice: 15, status: 'In Stock' },
		{ id: "H12345", name: 'Screwdriver', category: 'Tools', stock: 30, purchasePrice: 5, salePrice: 8, status: 'In Stock' },
		{ id: "H12345", name: 'Wrench', category: 'Tools', stock: 20, purchasePrice: 8, salePrice: 12, status: 'Low Stock' },
		{ id: "H12345", name: 'Pliers', category: 'Tools', stock: 0, purchasePrice: 7, salePrice: 10, status: 'Out of Stock' },
		{ id: "H12345", name: 'Drill', category: 'Power Tools', stock: 15, purchasePrice: 50, salePrice: 70, status: 'In Stock' },
		{ id: "H12345", name: 'Circular Saw', category: 'Power Tools', stock: 5, purchasePrice: 80, salePrice: 100, status: 'Low Stock' },
		{ id: "H12345", name: 'Jigsaw', category: 'Power Tools', stock: 0, purchasePrice: 60, salePrice: 80, status: 'Out of Stock' },
		{ id: "H12345", name: 'Tape Measure', category: 'Tools', stock: 100, purchasePrice: 3, salePrice: 5, status: 'In Stock' },
		{ id: "H12345", name: 'Level', category: 'Tools', stock: 40, purchasePrice: 12, salePrice: 18, status: 'In Stock' },
		{ id: "H12345", name: 'Chisel', category: 'Tools', stock: 25, purchasePrice: 6, salePrice: 9, status: 'In Stock' },
	]
	
	return (
		<div className='w-full p-6 flex flex-col'>
			<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
				<InfoCard
					CardTitle={"Total Productos"}
					cardValue={"1,250"}
					cardIconColor={"primary"}
					cardIcon={<BsBoxSeam className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
				/>
				<InfoCard
					CardTitle={"Stock Bajo"}
					cardValue={"15"}
					cardIconColor={"yellow"}
					cardIcon={<FiAlertTriangle className='h-4 w-4 md:h-6 md:w-6 text-yellow' />}
				/>
				<InfoCard
					CardTitle={"Productos Agotados"}
					cardValue={"3"}
					cardIconColor={"secondary"}
					cardIcon={<FiTrendingDown className='h-4 w-4 md:h-6 md:w-6 text-secondary' />}
				/>
				<InfoCard
					CardTitle={"valor total de inventario"}
					cardValue={"$75,000"}
					cardIconColor={"success"}
					cardIcon={<FiTrendingUp className='h-4 w-4 md:h-6 md:w-6 text-success' />}
				/>
			</section>
			<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
				<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
					<div className='flex flex-col'>
						<h2 className='md:text-2xl font-semibold'>Lista de productos</h2>
						<span className='text-sm md:text-medium text-dark/50'>Gestiona y administra tu inventario</span>
					</div>
					<div className='flex xl:w-[20%] lg:w-[30%] md:w-[40%] sm:w-[50%] w-full md:justify-end'>
						<Button
							className={"primary"}
							text={"Agregar Producto"}
							icon={<FiPlus className='h-4 w-4' />}
						/>
					</div>
				</div>
				<div className='w-full flex flex-col gap-1'>
					<Input
						placeholder={"Buscar producto..."}
						type={"search"}
						iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
					/>
					<div className='md:w-1/2 w-full flex gap-2 flex-col md:flex-row'>
						<DropdownMenu
							options={['Todas las categorias', 'Herramientas', 'Materiales', 'Electricos', 'Plomeria',]}
							defaultValue={'Todas las categorias'}
							onChange={(value) => console.log(value)}
						/>
						<DropdownMenu
							options={['Todos los estados', 'En stock', 'Agotados', 'Bajo stock']}
							defaultValue={'Todos los estados'}
							onChange={(value) => console.log(value)}
						/>
					</div>
				</div>
				<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
					<table className='w-full border-collapse'>
						<thead className=' w-full border-b border-dark/20'>
							<tr className='w-full'>
								<th className='text-start text-dark/50 font-semibold p-2'>Codigo</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Producto</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Categoria</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Stock</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Precio Compra</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Precio Venta</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
								<th className='text-start text-dark/50 font-semibold p-2'>Acciones</th>
							</tr>
						</thead>
						<tbody className='w-full'>
							{tools.map((item, index) => (
								<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
									<td className='p-2'>{item.id}</td>
									<td className='p-2 max-w-[180px] truncate'>{item.name}</td>
									<td className='p-2'>
										<span className='flex items-center justify-center border border-dark/20 p-1 rounded-full text-xs font-medium'>
											{item.category}
										</span>
									</td>
									<td className='p-2'>{item.stock}</td>
									<td className='p-2'>C${item.purchasePrice}</td>
									<td className='p-2'>C${item.salePrice}</td>
									<td className='p-2'>
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock % 3 === 0 ? 'bg-secondary' : item.stock % 3 === 1 ? 'bg-success' : 'bg-yellow'} text-light`}
										>
											{item.stock % 3 === 0 ? 'Agotado' : item.stock % 3 === 1 ? 'Disponible' : 'Stock Bajo'}
										</span>
									</td>
									<td className='p-2'>
										<div className='flex gap-2'>
											<Button
												className={"none"}
												icon={<FiEdit className='h-4 w-4' />}
											/>
											<Button
												className={"none"}
												icon={<FiTrash className='h-4 w-4' />}
											/>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}
