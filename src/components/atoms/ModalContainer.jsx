"use client"
import React, { useEffect, useState } from 'react'
import Button from './Button';

export default function ModalContainer({ setIsActiveModal, modalTitle, modalDescription = "", children, txtButton, txtButtonSecundary = "Cancelar", btnClass = "success", btnClassSecundary = "secondary", btnFunc }) {

	return (
		<div
			className='w-screen h-screen fixed z-100 bottom-0 left-0 p-4 flex justify-center items-center bg-dark/80'
			onClick={() => setIsActiveModal(false)}
		>
			<div
				className='w-full max-w-lg bg-light rounded-lg p-4'
				onClick={(e) => e.stopPropagation()}
			>
				<div className='w-full'>
					<h2 className='md:text-lg font-semibold'>{modalTitle}</h2>
					{modalDescription &&
						<span className='text-sm text-dark/70'>{modalDescription}</span>
					}
				</div>
				{children}
				<div className='w-full flex justify-end items-center gap-2 mt-4'>
					<Button
						className={btnClassSecundary}
						text={txtButtonSecundary}
						func={() => setIsActiveModal(false)}
					/>
					<Button
						className={btnClass}
						text={txtButton}
						func={btnFunc}
					/>
				</div>
			</div>
		</div>
	)
}
