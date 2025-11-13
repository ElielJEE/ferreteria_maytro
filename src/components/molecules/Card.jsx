import React from 'react'
import { Button } from '../atoms'
import { FiDelete, FiEdit, FiTrash } from 'react-icons/fi'

export default function Card({ productName, status, sucursal, id, category, children, func, funcSecundary, other, bgColor, price, stock, UnitMeasure }) {
	const ColorVariants = {
		success: 'bg-success',
		primary: 'bg-primary',
		secondary: 'bg-secondary',
		blue: 'bg-blue',
		yellow: 'bg-yellow',
		danger: 'bg-danger',
		purple: 'bg-purple',
	};

	return (
		<div className='flex flex-col justify-center items-center bg-light border border-dark/30 rounded-lg p-4 w-full'>
			<div className='w-full flex flex-col gap-2'>
				<div className='w-full flex justify-between items-center'>
					<h2 className='text-lg font-semibold'>{productName}</h2>
					<div className='flex flex-col'>
						{status &&
							<span className={`text-sm font-medium text-light px-2 py-1 rounded-full 
							${status === 'Disponible' || status === 'Recuperable' || status === 'activa' || status === 'procesado'
									? 'bg-success'
									: status === 'Exceso'
										? 'bg-blue'
										: status === 'Bajo' || status === 'pendiente'
											? 'bg-yellow'
											: 'bg-danger'
								}`}>
								{status}
							</span>
						}
						{/* Mostrar precio solo si es numérico y distinto de 0 (evita renderizar "0") */}
						{(price !== undefined && price !== null && Number(price) !== 0) && (
							<span className='text-primary font-semibold'>C${price}</span>
						)}
						{/* Evitar mostrar UnitMeasure si es vacío o '0' */}
						{(UnitMeasure !== undefined && UnitMeasure !== null && String(UnitMeasure).trim() !== '' && String(UnitMeasure) !== '0') && (
							<span className='text-dark/70 font-semibold'>{UnitMeasure}</span>
						)}
						{/* Mostrar 'Agotado' cuando stock === 0 para evitar 'Stock: 0' y mantener Stock: X cuando > 0 */}
						{(stock !== undefined && stock !== null) && (
							<span className={`${Number(stock) <= 0 ? 'text-light bg-danger rounded-full px-2' : 'text-dark/70'} font-semibold`}>
								{Number(stock) <= 0 ? 'Agotado' : `Stock: ${stock}`}
							</span>
						)}
					</div>
				</div>
				<div className='w-full flex flex-col justify-start items-start gap-1'>
					<span className='text-sm text-dark/70 font-semibold'>{id}</span>
					<div className='flex gap-2'>
						{other &&
							<span className={`${!bgColor ? 'border border-dark/80' : 'text-light'} rounded-full px-2 font-semibold ${bgColor && ColorVariants[bgColor]}`}>
								{other}
							</span>
						}
						{category &&
							<span className={`${!bgColor ? 'border border-dark/80' : 'text-light'} rounded-full px-2 font-semibold ${bgColor && ColorVariants[bgColor]}`}>
								{category}
							</span>
						}
						{sucursal &&
							<span className='border border-dark/80 rounded-full px-2 font-semibold'>{sucursal}</span>
						}
					</div>
				</div>
			</div>
			<div className='w-full grid grid-cols-2 gap-2 mt-4'>
				{children}
			</div>
		</div>
	)
}
