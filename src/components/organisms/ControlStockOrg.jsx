"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, InfoCard, ModalContainer } from '../atoms'
import { FiAlertTriangle, FiBox, FiDollarSign, FiEye, FiFile, FiGlobe, FiSearch, FiShoppingCart, FiTrendingUp, FiX, FiXCircle } from 'react-icons/fi'
import { BsBoxSeam, BsBuilding, BsGear } from 'react-icons/bs'
import { Alerts, Card, Damaged, DropdownMenu, Input, Movements, Reserved, Summary } from '../molecules'
import { useActive, useIsMobile } from '@/hooks'

export default function ControlStockOrg() {
	const [tipoMovimiento, setTipoMovimiento] = useState("");

	const movimientos = [
		"Entrada (Aumentar Stock)",
		"Salida (Reducir Stock)",
		"Marcar como Dañado",
		"Marcar como Reservado",
		"Transferencia",
	];

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

	const data = [
		{ producto: "Martillo de Carpintero 16oz", sucursal: "Sucursal Sur" },
		{ producto: "Destornillador Phillips #2", sucursal: "Sucursal Centro" },
		{ producto: "Cable Eléctrico 12 AWG", sucursal: "Sucursal Centro" },
	];

	const clientes = [
		{ id: 1, nombre: "Juan Pérez", telefono: "8888-8888" },
		{ id: 2, nombre: "María López", telefono: "7777-7777" },
		{ id: 3, nombre: "Carlos Ramírez", telefono: "9999-9999" },
	];

	const [cliente, setCliente] = useState("");
	const [telefono, setTelefono] = useState("");
	const [clientesFiltrados, setClientesFiltrados] = useState([]);

	const handleClienteChange = (e) => {
		const value = e.target.value;
		setCliente(value);

		// Filtrar coincidencias
		const resultados = clientes.filter(c =>
			c.nombre.toLowerCase().includes(value.toLowerCase())
		);
		setClientesFiltrados(resultados);

		// Si coincide exactamente con un cliente, llenar teléfono
		const clienteExistente = clientes.find(c => c.nombre.toLowerCase() === value.toLowerCase());
		if (clienteExistente) setTelefono(clienteExistente.telefono);
		else setTelefono(""); // Si no existe, se limpia
	};


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
				<section className='flex mt-4 w-full justify-end'>
					<div className='flex xl:w-[20%] lg:w-[30%] md:w-[40%] sm:w-[50%] w-full md:justify-end'>
						<Button
							className={"primary"}
							text={"Ajustar Stock"}
							icon={<BsGear className='h-4 w-4' />}
							func={() => setIsActiveModal(true)}
						/>
					</div>
				</section>
				<section className='w-full mt-4 border-dark/20 border rounded-lg p-4 flex flex-col'>
					{activeTab === 'Resumen' && <Summary setIsActiveModal={setIsActiveModal} />}
					{activeTab === 'Movimientos' && <Movements />}
					{activeTab === 'Alertas' && <Alerts />}
					{activeTab === 'Dañados' && <Damaged />}
					{activeTab === 'Reservados' && <Reserved />}
				</section>
			</div>
			{isActiveModal && (
				<ModalContainer
					setIsActiveModal={setIsActiveModal}
					txtButton={"Registrar Movimiento"}
					modalTitle={"Ajustar Stock de Producto"}
					modalDescription={"Registra un movimiento de inventario"}
				>
					<form className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
						{/* 🔹 Sucursal */}
						<DropdownMenu
							label={"Sucursal"}
							options={[...new Set(data.map((d) => d.sucursal))]}
							defaultValue={"Selecciona una sucursal"}
						/>

						{/* 🔹 Producto */}
						<DropdownMenu
							label={"Producto"}
							options={[...new Set(data.map((d) => d.producto))]}
							defaultValue={"Selecciona un producto"}
						/>

						{/* 🔹 Tipo de Movimiento */}
						<DropdownMenu
							label={"Tipo de Movimiento"}
							options={movimientos}
							defaultValue={"Selecciona un tipo"}
							onChange={(value) => setTipoMovimiento(value)}
						/>

						{/* 🔹 Campos dinámicos */}
						{tipoMovimiento === "Marcar como Dañado" && (
							<>
								<Input label="Cantidad" type="number" placeholder="0" inputClass="no icon" />
								<DropdownMenu
									label="Tipo de Daño"
									options={["Vencido", "Deteriorado", "Defectuoso"]}
									defaultValue="Selecciona un tipo de daño"
								/>
								<DropdownMenu
									label="Estado"
									options={["Recuperable", "Perdida Total"]}
									defaultValue="Selecciona estado"
								/>
								<Input
									label="Descripción"
									placeholder="Describe el daño..."
									isTextarea={true}
									inputClass="no icon"
									isLastElement={true}
								/>
							</>
						)}

						{tipoMovimiento === "Marcar como Reservado" && (
							<>
								<Input label="Cantidad" type="number" placeholder="0" inputClass="no icon" />
								<div className="relative">
									<Input
										label="Cliente"
										placeholder="Nombre del cliente"
										value={cliente}
										onChange={handleClienteChange}
										inputClass="no icon"
									/>
									{clientesFiltrados.length > 0 && cliente !== "" && (
										<ul className="absolute w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10">
											{clientesFiltrados.map((c) => (
												<li
													key={c.id}
													onClick={() => {
														setCliente(c.nombre);
														setTelefono(c.telefono);
														setClientesFiltrados([]);
													}}
													className="px-2 py-1 cursor-pointer hover:bg-primary hover:text-white"
												>
													{c.nombre}
												</li>
											))}
										</ul>
									)}
									<span>
										⚠️ ATENCIÓN: Esta advertencia debe eliminarse cuando se implemente la lógica final.
										El input "Cliente" debe permitir buscar un cliente existente y autocompletar el campo "Teléfono".
										Si el cliente no existe, se registrará como nuevo junto con su número de teléfono.
									</span>
								</div>
								<Input
									label="Teléfono"
									placeholder="Número del cliente"
									value={telefono}
									onChange={(e) => setTelefono(e.target.value)}
									inputClass="no icon"
								/>
								<Input label="Fecha de Entrega" type="date" inputClass="no icon" />
								<Input
									label="Notas"
									placeholder="Agrega una nota..."
									isTextarea={true}
									inputClass="no icon"
								/>
							</>
						)}

						{(tipoMovimiento === "Entrada (Aumentar Stock)" ||
							tipoMovimiento === "Salida (Reducir Stock)") && (
								<>
									<Input label="Cantidad" type="number" placeholder="0" inputClass="no icon" />
									<Input label="Motivo" placeholder="Describe el motivo..." inputClass="no icon" isTextarea={true} />
									<Input
										label="Referencia (opcional)"
										placeholder="Ej: ORD-001, VEN-1234"
										inputClass="no icon"
									/>
								</>
							)}

						{tipoMovimiento === "Transferencia" && (
							<>
								<Input label="Cantidad" type="number" placeholder="0" inputClass="no icon" />
								<Input
									label="Referencia (opcional)"
									placeholder="Ej: ORD-001, VEN-1234"
									inputClass="no icon"
								/>
								<DropdownMenu
									label="Sucursal destino"
									options={[...new Set(data.map((d) => d.sucursal))]}
									defaultValue="Selecciona destino"
								/>
								<Input label="Motivo" placeholder="Describe el motivo..." inputClass="no icon" isTextarea={true} isLastElement={true} />
							</>
						)}
						<div className='col-span-2 flex gap-2 mt-2'>
							<Button
								className={"danger"}
								text={"Cancelar"}
								type="button"
								func={null}
							/>
							<Button
								className={"success"}
								text={"Ajustar Stock"}
								type="submit"
							/>
						</div>
					</form>
				</ModalContainer>
			)}
		</>
	)
}
