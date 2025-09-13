"use client"
import React from 'react'
import { Button, InfoCard } from '@/components/atoms'
import { FiAlertTriangle, FiBox, FiPlus, FiSearch, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { BsBoxSeam, BsFillBoxFill } from 'react-icons/bs'
import { DropdownMenu, Input } from '../molecules'

export default function ProductsOrg() {
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
			</section>
		</div>
	)
}
