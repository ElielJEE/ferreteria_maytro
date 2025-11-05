"use client"
import React, { useEffect, useState } from 'react'
import sidebarData from '@/data/sidebar'
import Link from 'next/link'
import { IoIosArrowForward } from "react-icons/io";
import { Button } from '../atoms';
import { FiLogOut, FiUserCheck } from 'react-icons/fi';
import { AuthService } from '@/services';
import { useRouter } from 'next/navigation';

export default function Sidebar({ openSidebar, setOpenSidebar }) {
	const [openIndex, setOpenIndex] = useState(null);
	const [user, setUser] = useState(true);
	const router = useRouter();

	const toggleDropdown = (index) => {
		setOpenIndex(openIndex === index ? null : index)
	};

	const handleLogout = async () => {
		try {
			const success = await AuthService.logout();
			if (success) {
				router.push("/login");
			}
		} catch (error) {
			console.error("Error al cerrar sesion:", error);
		}
	}

	useEffect(() => {
		const fetchUser = async () => {
			const currentUser = await AuthService.getCurrentUser();
			setUser(currentUser);
		}
		fetchUser();
	}, [])

	return (
		<>
			{openSidebar && (
				<div
					className="fixed inset-0 bg-black/40 z-30 xl:hidden"
					onClick={() => setOpenSidebar(false)}
				></div>
			)}
			<aside className={`flex flex-col left-0 h-screen fixed top-0 bg-light-2 border-r border-dark/10 pl-5 transition-all duration-500 z-40
		${openSidebar ? "translate-x-0" : "-translate-x-full"} xl:w-[20%] lg:w-[30%] md:w-[40%] sm:w-[50%]`}>
				<div className='w-full flex p-4 items-center gap-2'>
					<Link href={"/dashboard"} className='flex gap-2'>
						<img src="/images/logo.jpg" alt="logo-el-maytro" className='h-12 w-12' />
						<div className='flex flex-col'>
							<h2 className='text-lg font-bold'>Ferreteria El Maytro</h2>
							<span className='text-sm text-dark/70'>Ferreteria y Construccion</span>
						</div>
					</Link>
				</div>
				<div className='w-full flex flex-col justify-center pl-2'>
					<h3 className='text-sm'>Menu del Sistema</h3>
					<ul className='mt-2 flex flex-col gap-1'>
						{
							sidebarData
								.map((item, index) => {
									const hasSubModules = item.subModules && item.subModules.length > 0;
									return (
										<li key={index} className='w-[94%]'>
											<div className={`flex justify-center items-center ${openIndex === index ? "bg-dark/5 rounded-md" : ""} px-3 py-1 cursor-pointer hover:bg-dark/5 rounded-md`}>
												{
													hasSubModules ? (
														<>
															<h3
																onClick={() => toggleDropdown(index)}
																className='cursor-pointer flex items-center gap-1 text-medium w-full'>
																{item.icon}
																{item.title}
															</h3>
															<span className='transition-transform duration-400'
																style={{
																	transform: openIndex === index ? "rotate(90deg)" : "rotate(0deg)",
																}}
															>
																<IoIosArrowForward />
															</span>
														</>

													) : (
														<Link href={item.link} className='cursor-pointer flex items-center gap-1 text-medium w-full'>
															{item.icon}
															{item.title}
														</Link>
													)
												}
											</div>
											<ul
												className={`border-l border-dark/10 ml-5 mt-1 transition-all duration-400 overflow-hidden 
											${openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} w-[78%]`}
											>
												{
													item.subModules?.map((subItem, subIndex) => (
														<li key={subIndex}>
															<Link href={subItem.path} className='block px-2 py-1 rounded-md hover:bg-dark/5'>
																{subItem.name}
															</Link>
														</li>
													))
												}
											</ul>
										</li>
									)
								})
						}
					</ul>
				</div>
				<div className='w-[90%] flex flex-col gap-2 mt-auto mb-4'>
					<h3 className='flex items-center gap-1 text-medium font-semibold'>
						<FiUserCheck />
						{!user ? "Cargando..." : user.username}
					</h3>
					<Button className={"primary"} text={"Cerrar Sesion"} icon={<FiLogOut />} func={handleLogout} />
				</div>
			</aside>
		</>
	)
}
