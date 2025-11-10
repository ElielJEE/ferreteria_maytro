import React from 'react'

export default function DescuentoCard({ title, description, code, percentValue, children }) {
	return (
		<>
			<div className='p-6 flex flex-col border border-primary gap-4 rounded-lg w-full'>
				<div className='flex justify-between items-start'>
					<div>
						<h2 className='md:text-2xl font-semibold'>{title || "Texto de prueba."}</h2>
						<span className='text-dark/70'>{description || "Texto de prueba descripcion."}</span>
					</div>
					<div className='px-4 border border-primary rounded-full bg-primary/10 font-semibold md:text-lg text-primary'>
						{percentValue || "15%"}
					</div>
				</div>
				<div className='py-4 px-1 border-y border-dark/10'>
					<div className='p-4 bg-dark/15 rounded-lg flex flex-col gap-2'>
						<h3 className='text-dark/50 font-semibold'>CODIGO</h3>
						<h2 className='font-semibold text-xl'>{code || "CODETEST123"}</h2>
					</div>
				</div>
				<div className='grid grid-cols-3 gap-2'>
					{children}
				</div>
			</div>
		</>
	)
}
