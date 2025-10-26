"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, InfoCard } from '@/components/atoms'
import { FiDollarSign } from "react-icons/fi";
import { BsCart2, BsBoxSeam, BsEye } from "react-icons/bs";
import { HiArrowTrendingUp, HiOutlineUserGroup } from "react-icons/hi2";
import { CiWarning } from "react-icons/ci";
import { HiOutlineCalculator } from "react-icons/hi";
import { IoArrowForwardOutline } from "react-icons/io5";
import { DashboardService } from '@/services'

export default function DashboardOrg() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [dash, setDash] = useState(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			const res = await DashboardService.getOverview();
			if (!mounted) return;
			if (!res.success) {
				setError(res.message || 'No se pudo cargar el dashboard');
			} else {
				setDash(res.data);
			}
			setLoading(false);
		})();
		return () => { mounted = false };
	}, []);

	const ventasData = useMemo(() => dash?.weeklySales || [], [dash]);
	const maxAmount = useMemo(() => Math.max(1, ...ventasData.map(d => d.amount || 0)), [ventasData]);
	const masVendidosOrdered = useMemo(() => (dash?.topProducts || []).slice().sort((a,b)=> (b.count||0)-(a.count||0)), [dash]);
	const StockAlerts = useMemo(() => dash?.lowStockProducts || [], [dash]);

	const fmtC = (n) => `C$${Number(n||0).toLocaleString('es-NI', { maximumFractionDigits: 2 })}`;
	const monthLabel = useMemo(() => {
		const now = new Date();
		return now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
	}, []);

	if (loading) return <div className='w-full p-6'>Cargando dashboard…</div>;
	if (error) return <div className='w-full p-6 text-red-600'>Error: {error}</div>;

	return (
		<div className='w-full p-6 flex flex-col'>
			<section className='w-full grid grid-cols-1 xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 gap-4 mb-6'>
				<Button
					className={"primary"}
					text={"Abrir punto de venta"}
					icon={<HiOutlineCalculator className='h-5 w-5' />}
					func={() => router.push('/venta/punto-venta')}
				/>
				<Button
					className={"transparent"}
					text={"Ver Inventario"}
					icon={<BsBoxSeam className='h-4 w-4' />}
					func={() => router.push('/inventario/control-stock')}
				/>
				<Button
					className={"transparent"}
					text={"Generar Reporte"}
					icon={<BsEye className='h-4 w-4' />}
				/>
			</section>
			<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
				<InfoCard
					CardTitle={"Ventas Hoy"}
					cardValue={fmtC(dash?.totalRevenueToday)}
					cardIconColor={"success"}
					cardChange={12.5}
					cardIcon={<FiDollarSign className='h-4 w-4 md:h-6 md:w-6 text-success' />}
				/>
				<InfoCard
					CardTitle={"Productos Vendidos"}
					cardValue={`${dash?.productsSoldToday ?? 0}`}
					cardIconColor={"primary"}
					cardChange={8.2}
					cardIcon={<BsCart2 className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
				/>
				<InfoCard
					CardTitle={"Clientes atendidos"}
					cardValue={`${dash?.clientsToday ?? 0}`}
					cardIconColor={"blue"}
					cardChange={-5}
					cardIcon={<HiOutlineUserGroup className='h-4 w-4 md:h-6 md:w-6 text-blue' />}
				/>
				<InfoCard
					CardTitle={"Productos en stock"}
					cardValue={`${dash?.stockTotal ?? 0}`}
					cardIconColor={"yellow"}
					cardChange={4}
					outOfStockIcon={<CiWarning className='h-4 w-4 md:h-6 md:w-6 text-yellow' />}
					cardIcon={<BsBoxSeam className='h-4 w-4 md:h-6 md:w-6 text-yellow' />}
				/>
			</section>
			<section className='w-full mt-6 flex flex-col gap-4 lg:flex-row'>
				<div className='flex w-full lg:w-[60%] border border-dark/20 rounded-lg flex-col gap-1 md:gap-4 p-4'>
					<div>
						<h2 className='md:text-2xl font-bold text-dark'>Ventas de la Semana</h2>
						<span className='text-sm md:text-medium text-dark/50'>Comparacion de ventas diarias</span>
					</div>
					{ventasData.map((data, index) => (
						<div key={index} className='w-full flex text-sm md:text-medium justify-center items-center gap-2'>
							<span className='w-12 text-dark/80'>{data.day}</span>
							<div className='bg-primary-light h-3 md:h-5 w-full rounded-full'>
								<div className='bg-primary h-3 md:h-5 rounded-full transition-all duration-700' style={{ width: `${((data.amount || 0) / maxAmount) * 100}%` }}></div>
							</div>
							<span className='text-xs md:text-medium font-bold'>{fmtC(data.amount)}</span>
						</div>
					))}
				</div>
				<div className='flex w-full lg:w-[40%] border border-dark/20 rounded-lg flex-col gap-4 p-4'>
					<div>
						<h2 className='md:text-2xl font-bold text-dark'>Productos mas vendidos</h2>
						<span className='text-sm md:text-medium text-dark/50'>Top 5 productos de la semana</span>
					</div>
					{masVendidosOrdered.map((item, index) => (
						<div key={index} className='w-full flex gap-2 justify-center items-center'>
							<div className='text-primary bg-primary/10 w-8 h-8 md:w-10 md:h-10 text-center flex justify-center items-center rounded-lg font-semibold'>#{index + 1}</div>
							<div className='flex flex-col w-full'>
								<span className='font-semibold text-dark/80 text-sm md:text-lg'>{item.product}</span>
								<p className='text-dark/60 text-xs md:text-sm'>Vendidos: {item.count} - Total: {fmtC(item.amount)}</p>
							</div>
						</div >
					))}
				</div>
			</section>
			<section className='w-full mt-6 flex flex-col lg:flex-row gap-4'>
				<div className='flex w-full lg:w-[50%] border border-dark/20 rounded-lg flex-col gap-4 p-4'>
					<div className='flex flex-col md:flex-row md:justify-between md:items-center'>
						<div>
							<div className='flex items-center gap-1'>
								<CiWarning className='h-6 w-6 md:h-9 md:w-9 text-yellow' />
								<h2 className='md:text-2xl font-bold text-dark'>Alertas de Stock</h2>
							</div>
							<span className='text-sm md:text-medium text-dark/50'>Productos que necesitan reabastecimiento</span>
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
						{StockAlerts && StockAlerts.length > 0 ? (
							StockAlerts.map((item, index) => {
								const max = Number(item.maxStock || item.max || 0) || 1;
								const val = Math.min(100, Math.max(0, (Number(item.stock || 0) / max) * 100));
								const status = item.status || (item.stock === 0 ? 'agotado' : (Number(item.stock||0) <= max * 0.3 ? 'bajo' : ''));
								return (
									<div key={index} className='w-full flex justify-center items-center border rounded-lg border-dark/20 p-2'>
										<div className='w-full flex flex-col'>
											<h2 className='text-dark text-sm md:text-lg font-semibold mb-2'>{item.product}</h2>
											<div className='w-full flex'>
												<div className='w-full bg-secondary rounded-full h-2'>
													<div className='bg-dark h-2 rounded-full' style={{ width: `${val}%` }}></div>
												</div>
												<p className='text-dark/70 text-xs md:text-sm'>{item.stock}/{max}</p>
											</div>
										</div>
										<span className='bg-secondary text-light p-2 md:p-4 text-center text-xs md:text-sm rounded-full flex justify-center items-center h-5'>
											{status === 'agotado' ? 'Agotado' : status === 'bajo' ? 'Bajo' : status}
										</span>
									</div>
								);
							})
						) : (
							<p>No hay alertas de stock</p>
						)}
					</div>
				</div>
				<div className='flex w-full lg:w-[50%] border border-dark/20 rounded-lg flex-col gap-4 p-4'>
					<div>
						<h2 className='md:text-2xl font-bold text-dark'>Actividad Reciente</h2>
						<span className='text-sm md:text-medium text-dark/50'>Ultimas acciones realizadas en el sistema</span>
					</div>
					<div className='w-full flex flex-col gap-2 text-dark/80'>
						{(dash?.recentMovements || []).length === 0 ? (
							<div className='w-full h-48 flex justify-center items-center text-dark/50'>
								<p>No hay actividad reciente</p>
							</div>
						) : (
							dash.recentMovements.map((m) => (
								<div key={m.id} className='w-full flex justify-between items-center border border-dark/10 rounded-md p-2 text-sm'>
									<div className='flex flex-col'>
										<span className='font-semibold'>{m.producto}</span>
										<span className='text-dark/60'>{m.tipo} · {m.sucursal}</span>
									</div>
									<div className='text-right'>
										<div>{m.fecha} {m.hora}</div>
										<div className='text-dark/60'>Cant: {m.cantidad}</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</section>
			<section className='w-full mt-6 flex border border-dark/20 rounded-lg flex-col p-4'>
				<h2 className='text-dark md:text-xl font-bold'>Resumen del Mes</h2>
				<span className='text-dark/50 text-sm md:text-medium'>{monthLabel}</span>
				<div className='w-full grid grid-cols-2 gap-4 md:grid-cols-2 lg:gap-0 lg:grid-cols-4 justify-around items-center mt-4'>
					<div className='text-center flex flex-col justify-center items-center'>
						<h2 className='md:text-xl font-bold text-success'>{fmtC(dash?.totalRevenueMonth)}</h2>
						<span className='text-sm md:text-medium text-dark/50'>Ingresos Totales</span>
						<span className='text-success text-sm md:text-medium flex items-center gap-1'>
							<HiArrowTrendingUp className='text-success' /> +15.6%
						</span>
					</div>
					<div className='text-center flex flex-col justify-center items-center'>
						<h2 className='md:text-xl font-bold text-primary'>{dash?.productsSoldMonth ?? 0}</h2>
						<span className='text-sm md:text-medium text-dark/50'>Productos Vendidos</span>
						<span className='text-success text-sm md:text-medium flex items-center gap-1'>
							<HiArrowTrendingUp className='text-success' /> +5.6%
						</span>
					</div>
					<div className='text-center flex flex-col justify-center items-center'>
						<h2 className='md:text-xl font-bold text-blue'>{dash?.clientsThisMonth ?? 0}</h2>
						<span className='text-sm md:text-medium text-dark/50'>Clientes Unicos</span>
						<span className='text-success text-sm md:text-medium flex items-center gap-1'>
							<HiArrowTrendingUp className='text-success' /> +1%
						</span>
					</div>
					<div className='text-center flex flex-col justify-center items-center'>
						<h2 className='md:text-xl font-bold text-purple-500'>100%</h2>
						<span className='text-sm md:text-medium text-dark/50'>Satisfaccion</span>
						<span className='text-success text-sm md:text-medium flex items-center gap-1'>
							<HiArrowTrendingUp className='text-success' /> +6%
						</span>
					</div>
				</div>
			</section>
		</div>
	)
}
