import React from 'react'
import { Button, InfoCard } from '@/components/atoms'
import { FiDollarSign } from "react-icons/fi";
import { BsCart2, BsBoxSeam, BsEye } from "react-icons/bs";
import { HiArrowTrendingUp, HiOutlineUserGroup } from "react-icons/hi2";
import { CiWarning } from "react-icons/ci";
import { HiOutlineCalculator } from "react-icons/hi";
import { IoArrowForwardOutline } from "react-icons/io5";

export default function DashboardOrg() {
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

	const StockAlerts = [
		{ product: 'Producto X', stock: 5, maxStock: 10 },
		{ product: 'Producto Y', stock: 2, maxStock: 30 },
		{ product: 'Producto Z', stock: 0, maxStock: 20 },
		{ product: 'Producto A', stock: 8, maxStock: 50 },
	];

	const maxAmount = Math.max(...ventasData.map(data => data.amount));
	const masVendidosOrdered = masVendidos.sort((a, b) => b.count - a.count);

	return (
		<div className='w-full p-6 flex flex-col'>
			<section className='w-[60%] flex items-center justify-start gap-4 mb-6'>
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
			<section className='w-full mt-6 flex gap-4'>
				<div className='flex w-[50%] border border-dark/20 rounded-lg flex-col gap-4 p-4'>
					<div className='flex justify-between items-center'>
						<div>
							<div className='flex items-center gap-1'>
								<CiWarning className='h-9 w-9 text-yellow' />
								<h2 className='text-2xl font-bold text-dark'>Alertas de Stock</h2>
							</div>
							<span className='text-medium text-dark/50'>Productos que necesitan reabastecimiento</span>
						</div>
						<div>
							<Button
								className={"transparent"}
								text={"Ver todo"}
								iconRight={<IoArrowForwardOutline className='h-5 w-5' />}
							/>
						</div>
					</div>
					<div className='w-full flex flex-col gap-2 justify-center items-center text-dark/50'>
						{StockAlerts.length > 0 ? (
							StockAlerts.map((item, index) => (
								item.stock <= (item.maxStock * 0.3) && (
									<div key={index} className='w-full flex justify-center items-center border rounded-lg border-dark/20 p-2'>
										<div className='w-full flex flex-col'>
											<h2 className='text-dark text-lg font-semibold mb-2'>{item.product}</h2>
											<div className='w-full flex'>
												<div className='w-full bg-secondary rounded-full h-2'>
													<div className='bg-dark h-2 rounded-full' style={{ width: `${(item.stock / item.maxStock) * 100}%` }}></div>
												</div>
												<p className='text-dark/70 text-sm'>{item.stock}/{item.maxStock}</p>
											</div>
										</div>
										<span className='bg-secondary text-light p-4 text-center text-sm rounded-full flex justify-center items-center h-5'>
											{
												item.stock === 0
													? "Agotado"
													: item.stock <= (item.maxStock * 0.3)
													&& "bajo"
											}
										</span>
									</div>
								)

							))
						) :
							<p>No hay alertas de stock</p>
						}
					</div>
				</div>
				<div className='flex w-[50%] border border-dark/20 rounded-lg flex-col gap-4 p-4'>
					<div>
						<h2 className='text-2xl font-bold text-dark'>Actividad Reciente</h2>
						<span className='text-medium text-dark/50'>Ultimas acciones realizadas en el sistema</span>
					</div>
					<div className='w-full h-48 flex justify-center items-center text-dark/50'>
						<p>No hay actividad reciente</p>
					</div>
				</div>
			</section>
			<section className='w-full mt-6 flex border border-dark/20 rounded-lg flex-col p-4'>
				<h2 className='text-dark text-xl font-bold'>Resumen del Mes</h2>
				<span className='text-dark/50 text-medium'>Septiembre 2025</span>
				<div className='w-full flex justify-around items-center mt-4'>
					<div className='text-center flex flex-col justify-center items-center'>
						<h2 className='text-xl font-bold text-success'>C$43000</h2>
						<span className='text-medium text-dark/50'>Ingresos Totales</span>
						<span className='text-success flex items-center gap-1'>
							<HiArrowTrendingUp className='text-success' /> +15.6%
						</span>
					</div>
					<div className='text-center flex flex-col justify-center items-center'>
						<h2 className='text-xl font-bold text-primary'>3000</h2>
						<span className='text-medium text-dark/50'>Productos Vendidos</span>
						<span className='text-success flex items-center gap-1'>
							<HiArrowTrendingUp className='text-success' /> +5.6%
						</span>
					</div>
					<div className='text-center flex flex-col justify-center items-center'>
						<h2 className='text-xl font-bold text-blue'>300</h2>
						<span className='text-medium text-dark/50'>Clientes Unicos</span>
						<span className='text-success flex items-center gap-1'>
							<HiArrowTrendingUp className='text-success' /> +1%
						</span>
					</div>
					<div className='text-center flex flex-col justify-center items-center'>
						<h2 className='text-xl font-bold text-purple-500'>100%</h2>
						<span className='text-medium text-dark/50'>Satisfaccion</span>
						<span className='text-success flex items-center gap-1'>
							<HiArrowTrendingUp className='text-success' /> +6%
						</span>
					</div>
				</div>
			</section>
		</div>
	)
}
