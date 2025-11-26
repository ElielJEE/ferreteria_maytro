"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, InfoCard, Loading, ModalContainer } from '@/components/atoms'
import { FiDollarSign } from "react-icons/fi";
import { BsCart2, BsBoxSeam, BsEye } from "react-icons/bs";
import { HiArrowTrendingUp, HiOutlineUserGroup } from "react-icons/hi2";
import { CiWarning } from "react-icons/ci";
import { HiOutlineCalculator } from "react-icons/hi";
import { IoArrowForwardOutline } from "react-icons/io5";
import { DashboardService, ReporteService } from '@/services';
import { useActive } from '@/hooks';
import { Input } from '../molecules';
import { jsPDF } from "jspdf";

export default function DashboardOrg() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [dash, setDash] = useState(null);
	const [generatingPdf, setGeneratingPdf] = useState(false);
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
	const { isActiveModal, setIsActiveModal } = useActive();
	const [mode, setMode] = useState('choose');

	const ventasData = useMemo(() => dash?.weeklySales || [], [dash]);
	const maxAmount = useMemo(() => Math.max(1, ...ventasData.map(d => d.amount || 0)), [ventasData]);
	const masVendidosOrdered = useMemo(() => (dash?.topProducts || []).slice().sort((a, b) => (b.count || 0) - (a.count || 0)), [dash]);
	const StockAlerts = useMemo(() => dash?.lowStockProducts || [], [dash]);

	const fmtC = (n) => `C$${Number(n || 0).toLocaleString('es-NI', { maximumFractionDigits: 2 })}`;
	const monthLabel = useMemo(() => {
		const now = new Date();
		return now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
	}, []);

	const handleGenerateReport = async (type) => {
		setMode(type);
		if (type === 'today') {
			setIsActiveModal(true);
			const res = await ReporteService.getTodayReport();
			generateTodayReportPDF(res);

		} else if (type === 'month') {
			setIsActiveModal(true);
			const res = await ReporteService.getMonthReport();
			generateMonthReportPDF(res);
			console.log(res);

		} else if (type === 'custom') {
			setIsActiveModal(true);

		} else if (type === 'year') {
			setIsActiveModal(true);
			const res = await ReporteService.getYearReport();
			generateYearReportPDF(res);

		} else if (type === 'choose') {
			setIsActiveModal(true);
		}

		/* if (generatingPdf) return;
		if (!dash) return alert('Datos del dashboard no están cargados');
		setGeneratingPdf(true);
		try {
			// Try to import jspdf dynamically
			let jsPDFModule;
			try {
				jsPDFModule = await import('jspdf');
			} catch (impErr) {
				// If jspdf is not installed, offer fallback (download JSON)
				console.warn('jspdf import failed:', impErr);
				if (confirm('La librería `jspdf` no está instalada. ¿Deseas descargar los datos del dashboard en JSON como alternativa?')) {
					const blob = new Blob([JSON.stringify(dash, null, 2)], { type: 'application/json' });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.json`;
					a.click();
					URL.revokeObjectURL(url);
				}
				return;
			}
			const { jsPDF } = jsPDFModule;
			const doc = new jsPDF({ unit: 'pt', format: 'a4' });
			const margin = 40;
			let y = margin;
			doc.setFontSize(16);
			doc.text('Reporte - Dashboard', margin, y);
			y += 20;
			doc.setFontSize(10);
			doc.text(`Fecha: ${new Date().toLocaleString()}`, margin, y);
			y += 18;
			// Key metrics (overview)
			doc.setFontSize(12);
			doc.text('Resumen rápido', margin, y);
			y += 14;
			doc.setFontSize(10);
			doc.text(`Total ingresos hoy: ${fmtC(dash?.totalRevenueToday)}`, margin, y); y += 12;
			doc.text(`Total ventas hoy: ${dash?.totalSalesToday ?? 0}`, margin, y); y += 12;
			doc.text(`Productos vendidos hoy: ${dash?.productsSoldToday ?? 0}`, margin, y); y += 12;
			doc.text(`Clientes hoy: ${dash?.clientsToday ?? 0}`, margin, y); y += 16;
			// Monthly summary
			doc.setFontSize(12);
			doc.text('Resumen mensual', margin, y); y += 14;
			doc.setFontSize(10);
			doc.text(`Ingresos mes: ${fmtC(dash?.totalRevenueMonth)}`, margin, y); y += 12;
			doc.text(`Facturas mes: ${dash?.invoicesThisMonth ?? 0}`, margin, y); y += 12;
			doc.text(`Productos vendidos mes: ${dash?.productsSoldMonth ?? 0}`, margin, y); y += 12;
			doc.text(`Clientes unicos mes: ${dash?.clientsThisMonth ?? 0}`, margin, y); y += 16;
			// Weekly sales table
			doc.setFontSize(12);
			doc.text('Ventas de la semana', margin, y); y += 14;
			doc.setFontSize(10);
			if (Array.isArray(dash?.weeklySales) && dash.weeklySales.length) {
				doc.text('Día', margin, y); doc.text('Monto', margin + 200, y); y += 12;
				for (const s of dash.weeklySales) {
					if (y > 750) { doc.addPage(); y = margin; }
					doc.text(String(s.day || ''), margin, y);
					doc.text(fmtC(s.amount ?? 0), margin + 200, y);
					y += 12;
				}
			} else { doc.text('Sin datos de ventas semanales', margin, y); y += 12; }
			y += 8;
			// Top products table
			doc.setFontSize(12);
			doc.text('Productos más vendidos', margin, y); y += 14;
			doc.setFontSize(10);
			if (Array.isArray(dash?.topProducts) && dash.topProducts.length) {
				doc.text('ID', margin, y); doc.text('Producto', margin + 40, y); doc.text('Vendidos', margin + 260, y); doc.text('Total', margin + 340, y); y += 12;
				for (const p of dash.topProducts) {
					if (y > 750) { doc.addPage(); y = margin; }
					doc.text(String(p.id ?? ''), margin, y);
					doc.text(String(p.product || ''), margin + 40, y);
					doc.text(String(p.count ?? 0), margin + 260, y);
					doc.text(fmtC(p.amount ?? 0), margin + 340, y);
					y += 12;
				}
			} else { doc.text('Sin datos de productos', margin, y); y += 12; }
			y += 8;
			// Low stock
			doc.setFontSize(12);
			doc.text('Alertas de stock', margin, y); y += 14;
			doc.setFontSize(10);
			if (Array.isArray(dash?.lowStockProducts) && dash.lowStockProducts.length) {
				for (const it of dash.lowStockProducts) {
					if (y > 750) { doc.addPage(); y = margin; }
					doc.text(`${it.product || ''} — stock: ${it.stock ?? 0} / max: ${it.max || it.maxStock || ''}`, margin, y);
					y += 12;
				}
			} else { doc.text('No hay alertas de stock', margin, y); y += 12; }
			y += 8;
			// Recent sales
			doc.setFontSize(12);
			doc.text('Ventas', margin, y); y += 14;
			doc.setFontSize(10);
			if (Array.isArray(dash?.recentSales) && dash.recentSales.length) {
				doc.text('ID', margin, y); doc.text('Fecha', margin + 40, y); doc.text('Hora', margin + 120, y); doc.text('Total', margin + 160, y); doc.text('Cliente', margin + 230, y); doc.text('Sucursal', margin + 420, y); y += 12;
				for (const s of dash.recentSales) {
					if (y > 750) { doc.addPage(); y = margin; }
					doc.text(String(s.id ?? ''), margin, y);
					doc.text(String(s.fecha || ''), margin + 40, y);
					doc.text(String(s.hora || ''), margin + 120, y);
					doc.text(fmtC(s.total ?? 0), margin + 160, y);
					doc.text(String(s.cliente || ''), margin + 230, y);
					doc.text(String(s.sucursal || ''), margin + 420, y);
					y += 12;
				}
			} else { doc.text('Sin ventas recientes', margin, y); y += 12; }
			y += 8;
			// Recent movements
			doc.setFontSize(12);
			doc.text('Movimientos recientes', margin, y); y += 14;
			doc.setFontSize(10);
			if (Array.isArray(dash?.recentMovements) && dash.recentMovements.length) {
				for (const m of dash.recentMovements) {
					if (y > 750) { doc.addPage(); y = margin; }
					doc.text(`${m.fecha || ''} ${m.hora || ''} — ${m.producto || ''} (${m.tipo || ''}) ${m.sucursal || ''} x${m.cantidad ?? ''}`, margin, y);
					y += 12;
				}
			} else { doc.text('Sin movimientos recientes', margin, y); y += 12; }
			y += 8;
			// Stock total
			doc.setFontSize(12);
			doc.text(`Stock total: ${dash?.stockTotal ?? 0}`, margin, y); y += 12;
			// Save PDF
			const filename = `dashboard-${new Date().toISOString().slice(0, 10)}.pdf`;
			doc.save(filename);
		} catch (err) {
			console.error('Error generando PDF desde dash:', err);
			alert('Error generando PDF. Abre la consola para más detalles o instala `jspdf` con `npm i jspdf`.');
		} finally {
			setGeneratingPdf(false);
		} */
	}

	const generateTodayReportPDF = (dash) => {
		const doc = new jsPDF({ unit: "pt", format: "a4" });
		const margin = 40;
		let y = margin;

		const fmtC = (v) => `$${Number(v || 0).toFixed(2)}`;

		// Título
		doc.setFontSize(16);
		doc.text("Reporte Diario", margin, y);
		y += 20;

		doc.setFontSize(10);
		doc.text(`Fecha: ${new Date().toLocaleString()}`, margin, y);
		y += 18;

		// Resumen rápido
		doc.setFontSize(12);
		doc.text("Resumen rápido", margin, y);
		y += 14;
		doc.setFontSize(10);
		doc.text(`Total ingresos hoy: ${fmtC(dash.totalRevenueToday)}`, margin, y); y += 12;
		doc.text(`Total ventas hoy: ${dash.totalSalesToday}`, margin, y); y += 12;
		doc.text(`Productos vendidos hoy: ${dash.productsSoldToday}`, margin, y); y += 12;
		doc.text(`Clientes hoy: ${dash.clientsToday}`, margin, y); y += 16;

		// Ventas recientes
		doc.setFontSize(12);
		doc.text("Ventas recientes", margin, y);
		y += 14;
		doc.setFontSize(10);
		if (Array.isArray(dash.recentSales) && dash.recentSales.length) {
			doc.text("ID", margin, y);
			doc.text("Fecha", margin + 40, y);
			doc.text("Hora", margin + 120, y);
			doc.text("Total", margin + 160, y);
			doc.text("Cliente", margin + 230, y);
			doc.text("Sucursal", margin + 420, y);
			y += 12;

			for (const s of dash.recentSales) {
				if (y > 750) { doc.addPage(); y = margin; }
				doc.text(String(s.id), margin, y);
				doc.text(String(s.fecha), margin + 40, y);
				doc.text(String(s.hora), margin + 120, y);
				doc.text(fmtC(s.total), margin + 160, y);
				doc.text(String(s.cliente), margin + 230, y);
				doc.text(String(s.sucursal), margin + 420, y);
				y += 12;
			}
		} else {
			doc.text("Sin ventas recientes", margin, y); y += 12;
		}

		y += 8;

		// Movimientos recientes
		doc.setFontSize(12);
		doc.text("Movimientos recientes", margin, y);
		y += 14;
		doc.setFontSize(10);
		if (Array.isArray(dash.recentMovements) && dash.recentMovements.length) {
			for (const m of dash.recentMovements) {
				if (y > 750) { doc.addPage(); y = margin; }
				doc.text(`${m.fecha} ${m.hora} — ${m.producto} (${m.tipo}) ${m.sucursal} x${m.cantidad}`, margin, y);
				y += 12;
			}
		} else {
			doc.text("Sin movimientos recientes", margin, y); y += 12;
		}

		y += 8;

		// Stock total
		doc.setFontSize(12);
		doc.text(`Stock total: ${dash.stockTotal}`, margin, y); y += 12;

		// Guardar PDF
		const filename = `reporte-diario-${new Date().toISOString().slice(0, 10)}.pdf`;
		doc.save(filename);
	};

	const generateMonthReportPDF = (dash) => {
		const doc = new jsPDF({ unit: "pt", format: "a4" });
		const margin = 40;
		let y = margin;

		const fmtC = (v) => `$${Number(v || 0).toFixed(2)}`;

		// Título
		doc.setFontSize(16);
		doc.text("Reporte del Mes", margin, y);
		y += 20;

		doc.setFontSize(10);
		doc.text(`Fecha: ${new Date().toLocaleString()}`, margin, y);
		y += 18;

		// Resumen rápido
		doc.setFontSize(12);
		doc.text("Resumen rápido", margin, y);
		y += 14;
		doc.setFontSize(10);
		doc.text(`Total ingresos del mes: ${fmtC(dash.totalRevenueMonth)}`, margin, y); y += 12;
		doc.text(`Total ventas del mes: ${dash.totalSalesMonth}`, margin, y); y += 12;
		doc.text(`Productos vendidos en el mes: ${dash.productsSoldMonth}`, margin, y); y += 12;
		doc.text(`Clientes en el mes: ${dash.clientsMonth}`, margin, y); y += 16;

		// Ventas recientes
		doc.setFontSize(12);
		doc.text("Ventas del mes", margin, y);
		y += 14;
		doc.setFontSize(10);
		if (Array.isArray(dash.recentSales) && dash.recentSales.length) {
			doc.text("ID", margin, y);
			doc.text("Fecha", margin + 40, y);
			doc.text("Hora", margin + 120, y);
			doc.text("Total", margin + 160, y);
			doc.text("Cliente", margin + 230, y);
			doc.text("Sucursal", margin + 420, y);
			y += 12;

			for (const s of dash.recentSales) {
				if (y > 750) { doc.addPage(); y = margin; }
				doc.text(String(s.id), margin, y);
				doc.text(String(s.fecha), margin + 40, y);
				doc.text(String(s.hora), margin + 120, y);
				doc.text(fmtC(s.total), margin + 160, y);
				doc.text(String(s.cliente), margin + 230, y);
				doc.text(String(s.sucursal), margin + 420, y);
				y += 12;
			}
		} else {
			doc.text("Sin ventas recientes", margin, y); y += 12;
		}

		y += 8;

		// Movimientos recientes
		doc.setFontSize(12);
		doc.text("Movimientos del mes", margin, y);
		y += 14;
		doc.setFontSize(10);
		if (Array.isArray(dash.recentMovements) && dash.recentMovements.length) {
			for (const m of dash.recentMovements) {
				if (y > 750) { doc.addPage(); y = margin; }
				doc.text(`${m.fecha} ${m.hora} — ${m.producto} (${m.tipo}) ${m.sucursal} x${m.cantidad}`, margin, y);
				y += 12;
			}
		} else {
			doc.text("Sin movimientos recientes", margin, y); y += 12;
		}

		y += 8;

		// Stock total
		doc.setFontSize(12);
		doc.text(`Stock total: ${dash.stockTotal}`, margin, y); y += 12;

		// Guardar PDF
		const filename = `reporte-del-mes-${new Date().toISOString().slice(0, 10)}.pdf`;
		doc.save(filename);
	};

	const generateYearReportPDF = (dash) => {
		const doc = new jsPDF({ unit: "pt", format: "a4" });
		const margin = 40;
		let y = margin;

		const fmtC = (v) => `$${Number(v || 0).toFixed(2)}`;

		// Título
		doc.setFontSize(16);
		doc.text("Reporte del Año", margin, y);
		y += 20;

		doc.setFontSize(10);
		doc.text(`Fecha: ${new Date().toLocaleString()}`, margin, y);
		y += 18;

		// Resumen rápido
		doc.setFontSize(12);
		doc.text("Resumen rápido", margin, y);
		y += 14;
		doc.setFontSize(10);
		doc.text(`Total ingresos del año: ${fmtC(dash.totalRevenueYear)}`, margin, y); y += 12;
		doc.text(`Total ventas del año: ${dash.totalSalesYear}`, margin, y); y += 12;
		doc.text(`Productos vendidos en el año: ${dash.productsSoldYear}`, margin, y); y += 12;
		doc.text(`Clientes en el año: ${dash.clientsYear}`, margin, y); y += 16;

		// Ventas recientes
		doc.setFontSize(12);
		doc.text("Ventas del año", margin, y);
		y += 14;
		doc.setFontSize(10);
		if (Array.isArray(dash.recentSales) && dash.recentSales.length) {
			doc.text("ID", margin, y);
			doc.text("Fecha", margin + 40, y);
			doc.text("Hora", margin + 120, y);
			doc.text("Total", margin + 160, y);
			doc.text("Cliente", margin + 230, y);
			doc.text("Sucursal", margin + 420, y);
			y += 12;

			for (const s of dash.recentSales) {
				if (y > 750) { doc.addPage(); y = margin; }
				doc.text(String(s.id), margin, y);
				doc.text(String(s.fecha), margin + 40, y);
				doc.text(String(s.hora), margin + 120, y);
				doc.text(fmtC(s.total), margin + 160, y);
				doc.text(String(s.cliente), margin + 230, y);
				doc.text(String(s.sucursal), margin + 420, y);
				y += 12;
			}
		} else {
			doc.text("Sin ventas recientes", margin, y); y += 12;
		}

		y += 8;

		// Movimientos recientes
		doc.setFontSize(12);
		doc.text("Movimientos del año", margin, y);
		y += 14;
		doc.setFontSize(10);
		if (Array.isArray(dash.recentMovements) && dash.recentMovements.length) {
			for (const m of dash.recentMovements) {
				if (y > 750) { doc.addPage(); y = margin; }
				doc.text(`${m.fecha} ${m.hora} — ${m.producto} (${m.tipo}) ${m.sucursal} x${m.cantidad}`, margin, y);
				y += 12;
			}
		} else {
			doc.text("Sin movimientos recientes", margin, y); y += 12;
		}

		y += 8;

		// Stock total
		doc.setFontSize(12);
		doc.text(`Stock total: ${dash.stockTotal}`, margin, y); y += 12;

		// Guardar PDF
		const filename = `reporte-anual-${new Date().toISOString().slice(0, 10)}.pdf`;
		doc.save(filename);
	};


	return (
		<>
			{
				loading ? (
					<Loading
						pageTitle={"Dashboard"}
					/>
				) : (
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
								text={generatingPdf ? 'Generando...' : 'Generar Reporte'}
								icon={<BsEye className='h-4 w-4' />}
								func={() => handleGenerateReport('choose')}
							/>
						</section>
						<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
							<InfoCard
								CardTitle={"Ventas Hoy"}
								cardValue={fmtC(dash?.totalRevenueToday)}
								cardIconColor={"success"}
								cardIcon={<FiDollarSign className='h-4 w-4 md:h-6 md:w-6 text-success' />}
							/>
							<InfoCard
								CardTitle={"Productos Vendidos"}
								cardValue={`${dash?.productsSoldToday ?? 0}`}
								cardIconColor={"primary"}
								cardIcon={<BsCart2 className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
							/>
							<InfoCard
								CardTitle={"Clientes atendidos"}
								cardValue={`${dash?.clientsToday ?? 0}`}
								cardIconColor={"blue"}
								cardIcon={<HiOutlineUserGroup className='h-4 w-4 md:h-6 md:w-6 text-blue' />}
							/>
							<InfoCard
								CardTitle={"Productos en stock"}
								cardValue={`${dash?.stockTotal ?? 0}`}
								cardIconColor={"yellow"}
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
										<span className='text-xs md:text-medium font-bold w-15 text-right'>{fmtC(data.amount)}</span>
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
											const status = item.status || (item.stock === 0 ? 'agotado' : (Number(item.stock || 0) <= max * 0.3 ? 'bajo' : ''));
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
								</div>
								<div className='text-center flex flex-col justify-center items-center'>
									<h2 className='md:text-xl font-bold text-primary'>{dash?.productsSoldMonth ?? 0}</h2>
									<span className='text-sm md:text-medium text-dark/50'>Productos Vendidos</span>
								</div>
								<div className='text-center flex flex-col justify-center items-center'>
									<h2 className='md:text-xl font-bold text-blue'>{dash?.clientsThisMonth ?? 0}</h2>
									<span className='text-sm md:text-medium text-dark/50'>Clientes Unicos</span>
								</div>
								<div className='text-center flex flex-col justify-center items-center'>
									<h2 className='md:text-xl font-bold text-purple-500'>100%</h2>
									<span className='text-sm md:text-medium text-dark/50'>Satisfaccion</span>
								</div>
							</div>
						</section>
					</div>
				)
			}
			{
				isActiveModal && (
					<ModalContainer
						modalTitle={"Generar Reporte del Dashboard"}
						setIsActiveModal={setIsActiveModal}
						modalDescription={"Escoge el reporte que desea generar en formato PDF"}
					>
						<div className='w-full flex flex-col gap-4'>
							<Button
								className={"success"}
								text={"Reporte de Hoy"}
								icon={<HiOutlineCalculator className='h-5 w-5' />}
								func={() => { handleGenerateReport('today'); setIsActiveModal(false); }}
							/>
							<Button
								className={"blue"}
								text={"Reporte del Mes"}
								icon={<HiOutlineCalculator className='h-5 w-5' />}
								func={() => { handleGenerateReport('month'); setIsActiveModal(false); }}
							/>
							<Button
								className={"primary"}
								text={"Reporte del Año"}
								icon={<HiOutlineCalculator className='h-5 w-5' />}
								func={() => { handleGenerateReport('year'); setIsActiveModal(false); }}
							/>
							<Input
								label={"Reporte Personalizado"}
								placeholder={"Selecciona la fecha de inicio"}
								onChange={(value) => { console.log(value); }}
								type={"date"}
								inputClass={'no icon'}
							/>
							<Input
								placeholder={"Selecciona la fecha de fin"}
								onChange={(value) => { console.log(value); }}
								type={"date"}
								inputClass={'no icon'}
							/>
							<Button
								className={"purple"}
								text={"Reporte Personalizado"}
								icon={<HiOutlineCalculator className='h-5 w-5' />}
								func={() => { handleGenerateReport('custom'); }}
							/>
						</div>
					</ModalContainer>
				)
			}
		</>
	)
}
