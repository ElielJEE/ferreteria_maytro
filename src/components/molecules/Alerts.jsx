import React, { useEffect, useState } from 'react'
import { FiAlertCircle, FiAlertTriangle, FiTrendingUp, FiXCircle } from 'react-icons/fi'
import { AlertCard } from '.'
import { Button } from '../atoms';
import { StockService } from '@/services';
export default function Alerts({ sucursalFilter }) {
	const [data, setData] = useState([]);

	useEffect(() => {
		const fetchAlertas = async () => {
			try {
				let url = '/api/stock?tab=Alertas';
				if (sucursalFilter && sucursalFilter !== 'Todas') {
					url += `&sucursal=${encodeURIComponent(sucursalFilter)}`;
				}
				const res = await fetch(url);
				const json = await res.json().catch(() => null);
				if (!res.ok) {
					console.error('Error al obtener alertas:', json?.error || json?.message || res.statusText);
					setData([]);
					return;
				}
				const arr = Array.isArray(json?.alertas) ? json.alertas : [];
				setData(arr);
			} catch (e) {
				console.error('Fallo al cargar alertas:', e);
				setData([]);
			}
		};
		fetchAlertas();

		const handler = () => fetchAlertas();
		window.addEventListener('stock:updated', handler);
		return () => window.removeEventListener('stock:updated', handler);
	}, [sucursalFilter]);

	const handleUrgente = async (dataAlert) => {
		const payload = {
			tipo: "Entrada (Aumentar Stock)",
			producto: dataAlert.productName,
			sucursal: dataAlert.sucursal,
			cantidad: Number(dataAlert.store < dataAlert.max ? dataAlert.store : dataAlert.max),
			motivo: "Rehabastecimiento de Stock mediante alerta de agotado.",
			referencia: "ALE-URG-001",
			descripcion: "Rehabastecimiento de Stock mediante alerta de agotado.",
		};
		const res = await StockService.registrarMovimiento(payload);

		if (!res.success) {
			return;
		}

		window.dispatchEvent(new CustomEvent('stock:updated', {
			detail: { tipo: "Entrada (Aumentar Stock)", producto: dataAlert.productName, sucursal: dataAlert.sucursal }
		}));
	}

	const handleRehabastecer = async (dataAlert) => {
		const rest = dataAlert.max - dataAlert.stock;

		const payload = {
			tipo: "Entrada (Aumentar Stock)",
			producto: dataAlert.productName,
			sucursal: dataAlert.sucursal,
			cantidad: Number(dataAlert.store >= rest ? rest : dataAlert.store + dataAlert.stock > dataAlert.max ? rest : dataAlert.store),
			motivo: "Rehabastecimiento de Stock mediante alerta de agotado.",
			referencia: "ALE-URG-001",
			descripcion: "Rehabastecimiento de Stock mediante alerta de agotado.",
		};
		const res = await StockService.registrarMovimiento(payload);

		if (!res.success) {
			return;
		}

		window.dispatchEvent(new CustomEvent('stock:updated', {
			detail: { tipo: "Entrada (Aumentar Stock)", producto: dataAlert.productName, sucursal: dataAlert.sucursal }
		}));
	}

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col w-full mb-4'>
				<h2 className="md:text-2xl font-semibold flex items-center gap-2">
					<FiAlertTriangle className='text-yellow' />
					Alertas de Stock
				</h2>
				<p className="text-sm md:text-medium text-dark/50">
					Alertas consolidadas {sucursalFilter && sucursalFilter !== 'Todas' ? `para ${sucursalFilter}` : 'de todas las sucursales'}
				</p>
			</div>

			{/* Stock Bajo */}
			<section className='flex flex-col gap-2'>
				<h3 className="flex items-center gap-2 text-yellow font-semibold">
					<FiAlertCircle />
					Stock Bajo
				</h3>
				{data &&
					data
						.filter((alertType) => alertType.status === 'bajo')
						.map((alert, index) => (
							<AlertCard AlertCard key={index} {...alert} >
								<Button
									text={"Reabastecer"}
									className={"yellow"}
									func={() => handleRehabastecer(alert)}
								/>
							</AlertCard>
						))
				}
			</section>

			{/* Productos Agotados */}
			<section className='flex flex-col gap-2'>
				<h3 className="flex items-center gap-2 text-danger font-semibold">
					<FiXCircle />
					Productos Agotados
				</h3>
				{data &&
					data
						.filter((alertType) => alertType.status === 'agotado')
						.map((alert, index) => (
							<AlertCard AlertCard key={index} {...alert} >
								<Button
									text={"Urgente"}
									className={"danger"}
									func={() => handleUrgente(alert)}
								/>
							</AlertCard>
						))
				}
			</section>

			{/* Exceso de Stock */}
			<section className='flex flex-col gap-2'>
				<h3 className="flex items-center gap-2 text-blue font-semibold">
					<FiTrendingUp />
					Exceso de Stock
				</h3>
				{data &&
					data
						.filter((alertType) => alertType.status === 'exceso')
						.map((alert, index) => (
							<AlertCard AlertCard key={index} {...alert} />
						))
				}
			</section>
		</div>
	)
}
