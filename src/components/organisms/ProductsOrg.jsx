"use client"
import React, { useState } from 'react'
import { Button, InfoCard, ModalContainer } from '@/components/atoms'
import { FiAlertTriangle, FiBox, FiDelete, FiEdit, FiPlus, FiSearch, FiTrash, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { BsBoxSeam, BsFillBoxFill } from 'react-icons/bs'
import { Card, DropdownMenu, Input } from '../molecules'
import { useActive, useIsMobile, useLoadMore } from '@/hooks'

export default function ProductsOrg() {
	const tools = [
		{ id: "H0001", name: "Martillo de carpintero", category: "Herramientas manuales", stock: 35, purchasePrice: 120, salePrice: 180 },
		{ id: "H0002", name: "Destornillador plano", category: "Herramientas manuales", stock: 60, purchasePrice: 50, salePrice: 80 },
		{ id: "H0003", name: "Destornillador de estrella", category: "Herramientas manuales", stock: 72, purchasePrice: 55, salePrice: 90 },
		{ id: "H0004", name: "Llave inglesa", category: "Herramientas manuales", stock: 22, purchasePrice: 140, salePrice: 210 },
		{ id: "H0005", name: "Llave Allen (juego)", category: "Herramientas manuales", stock: 48, purchasePrice: 90, salePrice: 130 },
		{ id: "H0006", name: "Alicates universales", category: "Herramientas manuales", stock: 50, purchasePrice: 110, salePrice: 170 },
		{ id: "H0007", name: "Pinza de corte", category: "Herramientas manuales", stock: 37, purchasePrice: 95, salePrice: 140 },
		{ id: "H0008", name: "Tenaza", category: "Herramientas manuales", stock: 28, purchasePrice: 100, salePrice: 150 },
		{ id: "H0009", name: "Sierra manual", category: "Herramientas manuales", stock: 41, purchasePrice: 130, salePrice: 190 },
		{ id: "H0010", name: "Cinta métrica", category: "Herramientas manuales", stock: 85, purchasePrice: 45, salePrice: 70 },
		{ id: "H0011", name: "Nivel de burbuja", category: "Herramientas manuales", stock: 32, purchasePrice: 90, salePrice: 135 },
		{ id: "H0012", name: "Escuadra metálica", category: "Herramientas manuales", stock: 26, purchasePrice: 80, salePrice: 120 },
		{ id: "H0013", name: "Cúter profesional", category: "Herramientas manuales", stock: 54, purchasePrice: 60, salePrice: 95 },
		{ id: "H0014", name: "Brocha para pintura", category: "Materiales", stock: 100, purchasePrice: 25, salePrice: 40 },
		{ id: "H0015", name: "Rodillo para pintura", category: "Materiales", stock: 75, purchasePrice: 50, salePrice: 75 },
		{ id: "H0016", name: "Taladro eléctrico", category: "Herramientas eléctricas", stock: 18, purchasePrice: 950, salePrice: 1200 },
		{ id: "H0017", name: "Amoladora angular", category: "Herramientas eléctricas", stock: 12, purchasePrice: 870, salePrice: 1150 },
		{ id: "H0018", name: "Sierra circular", category: "Herramientas eléctricas", stock: 15, purchasePrice: 1100, salePrice: 1450 },
		{ id: "H0019", name: "Lijadora orbital", category: "Herramientas eléctricas", stock: 20, purchasePrice: 750, salePrice: 1000 },
		{ id: "H0020", name: "Pulidora eléctrica", category: "Herramientas eléctricas", stock: 10, purchasePrice: 980, salePrice: 1300 },
		{ id: "H0021", name: "Soldador eléctrico", category: "Herramientas eléctricas", stock: 8, purchasePrice: 1200, salePrice: 1600 },
		{ id: "H0022", name: "Compresor de aire", category: "Herramientas eléctricas", stock: 6, purchasePrice: 2500, salePrice: 3200 },
		{ id: "H0023", name: "Clavadora neumática", category: "Herramientas eléctricas", stock: 11, purchasePrice: 1350, salePrice: 1750 },
		{ id: "H0024", name: "Pistola de calor", category: "Herramientas eléctricas", stock: 14, purchasePrice: 500, salePrice: 700 },
		{ id: "H0025", name: "Pistola de silicón", category: "Materiales", stock: 55, purchasePrice: 80, salePrice: 120 },
		{ id: "H0026", name: "Llave para tubo", category: "Plomería", stock: 30, purchasePrice: 200, salePrice: 300 },
		{ id: "H0027", name: "Cortatubos", category: "Plomería", stock: 25, purchasePrice: 180, salePrice: 260 },
		{ id: "H0028", name: "Desatascador", category: "Plomería", stock: 40, purchasePrice: 70, salePrice: 100 },
		{ id: "H0029", name: "Soplete de fontanero", category: "Plomería", stock: 9, purchasePrice: 650, salePrice: 900 },
		{ id: "H0030", name: "Juego de juntas", category: "Plomería", stock: 50, purchasePrice: 40, salePrice: 60 },
		{ id: "H0031", name: "Llave de lavabo", category: "Plomería", stock: 18, purchasePrice: 210, salePrice: 300 },
		{ id: "H0032", name: "Alicate de presión", category: "Plomería", stock: 20, purchasePrice: 150, salePrice: 220 },
		{ id: "H0033", name: "Manguera reforzada", category: "Plomería", stock: 45, purchasePrice: 90, salePrice: 140 },
		{ id: "H0034", name: "Cinta de teflón", category: "Plomería", stock: 120, purchasePrice: 20, salePrice: 35 },
		{ id: "H0035", name: "Carretilla", category: "Jardinería", stock: 12, purchasePrice: 550, salePrice: 800 },
		{ id: "H0036", name: "Tijeras de podar", category: "Jardinería", stock: 38, purchasePrice: 120, salePrice: 180 },
		{ id: "H0037", name: "Machete de acero", category: "Jardinería", stock: 42, purchasePrice: 160, salePrice: 240 },
		{ id: "H0038", name: "Azadón", category: "Jardinería", stock: 26, purchasePrice: 180, salePrice: 270 },
		{ id: "H0039", name: "Rastrillo metálico", category: "Jardinería", stock: 30, purchasePrice: 140, salePrice: 210 },
		{ id: "H0040", name: "Pala cuadrada", category: "Jardinería", stock: 22, purchasePrice: 200, salePrice: 280 },
		{ id: "H0041", name: "Pala redonda", category: "Jardinería", stock: 20, purchasePrice: 210, salePrice: 290 },
		{ id: "H0042", name: "Regadera metálica", category: "Jardinería", stock: 15, purchasePrice: 160, salePrice: 230 },
		{ id: "H0043", name: "Guantes de jardín", category: "Jardinería", stock: 60, purchasePrice: 40, salePrice: 70 },
		{ id: "H0044", name: "Aspersor de césped", category: "Jardinería", stock: 18, purchasePrice: 120, salePrice: 180 },
		{ id: "H0045", name: "Motosierra", category: "Herramientas eléctricas", stock: 9, purchasePrice: 1600, salePrice: 2200 },
		{ id: "H0046", name: "Sierra sable", category: "Herramientas eléctricas", stock: 7, purchasePrice: 1350, salePrice: 1800 },
		{ id: "H0047", name: "Multiherramienta rotativa", category: "Herramientas eléctricas", stock: 15, purchasePrice: 800, salePrice: 1100 },
		{ id: "H0048", name: "Lámpara de trabajo LED", category: "Herramientas eléctricas", stock: 19, purchasePrice: 300, salePrice: 450 },
		{ id: "H0049", name: "Generador portátil", category: "Herramientas eléctricas", stock: 4, purchasePrice: 3500, salePrice: 4500 },
		{ id: "H0050", name: "Cargador de baterías", category: "Herramientas eléctricas", stock: 0, purchasePrice: 700, salePrice: 950 },
	]

	const isMobile = useIsMobile({ breakpoint: 768 });

	const { visibleItems, loadMore } = useLoadMore();

	const [selectedCategory, setSelectedCategory] = useState('Todas las categorias');
	const [selectedStatus, setSelectedStatus] = useState('Todos los estados');
	const [searchTerm, setSearchTerm] = useState('');

	const filteredTools = tools.filter(tool => {
		const categoryMatch =
			selectedCategory === 'Todas las categorias' ||
			tool.category === selectedCategory;

		const stockStatus =
			tool.stock === 0
				? "Agotados"
				: tool.stock >= 15
					? "En stock"
					: "Bajo stock";

		const statusMatch =
			selectedStatus === 'Todos los estados' ||
			stockStatus === selectedStatus;

		const matchesSearch =
			tool.name.toLowerCase().includes(searchTerm.toLocaleLowerCase()) ||
			tool.id.toLowerCase().includes(searchTerm.toLocaleLowerCase());

		return categoryMatch && statusMatch && matchesSearch;
	});

	const { setIsActiveModal, isActiveModal } = useActive();

	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
					<InfoCard
						CardTitle={"Total Productos"}
						cardValue={"1,250"}
						cardIconColor={"primary"}
						cardIcon={<BsBoxSeam className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
					/>
					<InfoCard
						CardTitle={"valor total de inventario"}
						cardValue={"$75,000"}
						cardIconColor={"success"}
						cardIcon={<FiTrendingUp className='h-4 w-4 md:h-6 md:w-6 text-success' />}
					/>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
						<div className='flex flex-col'>
							<h2 className='md:text-2xl font-semibold'>Lista de productos</h2>
							<span className='text-sm md:text-medium text-dark/50'>Gestiona y administra tu inventario</span>
						</div>
						<div className='flex xl:w-[20%] lg:w-[30%] md:w-[40%] sm:w-[50%] w-full md:justify-end'>
							<Button
								className={"primary"}
								text={"Agregar Producto"}
								icon={<FiPlus className='h-4 w-4' />}
								func={() => setIsActiveModal(true)}
							/>
						</div>
					</div>
					<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-4'>
						<Input
							placeholder={"Buscar producto..."}
							type={"search"}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
						/>
						<div className='md:w-1/4 w-full flex gap-2 flex-col md:flex-row'>
							<DropdownMenu
								options={tools.map(tool => tool.category).filter((value, index, self) => self.indexOf(value) === index).concat(['Todas las categorias'])}
								defaultValue={'Todas las categorias'}
								onChange={(value) => setSelectedCategory(value)}
							/>
						</div>
					</div>
					{!isMobile ?
						(
							<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
								<table className='w-full border-collapse'>
									<thead className=' w-full border-b border-dark/20'>
										<tr className='w-full'>
											<th className='text-start text-dark/50 font-semibold p-2'>Codigo</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Producto</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Categoria</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Precio Compra</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Precio Venta</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filteredTools.slice(0, visibleItems).map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2'>{item.id}</td>
												<td className='p-2 max-w-[180px] truncate'>{item.name}</td>
												<td className='p-2'>
													<span className='flex items-center justify-center border border-dark/20 p-1 rounded-full text-xs font-medium'>
														{item.category}
													</span>
												</td>
												<td className='p-2'>C${item.purchasePrice}</td>
												<td className='p-2'>C${item.salePrice}</td>
												<td className='p-2'>
													<div className='flex gap-2'>
														<Button
															className={"none"}
															icon={<FiEdit className='h-4 w-4' />}
														/>
														<Button
															className={"none"}
															icon={<FiTrash className='h-4 w-4' />}
														/>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='w-full overflow-x-auto mt-2 flex flex-col gap-2'>
								{
									filteredTools.slice(0, visibleItems).map((item, index) => (
										<Card
											key={index}
											productName={item.name}
											id={item.id}
											category={item.category}
										>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Precio Venta</span>
												<span className='text-lg font-semibold'>C${item.salePrice}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Precio Compra</span>
												<span className='text-lg font-semibold'>C${item.purchasePrice}</span>
											</div>
										</Card>
									))
								}
							</div>
						)
					}
					<div className='w-full flex justify-center items-center'>
						{visibleItems < filteredTools.length && (
							<div className='w-full mt-4 md:w-1/4'>
								<Button
									className={"transparent"}
									text={"Ver Mas"}
									func={loadMore}
								/>
							</div>
						)}
					</div>
				</section>
			</div>
			{
				isActiveModal &&
				<ModalContainer
					modalTitle={"Agregar Nuevo Producto"}
					modalDescription={"Completa la informacion del producto"}
					txtButton={"Agregar Producto"}
					setIsActiveModal={setIsActiveModal}
				>
					<form className='w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
						<Input
							label={"Codigo del producto"}
							placeholder={"EJ: H0001"}
							type={"text"}
							inputClass={"no icon"}
						/>
						<Input
							label={"Nombre del producto"}
							placeholder={"EJ: Martillo de carpintero"}
							type={"text"}
							inputClass={"no icon"}
						/>
						<DropdownMenu
							label={"Categoria"}
							options={tools.map(tool => tool.category).filter((value, index, self) => self.indexOf(value) === index)}
							defaultValue={'Selecciona una categoria'}
						/>
						<Input
							label={"precio de compra"}
							placeholder={"EJ: 120"}
							type={"number"}
							inputClass={"no icon"}
						/>
						<Input
							label={"precio de venta"}
							placeholder={"EJ: 180"}
							type={"number"}
							inputClass={"no icon"}
						/>
					</form>
				</ModalContainer>
			}
		</>
	)
}
