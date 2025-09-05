import { Button, InfoCard } from '@/components/atoms'
import React from 'react'
import { FiDollarSign } from "react-icons/fi";
import { BsCart2, BsBoxSeam, BsEye } from "react-icons/bs";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { CiWarning } from "react-icons/ci";
import { HiOutlineCalculator } from "react-icons/hi";


export default function Dashboard() {
	const ventasData = [
		{ day: 'Lun', amount: 3000 },
		{ day: 'Mar', amount: 2500 },
		{ day: 'Mie', amount: 4000 },
		{ day: 'Jue', amount: 3500 },
		{ day: 'Vie', amount: 5590 },
		{ day: 'Sab', amount: 4500 },
		{ day: 'Dom', amount: 6000 },
	];

	const masVendidos = [
		{ product: 'Producto A', amount: 1500, count: 80 },
		{ product: 'Producto B', amount: 1200, count: 40 },
		{ product: 'Producto C', amount: 1000, count: 70 },
		{ product: 'Producto D', amount: 800, count: 530 },
		{ product: 'Producto E', amount: 600, count: 350 },
	];

	const maxAmount = Math.max(...ventasData.map(data => data.amount));
	const masVendidosOrdered = masVendidos.sort((a, b) => b.count - a.count);

	return (
		<div className='w-full p-6 flex flex-col'>
			<section className='w-[50%] flex items-center justify-start gap-4 mb-6'>
				<Button
					className={"primary"}
					text={"Abrir punto de venta"}
					icon={<HiOutlineCalculator className='h-5 w-5' />}
				/>
				<Button
					className={"transparent"}
					text={"Ver Inventario"}
					icon={<BsBoxSeam className='h-4 w-4' />}
				/>
				<Button
					className={"transparent"}
					text={"Generar Reporte"}
					icon={<BsEye className='h-4 w-4' />}
				/>
			</section>
			<section className='w-full flex gap-4'>
				<InfoCard
					CardTitle={"Ventas Hoy"}
					cardValue={"$1,200.00"}
					cardIconColor={"success"}
					cardChange={12.5}
					cardIcon={<FiDollarSign className='h-6 w-6 text-success' />}
				/>
				<InfoCard
					CardTitle={"Productos Vendidos"}
					cardValue={"150"}
					cardIconColor={"primary"}
					cardChange={8.2}
					cardIcon={<BsCart2 className='h-6 w-6 text-primary' />}
				/>
				<InfoCard
					CardTitle={"Clientes atendidos"}
					cardValue={"75"}
					cardIconColor={"blue"}
					cardChange={-5}
					cardIcon={<HiOutlineUserGroup className='h-6 w-6 text-blue' />}
				/>
				<InfoCard
					CardTitle={"Productos en stock"}
					cardValue={"320"}
					cardIconColor={"yellow"}
					cardChange={4}
					outOfStockIcon={<CiWarning className='h-6 w-6 text-yellow' />}
					cardIcon={<BsBoxSeam className='h-6 w-6 text-yellow' />}
				/>
			</section>
			<section className='w-full mt-6 flex gap-4'>
				<div className='flex w-[60%] border border-dark/20 rounded-lg flex-col gap-4 p-4'>
					<div>
						<h2 className='text-2xl font-bold text-dark'>Ventas de la Semana</h2>
						<span className='text-medium text-dark/50'>Comparacion de ventas diarias</span>
					</div>
					{
						ventasData.map((data, index) => (
							<div key={index} className='w-full flex justify-center items-center gap-2'>
								<span className='w-12 text-dark/80'>{data.day}</span>
								<div className='bg-primary-light h-5 w-full rounded-full'>
									<div className='bg-primary h-5 rounded-full transition-all duration-700' style={{ width: `${(data.amount / maxAmount) * 100}%` }}></div>
								</div>
								<span className='font-bold'>C${data.amount}</span>
							</div>
						))
					}
				</div>
				<div className='flex w-[40%] border border-dark/20 rounded-lg flex-col gap-4 p-4'>
					<div>
						<h2 className='text-2xl font-bold text-dark'>Productos mas vendidos</h2>
						<span className='text-medium text-dark/50'>Top 5 productos de la semana</span>
					</div>
					{
						masVendidosOrdered.map((item, index) => (
							<div key={index} className='w-full flex gap-2 justify-center items-center'>
								<div className='text-primary bg-primary/10 w-10 h-10 text-center flex justify-center items-center rounded-lg font-semibold'>#{index + 1}</div>
								<div className='flex flex-col w-full'>
									<span className='font-semibold text-dark/80 text-lg'>{item.product}</span>
									<p className='text-dark/60 text-sm'>Vendidos: {item.count} - Total: C${item.amount}</p>
								</div>
							</div >
						))
					}
				</div>
			</section>
		</div>
	)
}
