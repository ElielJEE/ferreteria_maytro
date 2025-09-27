import React from 'react'
import { InfoCard } from '../atoms'
import { FiAlertTriangle, FiBox, FiDollarSign, FiEye, FiShoppingCart, FiTrendingUp, FiX } from 'react-icons/fi'
import { BsBoxSeam } from 'react-icons/bs'

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


	return (
		<>
			<div className='w-full p-6 flex flex-col'>
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
			</div>
		</>
	)
}
