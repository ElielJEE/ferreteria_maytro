import React from 'react'
import { Button } from '../atoms'
import { FiDelete, FiEdit, FiTrash } from 'react-icons/fi'

export default function Card({ productName, status, id, category, stock, salePrice, purshasePrice }) {
	return (
		<div className='flex flex-col justify-center items-center bg-light border border-dark/30 rounded-lg p-4 w-full'>
			<div className='w-full flex flex-col gap-2'>
				<div className='w-full flex justify-between items-center'>
					<h2 className='text-lg font-semibold'>{productName}</h2>
					<span className={`text-sm font-medium ${status === 'Disponible' ? 'bg-success' : status === 'Stock Bajo' ? 'bg-yellow' : 'bg-secondary'} text-light px-2 py-1 rounded-full`}>
						{status}
					</span>
				</div>
				<div className='w-full flex flex-col justify-start items-start gap-1'>
					<span className='text-sm text-dark/70 font-semibold'>{id}</span>
					<span className='border border-dark/80 rounded-full px-2 font-semibold'>{category}</span>
				</div>
			</div>
			<div className='w-full grid grid-cols-2 gap-2 mt-4'>
				<div className='flex flex-col'>
					<span className='text-sm text-dark/70'>Stock</span>
					<span className='text-lg font-semibold'>{stock}</span>
				</div>
				<div className='flex flex-col'>
					<span className='text-sm text-dark/70'>Precio Venta</span>
					<span className='text-lg font-semibold'>C${salePrice}</span>
				</div>
				<div className='flex flex-col'>
					<span className='text-sm text-dark/70'>Precio Compra</span>
					<span className='text-lg font-semibold'>C${purshasePrice}</span>
				</div>
			</div>
			<div className='w-full flex justify-between items-center gap-2 mt-4'>
				<Button className={"none"} text={"Editar"} icon={<FiEdit />} />
				<Button className={"none"} text={"Eliminar"} icon={<FiTrash />} />
			</div>
		</div>
	)
}
