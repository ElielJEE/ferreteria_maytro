'use client'
import React, { useEffect, useState } from 'react'
import { SucursalesService } from '@/services';
import { Input } from '../molecules';
import { Button } from '../atoms';

export default function CajaOrg() {
	const [sucursales, setSucursales] = useState([]);

	useEffect(() => {
		const fetchSucursal = async () => {
			const res = await SucursalesService.getSucursales();
			const sucursalesData = res.sucursales;
			setSucursales(sucursalesData || []);

		}
		fetchSucursal();
	}, [])

	console.log(sucursales);

	return (
		<div className='p-6'>
			<h2 className='md:text-2xl font-semibold'>Configuracion de cajas en sucursales</h2>
			<span className='text-sm md:text-medium text-dark/50'>Configura el monto de la apertura de caja para cada una de las sucursales.</span>
			<div className='flex flex-col gap-4 mt-4'>
				{sucursales &&
					sucursales.map((sucursal, index) => (
						<div key={index} className='border border-dark/20 p-4 rounded-lg flex flex-col gap-2'>
							<h2 className='md:text-lg font-semibold'>Caja {sucursal.label}</h2>
							<Input
								inputClass={'no icon'}
								placeholder={'Ingrese monto de apertura de caja...'}
								type={'number'}
							/>
							<div className='flex gap-2'>
								<Button 
									text={'Aperturar caja'}
									className={'success'}
								/>
								<Button 
									text={'Cerrie de Caja'}
									className={'secondary'}
								/>
							</div>
						</div>
					))
				}
			</div>
		</div>
	)
}
