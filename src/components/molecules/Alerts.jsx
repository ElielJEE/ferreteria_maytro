import React from 'react'
import { FiAlertCircle, FiAlertTriangle, FiTrendingUp, FiXCircle } from 'react-icons/fi'
import { AlertCard } from '.'
import { Button } from '../atoms';

export default function Alerts() {
	const data = [
		{
			id: 1,
			status: "bajo",
			productName: "Tornillos Autorroscantes 1/2\"",
			sucursal: "Sucursal Norte",
			stock: 8,
			min: 50,
			store: 5,
			reserved: 0,
			damaged: 0,
			totalPhisical: 15,
			action: "Reabastecer",
		},
		{
			id: 4,
			status: "bajo",
			productName: "Tornillos Autorroscantes 1/2\"",
			sucursal: "Sucursal Norte",
			stock: 8,
			min: 50,
			store: 5,
			reserved: 0,
			damaged: 0,
			totalPhisical: 15,
			action: "Reabastecer",
		},
		{
			id: 2,
			status: "agotado",
			productName: "Cable Eléctrico 12 AWG",
			sucursal: "Sucursal Centro",
			stock: 0,
			min: 50,
			store: 5,
			reserved: 3,
			damaged: 5,
			totalPhisical: 8,
			action: "Urgente",
		},
		{
			id: 5,
			status: "agotado",
			productName: "Cable Eléctrico 12 AWG",
			sucursal: "Sucursal Centro",
			stock: 0,
			min: 50,
			store: 5,
			reserved: 3,
			damaged: 5,
			totalPhisical: 8,
			action: "Urgente",
		},
		{
			id: 3,
			status: "exceso",
			productName: "Tubo PVC 4\" x 6m",
			sucursal: "Sucursal Norte",
			stock: 48,
			max: 30,
			action: "Promocionar",
		},
		{
			id: 6,
			status: "exceso",
			productName: "Tubo PVC 4\" x 6m",
			sucursal: "Sucursal Norte",
			stock: 48,
			max: 30,
			action: "Promocionar",
		},
	];

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col w-full mb-4'>
				<h2 className="md:text-2xl font-semibold flex items-center gap-2">
					<FiAlertTriangle className='text-yellow' />
					Alertas de Stock
				</h2>
				<p className="text-sm md:text-medium text-dark/50">
					Alertas consolidadas de todas las sucursales
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
							<AlertCard AlertCard key={index} {...alert} >
								<Button 
								text={"Promocionar"}
								className={"blue"}
								
								/>
							</AlertCard>
						))
				}
			</section>
		</div>
	)
}
