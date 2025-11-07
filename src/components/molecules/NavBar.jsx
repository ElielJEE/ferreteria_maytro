'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { BiHomeAlt } from 'react-icons/bi';
import { FiCalendar, FiSidebar } from 'react-icons/fi';

export default function NavBar({ openSidebar, setOpenSidebar }) {
	const [date, setDate] = useState("");
	const pathname = usePathname();

	useEffect(() => {
		const actualizar = () => {
			const ahora = new Date();

			const isMovil = window.innerWidth <= 820;

			const options = isMovil
				? { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
				: {
					weekday: "long",
					day: "numeric",
					month: "long",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				};

			const formateado = ahora.toLocaleString("es-ES", options);
			setDate(formateado);
		};

		actualizar();
		const intervalo = setInterval(actualizar, 1000);

		return () => clearInterval(intervalo);
	}, []);

	const customPathname = {
		"control-stock": "Control de Stock",
	}

	const paths = pathname.split("/").filter(Boolean);
	const formattedPaths = paths.map(segment => {
		if (customPathname[segment.toLowerCase()]) {
			return customPathname[segment.toLowerCase()];
		} else {
			const withSpaces = segment.replace(/-/g, ' ');
			return withSpaces
				.split(' ')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		}
	});

	return (
		<nav className={`fixed right-0 top-0 h-20 px-5 bg-light transition-all duration-500 z-30 ${openSidebar ? "xl:w-[80%] w-full" : "w-full"
			}`}>
			<div className='h-full border-b border-dark/10'>
				<div className='flex flex-col justify-center items-start md:flex-row md:justify-between md:items-center h-full'>
					<div className='flex gap-1 justify-center items-center text-xl font-bold'>
						<div className='flex justify-center items-center border-r border-dark/10 pr-4'>
							<FiSidebar
								className='h-4 w-4 cursor-pointer hover:bg-dark/10'
								onClick={() => setOpenSidebar(!openSidebar)}
							/>
						</div>
						<Link href={"/dashboard"}>
							<BiHomeAlt className='text-primary h-4 w-4 ml-4 md:h-5 md:w-5' />
						</Link>
						<h3 className='text-sm md:text-lg lg:text-xl xl:text-2xl'>{formattedPaths.join(" > ")} - El Maytro</h3>
					</div>
					<span className='flex gap-1 justify-center items-center text-medium text-dark/70'><FiCalendar /> {date}</span>
				</div>
			</div>
		</nav>
	)
}
