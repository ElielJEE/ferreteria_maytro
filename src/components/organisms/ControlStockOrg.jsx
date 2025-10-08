"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, InfoCard, ModalContainer } from '../atoms'
import { FiAlertTriangle, FiBox, FiDollarSign, FiEye, FiFile, FiGlobe, FiSearch, FiShoppingCart, FiTrendingUp, FiX, FiXCircle } from 'react-icons/fi'
import { BsBoxSeam, BsBuilding, BsGear } from 'react-icons/bs'
import { Alerts, Card, Damaged, DropdownMenu, Input, Movements, Reserved, Summary } from '../molecules'
import { useActive, useIsMobile } from '@/hooks'

export default function ControlStockOrg() {
	const cardData = {
		"en_bodega": 1250,
		"en_stock": 12,
		"fisico_total": 1250,
		"danados": 5,
		"reservados": 50,
		"criticos": 1,
		"agotados": 150,
		"valor_total": 1250.00
	}

	const cardsConfig = [
		{ key: "en_bodega", title: "En Bodega Disponible", icon: BsBoxSeam, color: "primary" },
		{ key: "en_stock", title: "En stock", icon: FiTrendingUp, color: "success" },
		{ key: "fisico_total", title: "Fisico Total", icon: FiEye, color: "blue" },
		{ key: "danados", title: "Dañados", icon: FiX, color: "danger" },
		{ key: "reservados", title: "Reservados", icon: FiShoppingCart, color: "purple" },
		{ key: "criticos", title: "Criticos", icon: FiAlertTriangle, color: "yellow" },
		{ key: "agotados", title: "Agotados", icon: BsBoxSeam, color: "secondary" },
		{ key: "valor_total", title: "Valor total", icon: FiDollarSign, color: "success", prefix: "C$ " },
	];

	const [activeTab, setActiveTab] = useState("");
	const router = useRouter();

	useEffect(() => {
		try {
			const params = new URLSearchParams(window.location.search);
			const tab = params.get('tab');
			if (tab && tabs.some(t => t.label === tab)) {
				setActiveTab(tab)
			} else {
				setActiveTab("Resumen")
			}
		} catch (e) {

		}
	}, []);

	useEffect(() => {
		try {
			const params = new URLSearchParams(window.location.search);
			params.set('tab', activeTab);
			const url = `${window.location.pathname}?${params.toString()}`;
			router.replace(url);
		} catch (e) {

		}
	}, [activeTab, router]);

	const tabs = [
		{ label: "Resumen", icon: <FiEye /> },
		{ label: "Movimientos", icon: <FiFile /> },
		{ label: "Alertas", icon: <FiAlertTriangle /> },
		{ label: "Dañados", icon: <FiXCircle /> },
		{ label: "Reservados", icon: <FiShoppingCart /> },
	];

	const { setIsActiveModal, isActiveModal } = useActive();

	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='flex flex-col md:flex-row w-full gap-1 md:items-center justify-start border border-dark/20 rounded-lg p-4 mb-4'>
					<div className='flex gap-1 items-center'>
						<FiGlobe className='h-4 w-4 md:h-5 md:w-5 text-blue' />
						<h3 className='md:text-lg font-semibold'>Sucursal: </h3>
					</div>
					<div className='lg:w-1/3 md:w-1/2'>
						<DropdownMenu
							options={['Vista general (Todas las sucursales)', 'sucursal 1', 'sucursal 2']}
							defaultValue={"Vista general (Todas las sucursales)"}
						/>
					</div>
				</section>
				<section className='w-full flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-4'>
					{
						cardsConfig.map((cfg, index) => (
							<div key={index} className='snap-start shrink-0 w-72 lg:w-auto'>
								<InfoCard
									CardTitle={cfg.title}
									cardValue={cardData[cfg.key]}
									cardIcon={<cfg.icon className={`h-4 w-4 md:h-6 md:w-6 text-${cfg.color}`} />}
									cardIconColor={cfg.color}
								/>
							</div>
						))
					}
				</section>
				<section className='w-full mt-6'>
					<div className='grid grid-cols-5 p-1 h-10 bg-dark/10 rounded-sm text-dark/50 font-semibold'>
						{tabs.map((tab) => (
							<div
								key={tab.label}
								className={`flex gap-2 items-center justify-center cursor-pointer rounded-sm ${activeTab === tab.label ? "bg-light text-dark" : ""
									}`}
								onClick={() => setActiveTab(tab.label)}
							>
								{tab.icon}
								<h2 className='hidden md:block'>{tab.label}</h2>
							</div>
						))}
					</div>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					{activeTab === 'Resumen' && <Summary setIsActiveModal={setIsActiveModal} />}
					{activeTab === 'Movimientos' && <Movements />}
					{activeTab === 'Alertas' && <Alerts />}
					{activeTab === 'Dañados' && <Damaged />}
					{activeTab === 'Reservados' && <Reserved />}
				</section>
			</div>
			{
				isActiveModal &&
				<ModalContainer
					setIsActiveModal={setIsActiveModal}
					txtButton={'Registrar Movimiento'}
					modalTitle={'Ajustar Stock de Producto'}
					modalDescription={'Registra un movimiento de inventario'}
				>
					<form className='w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
						<DropdownMenu
							label={"Sucursal"}
							options={data.map(data => data.sucursal).filter((value, index, self) => self.indexOf(value) === index)}
							defaultValue={'Selecciona una sucursal'}
						/>
						<DropdownMenu
							label={"Producto"}
							options={data.map(data => data.nombre).filter((value, index, self) => self.indexOf(value) === index)}
							defaultValue={'Selecciona un producto'}
						/>
						<DropdownMenu
							label={"Tipo de Movimiento"}
							options={['Entrada (Aumentar Stock)', 'Salida (Reducir Stock)', 'Marcar como Dañado', 'Marcar como Reservado', 'Transferencia']}
							defaultValue={'Ajuste (Correccion)'}
						/>
						<Input
							label={"Cantidad"}
							placeholder={"0"}
							type={"number"}
							inputClass={"no icon"}
						/>
						<Input
							label={"Referencia (opcional)"}
							placeholder={"Ej: ORD-001, VEN-1234"}
							type={"text"}
							inputClass={"no icon"}
						/>
						<Input
							label={"Motivo"}
							placeholder={"Describe el motivo del ajuste..."}
							type={""}
							inputClass={"no icon"}
							isTextarea={true}
						/>
					</form>
				</ModalContainer>
			}
		</>
	)
}
