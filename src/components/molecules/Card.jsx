import React from 'react'
import { Button } from '../atoms'
import { FiDelete, FiEdit, FiTrash } from 'react-icons/fi'

export default function Card({ productName, status, sucursal, id, category, children, func, funcSecundary }) {
	return (
		<div className='flex flex-col justify-center items-center bg-light border border-dark/30 rounded-lg p-4 w-full'>
			<div className='w-full flex flex-col gap-2'>
				<div className='w-full flex justify-between items-center'>
					<h2 className='text-lg font-semibold'>{productName}</h2>
					{status &&
						<span className={`text-sm font-medium text-light px-2 py-1 rounded-full 
							${status === 'Disponible'
								? 'bg-success'
								: status === 'Exceso'
									? 'bg-blue'
									: status === 'Bajo'
										? 'bg-yellow'
										: 'bg-danger'
							}`}>
							{status}
						</span>
					}
				</div>
				<div className='w-full flex flex-col justify-start items-start gap-1'>
					<span className='text-sm text-dark/70 font-semibold'>{id}</span>
					<div className='flex gap-2'>
						{category &&
							<span className='border border-dark/80 rounded-full px-2 font-semibold'>{category}</span>
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
			<div className='w-full flex justify-between items-center gap-2 mt-4'>
				<Button className={"none"} text={"Editar"} icon={<FiEdit />} func={func} />
				<Button className={"none"} text={"Eliminar"} icon={<FiTrash />} func={funcSecundary} />
			</div>
		</div>
	)
}
