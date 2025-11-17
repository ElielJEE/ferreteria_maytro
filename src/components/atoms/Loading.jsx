import React from 'react'
import { GiGearHammer } from "react-icons/gi";

export default function Loading({ pageTitle }) {
	return (
		<div className='w-full h-160 flex flex-col items-center justify-center relative'>
			<GiGearHammer className='w-50 h-50 animate-ping absolute' />
			<span className='text-3xl font-bold animate-pulse'>
				Construyendo {pageTitle}…
			</span>
		</div>
	)
}
