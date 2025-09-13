import React from 'react'
import { InfoCard } from '@/components/atoms'
import { FiAlertTriangle, FiBox, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { BsBoxSeam, BsFillBoxFill } from 'react-icons/bs'

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
			<section className='w-full mt-6'>

			</section>
		</div>
	)
}
