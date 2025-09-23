import React from 'react'
import { HiMiniArrowTrendingUp } from "react-icons/hi2";

export default function InfoCard({ CardTitle, cardValue, cardIcon, cardIconColor, cardChange, outOfStockIcon, comparativeText }) {
	const ColorVariants = {
		success: 'bg-success/10',
		primary: 'bg-primary/10',
		secondary: 'bg-secondary/10',
		blue: 'bg-blue/10',
		yellow: 'bg-yellow/10',
		danger: 'bg-danger/10'
	};

	return (
		<div className='w-full flex justify-between items-center grow border-dark/20 border rounded-lg p-4'>
			<div className="flex flex-col justify-between">
				<span className='text-xs md:text-sm font-medium text-dark/70'>{CardTitle}</span>
				<h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-dark'>{cardValue}</h2>
				<div className="flex items-center gap-1 mt-1">
					{outOfStockIcon ? outOfStockIcon : (
						cardChange >= 0
							? <HiMiniArrowTrendingUp className='text-success' />
							: (comparativeText &&
								(
									<HiMiniArrowTrendingUp className='text-danger rotate-180' />
								)
							)
					)}
					{outOfStockIcon
						? <span className={`${cardChange === 0 ? 'text-success' : 'text-yellow'} text-xs md:text-sm`}>{cardChange} Agotados</span>
						: (comparativeText &&
							(
								<>
									<span className={`${cardChange >= 0 ? 'text-success' : 'text-danger'} text-xs md:text-sm`}>{cardChange}%</span>
									<span className='text-xs md:text-sm text-dark/60'>vs ayer</span>
								</>
							)
						)
					}
				</div>
			</div>
			<div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 ${ColorVariants[cardIconColor]} rounded-lg`}>
				{cardIcon}
			</div>
		</div >
	)
}
