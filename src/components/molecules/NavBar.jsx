'use client'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { BiHomeAlt } from 'react-icons/bi';
import { FiCalendar } from 'react-icons/fi';

export default function NavBar() {
	const [date, setDate] = useState("");
	const pathname = usePathname();

	useEffect(() => {
		const actualizar = () => {
			const ahora = new Date();
			const formateado = ahora.toLocaleString("es-ES", {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			});
			setDate(formateado);
		};

		actualizar();
		const intervalo = setInterval(actualizar, 1000);

		return () => clearInterval(intervalo);
	}, []);

	const paths = pathname.split("/").filter(Boolean);
	const formattedPaths = paths.map(segment =>
		segment.charAt(0).toUpperCase() + segment.slice(1)
	);

	return (
		<nav className='fixed right-0 top-0 h-20 w-[80%] px-5 bg-light'>
			<div className='h-full border-b border-dark/10'>
				<div className='flex justify-between items-center h-full'>
					<div className='flex gap-1 justify-center items-center text-xl font-bold'>
						<BiHomeAlt className='text-primary h-5 w-5' />
						<h3 className='text-2x1'>{formattedPaths.join(" > ")} - El Maytro</h3>
					</div>
					<span className='flex gap-1 justify-center items-center text-medium text-dark/70'><FiCalendar /> {date}</span>
				</div>
			</div>
		</nav>
	)
}
