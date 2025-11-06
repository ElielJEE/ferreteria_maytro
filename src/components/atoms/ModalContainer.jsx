"use client"
import React, { useEffect, useState } from 'react'
import Button from './Button';

export default function ModalContainer({ setIsActiveModal, modalTitle, modalDescription = "", children, txtButton, txtButtonSecundary = "Cancelar", isForm = false }) {
	const [onClose, setOnClose] = useState(false);

	return (
		<div
			className='w-screen h-screen fixed z-100 bottom-0 left-0 p-4 flex justify-center items-center bg-dark/80'
			onClick={isForm ? () => setOnClose(true) : () => setIsActiveModal(false)}
		>
			<div
				className='bg-light rounded-lg p-4 mx-h-[100vh - 10px]'
				onClick={(e) => e.stopPropagation()}
			>
				<div className='w-full'>
					<h2 className='md:text-lg font-semibold'>{modalTitle}</h2>
					{modalDescription &&
						<span className='text-sm text-dark/70' style={{ whiteSpace: 'pre-line' }}>{modalDescription}</span>
					}
				</div>
				{children}
			</div>
			{
				onClose && isForm && (
					<div className='absolute w-screen h-screen bottom-0 left-0 p-4 flex justify-center items-center bg-dark/80'>
						<div
							className='top-70 w-max flex flex-col bg-light p-4 rounded-lg shadow-2xl'
							onClick={(e) => e.stopPropagation(e)}
						>
							<h2 className='md:text-lg font-semibold'>Confirmar cierre de modal</h2>
							<span className='text-sm text-dark/70'>Se limpiaran los datos de los campos con informacion.</span>
							<div className='flex gap-4 mt-4'>
								<Button
									text={'No Cerrar'}
									className={'danger'}
									func={() => setOnClose(false)}
								/>
								<Button
									text={'Confirmar cierre'}
									className={'success'}
									func={() => setIsActiveModal(false)}
								/>
							</div>
						</div>
					</div>
				)
			}
		</div>
	)
}
