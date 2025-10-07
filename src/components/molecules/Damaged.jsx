import React from 'react'
import { FiAlertTriangle, FiDollarSign, FiTrendingDown, FiXCircle } from 'react-icons/fi'
import { InfoCard } from '../atoms'
import { BsBoxSeam } from 'react-icons/bs';

export default function Damaged() {
	const cardData = {
		"danados": 5,
		"recuperables": 50,
		"perdida_total": 1,
		"valor_perdido": 150,
	}

	const cardsConfig = [
		{ key: "danados", title: "Dañados", icon: FiXCircle, color: "danger" },
		{ key: "recuperables", title: "Recuperables", icon: FiAlertTriangle, color: "yellow" },
		{ key: "perdida_total", title: "Perdida total", icon: FiTrendingDown, color: "secondary" },
		{ key: "valor_perdido", title: "Valor perdido", icon: FiDollarSign, color: "danger" },
	];
	return (
		<div>
			<div className='w-full flex flex-col mb-4'>
				<h2 className='md:text-2xl font-semibold flex items-center gap-2'>
					<FiXCircle className='text-danger' />
					Productos Dañados
				</h2>
				<span className='text-sm md:text-medium text-dark/50'>Productos dañados en todas las sucursales</span>
			</div>
			<section className='grid grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
				{
					cardsConfig.map((cfg, index) => (
						<InfoCard
							key={index}
							CardTitle={cfg.title}
							cardValue={cardData[cfg.key]}
							cardIcon={<cfg.icon className={`h-4 w-4 md:h-6 md:w-6 text-${cfg.color}`} />}
							cardIconColor={cfg.color}
						/>
					))
				}
			</section>
		</div>
	)
}
