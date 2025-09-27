'use client'
import React, { useMemo, useState } from 'react'
import { Button, InfoCard } from '../atoms'
import { BiCategory, BiCategoryAlt, BiSolidCategoryAlt } from 'react-icons/bi'
import { FiArrowRight, FiEdit, FiFile, FiFolder, FiPlus, FiSearch, FiTrash } from 'react-icons/fi'
import { Input } from '../molecules'
import { useActive, useRandomColor } from '@/hooks'

export default function CategoriasOrg() {
	const categories = [
		{
			"id": 1,
			"name": "Herramientas",
			"subcategories": [
				{ "id": 1, "name": "Herramientas Eléctricas", "categoria_id": 1 },
				{ "id": 2, "name": "Herramientas Manuales", "categoria_id": 1 }
			]
		},
		{
			"id": 2,
			"name": "Materiales de Construcción",
			"subcategories": [
				{ "id": 3, "name": "Cemento", "categoria_id": 2 },
				{ "id": 4, "name": "Arena", "categoria_id": 2 },
				{ "id": 5, "name": "Grava", "categoria_id": 2 },
				{ "id": 6, "name": "Yeso", "categoria_id": 2 }
			]
		},
		{
			"id": 3,
			"name": "Pinturas",
			"subcategories": [
				{ "id": 7, "name": "Pintura al Agua", "categoria_id": 3 },
				{ "id": 8, "name": "Pintura al Aceite", "categoria_id": 3 },
				{ "id": 9, "name": "Barnices", "categoria_id": 3 },
				{ "id": 10, "name": "Selladores", "categoria_id": 3 }
			]
		},
		{
			"id": 4,
			"name": "Electricidad",
			"subcategories": [
				{ "id": 11, "name": "Cables", "categoria_id": 4 },
				{ "id": 12, "name": "Interruptores", "categoria_id": 4 },
				{ "id": 13, "name": "Tomas de Corriente", "categoria_id": 4 },
				{ "id": 14, "name": "Focos y Lámparas", "categoria_id": 4 }
			]
		},
		{
			"id": 5,
			"name": "Plomería",
			"subcategories": [
				{ "id": 15, "name": "Tubos PVC", "categoria_id": 5 },
				{ "id": 16, "name": "Llaves de Agua", "categoria_id": 5 },
				{ "id": 17, "name": "Codos y Conexiones", "categoria_id": 5 },
				{ "id": 18, "name": "Grifos", "categoria_id": 5 }
			]
		},
		{
			"id": 6,
			"name": "Jardinería",
			"subcategories": [
				{ "id": 19, "name": "Macetas", "categoria_id": 6 },
				{ "id": 20, "name": "Tierra", "categoria_id": 6 },
				{ "id": 21, "name": "Semillas", "categoria_id": 6 },
				{ "id": 22, "name": "Abonos", "categoria_id": 6 }
			]
		},
		{
			"id": 7,
			"name": "Carpintería",
			"subcategories": [
				{ "id": 23, "name": "Maderas", "categoria_id": 7 },
				{ "id": 24, "name": "Tableros MDF", "categoria_id": 7 },
				{ "id": 25, "name": "Clavos", "categoria_id": 7 },
				{ "id": 26, "name": "Tornillos para Madera", "categoria_id": 7 }
			]
		},
		{
			"id": 8,
			"name": "Ferretería General",
			"subcategories": [
				{ "id": 27, "name": "Tornillos", "categoria_id": 8 },
				{ "id": 28, "name": "Tuercas", "categoria_id": 8 },
				{ "id": 29, "name": "Arandelas", "categoria_id": 8 },
				{ "id": 30, "name": "Clavos", "categoria_id": 8 }
			]
		},
		{
			"id": 9,
			"name": "Seguridad",
			"subcategories": [
				{ "id": 31, "name": "Guantes", "categoria_id": 9 },
				{ "id": 32, "name": "Cascos", "categoria_id": 9 },
				{ "id": 33, "name": "Lentes de Seguridad", "categoria_id": 9 },
				{ "id": 34, "name": "Chalecos Reflectivos", "categoria_id": 9 }
			]
		},
		{
			"id": 10,
			"name": "Adhesivos y Selladores",
			"subcategories": [
				{ "id": 35, "name": "Silicón", "categoria_id": 10 },
				{ "id": 36, "name": "Pegamento de Contacto", "categoria_id": 10 },
				{ "id": 37, "name": "Epóxicos", "categoria_id": 10 },
				{ "id": 38, "name": "Cintas Adhesivas", "categoria_id": 10 }
			]
		},
		{
			"id": 11,
			"name": "Cerrajería",
			"subcategories": [
				{ "id": 39, "name": "Candados", "categoria_id": 11 },
				{ "id": 40, "name": "Cerraduras", "categoria_id": 11 },
				{ "id": 41, "name": "Llaves", "categoria_id": 11 },
				{ "id": 42, "name": "Bisagras", "categoria_id": 11 }
			]
		},
		{
			"id": 12,
			"name": "Iluminación",
			"subcategories": [
				{ "id": 43, "name": "LED", "categoria_id": 12 },
				{ "id": 44, "name": "Focos Ahorro Energético", "categoria_id": 12 },
				{ "id": 45, "name": "Reflectores", "categoria_id": 12 },
				{ "id": 46, "name": "Tubos Fluorescentes", "categoria_id": 12 }
			]
		},
		{
			"id": 13,
			"name": "Baños y Sanitarios",
			"subcategories": [
				{ "id": 47, "name": "Inodoros", "categoria_id": 13 },
				{ "id": 48, "name": "Lavamanos", "categoria_id": 13 },
				{ "id": 49, "name": "Accesorios de Baño", "categoria_id": 13 },
				{ "id": 50, "name": "Duchas", "categoria_id": 13 }
			]
		},
		{
			"id": 14,
			"name": "Cocina y Gas",
			"subcategories": [
				{ "id": 51, "name": "Estufas", "categoria_id": 14 },
				{ "id": 52, "name": "Reguladores de Gas", "categoria_id": 14 },
				{ "id": 53, "name": "Mangueras de Gas", "categoria_id": 14 },
				{ "id": 54, "name": "Encendedores", "categoria_id": 14 }
			]
		},
		{
			"id": 15,
			"name": "Pisos y Revestimientos",
			"subcategories": [
				{ "id": 55, "name": "Cerámica", "categoria_id": 15 },
				{ "id": 56, "name": "Azulejos", "categoria_id": 15 },
				{ "id": 57, "name": "Laminados", "categoria_id": 15 },
				{ "id": 58, "name": "Mosaicos", "categoria_id": 15 }
			]
		},
		{
			"id": 16,
			"name": "Puertas y Ventanas",
			"subcategories": [
				{ "id": 59, "name": "Puertas Metálicas", "categoria_id": 16 },
				{ "id": 60, "name": "Puertas de Madera", "categoria_id": 16 },
				{ "id": 61, "name": "Ventanas de Aluminio", "categoria_id": 16 },
				{ "id": 62, "name": "Vidrios", "categoria_id": 16 }
			]
		},
		{
			"id": 17,
			"name": "Automotriz",
			"subcategories": [
				{ "id": 63, "name": "Baterías", "categoria_id": 17 },
				{ "id": 64, "name": "Aceites", "categoria_id": 17 },
				{ "id": 65, "name": "Filtros", "categoria_id": 17 },
				{ "id": 66, "name": "Accesorios", "categoria_id": 17 }
			]
		},
		{
			"id": 18,
			"name": "Soldadura",
			"subcategories": [
				{ "id": 67, "name": "Máquinas de Soldar", "categoria_id": 18 },
				{ "id": 68, "name": "Electrodos", "categoria_id": 18 },
				{ "id": 69, "name": "Máscaras de Soldadura", "categoria_id": 18 },
				{ "id": 70, "name": "Alambre", "categoria_id": 18 }
			]
		},
		{
			"id": 19,
			"name": "Climatización",
			"subcategories": [
				{ "id": 71, "name": "Ventiladores", "categoria_id": 19 },
				{ "id": 72, "name": "Aires Acondicionados", "categoria_id": 19 },
				{ "id": 73, "name": "Calefactores", "categoria_id": 19 },
				{ "id": 74, "name": "Termómetros", "categoria_id": 19 }
			]
		},
		{
			"id": 20,
			"name": "Pegamentos Industriales",
			"subcategories": [
				{ "id": 75, "name": "Resinas", "categoria_id": 20 },
				{ "id": 76, "name": "Colas Blancas", "categoria_id": 20 },
				{ "id": 77, "name": "Siliconas", "categoria_id": 20 },
				{ "id": 78, "name": "Cintas Doble Cara", "categoria_id": 20 }
			]
		},
		{
			"id": 21,
			"name": "Organización y Almacenaje",
			"subcategories": [
				{ "id": 79, "name": "Cajas de Herramientas", "categoria_id": 21 },
				{ "id": 80, "name": "Estantes", "categoria_id": 21 },
				{ "id": 81, "name": "Gavetas", "categoria_id": 21 },
				{ "id": 82, "name": "Organizadores Plásticos", "categoria_id": 21 }
			]
		},
		{
			"id": 22,
			"name": "Maquinaria Pesada",
			"subcategories": [
				{ "id": 83, "name": "Generadores", "categoria_id": 22 },
				{ "id": 84, "name": "Compresores de Aire", "categoria_id": 22 },
				{ "id": 85, "name": "Bombas de Agua", "categoria_id": 22 },
				{ "id": 86, "name": "Pulidoras Industriales", "categoria_id": 22 }
			]
		},
		{
			"id": 23,
			"name": "Productos Químicos",
			"subcategories": [
				{ "id": 87, "name": "Disolventes", "categoria_id": 23 },
				{ "id": 88, "name": "Desinfectantes", "categoria_id": 23 },
				{ "id": 89, "name": "Lubricantes", "categoria_id": 23 },
				{ "id": 90, "name": "Aceites Industriales", "categoria_id": 23 }
			]
		},
		{
			"id": 24,
			"name": "Accesorios de Decoración",
			"subcategories": [
				{ "id": 91, "name": "Espejos", "categoria_id": 24 },
				{ "id": 92, "name": "Cuadros", "categoria_id": 24 },
				{ "id": 93, "name": "Cortinas", "categoria_id": 24 },
				{ "id": 94, "name": "Accesorios Metálicos", "categoria_id": 24 }
			]
		},
		{
			"id": 25,
			"name": "Muebles Metálicos",
			"subcategories": [
				{ "id": 95, "name": "Estantes Metálicos", "categoria_id": 25 },
				{ "id": 96, "name": "Mesas de Trabajo", "categoria_id": 25 },
				{ "id": 97, "name": "Sillas Metálicas", "categoria_id": 25 },
				{ "id": 98, "name": "Gabinetes", "categoria_id": 25 }
			]
		}
	]


	const [searchTerm, setSearchTerm] = useState("")
	const { toggleActiveItem, isActiveItem } = useActive();

	const searchHandler = categories.filter((category) => {
		const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesSubcategory = category.subcategories.some(subcat =>
			subcat.name.toLowerCase().includes(searchTerm.toLowerCase())
		);
		return matchesSearch || matchesSubcategory;
	})

	const categoryColors = useMemo(() => {
		return categories.map((category) => (
			useRandomColor(category.id)
		))
	}, [])

	return (
		<div className='w-full p-6 flex flex-col gap-4'>
			<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
				<InfoCard
					CardTitle={"Total Categorías"}
					cardValue={"25"}
					cardIcon={<BiCategory className='h-6 w-6 text-primary' />}
					cardIconColor={"primary"}
				/>
				<InfoCard
					CardTitle={"Subcategorías"}
					cardValue={"10"}
					cardIcon={<BiCategoryAlt className='h-6 w-6 text-blue' />}
					cardIconColor={"blue"}
				/>
			</section>
			<section className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
				<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
					<div className='flex flex-col'>
						<h2 className='md:text-2xl font-semibold'>Lista de Categorías</h2>
						<span className='text-sm md:text-medium text-dark/50'>Gestiona las Categorias y Subcategorias de productos</span>
					</div>
					<div className='flex xl:w-[20%] lg:w-[30%] md:w-[40%] sm:w-[50%] w-full md:justify-end'>
						<Button
							className={"primary"}
							text={"Agregar Categoría"}
							icon={<FiPlus className='h-4 w-4' />}
						/>
					</div>
				</div>
				<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-2'>
					<Input
						placeholder={"Buscar categoria..."}
						type={"search"}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
					/>
				</div>
				<div className='w-full border border-dark/20 rounded-lg overflow-x-auto'>
					{categories.length > 0 &&
						searchHandler.map((category, index) => (
							<div key={index}>
								<div
									className='w-full flex border-b border-dark/20 p-4 items-center justify-between gap-1 cursor-pointer'
									onClick={() => toggleActiveItem(index)}
								>
									<div className='flex items-center gap-2'>
										<FiArrowRight className={`h-4 w-4 text-dark/50 ${isActiveItem === index ? 'rotate-90' : ''}`} />
										<div
											className='w-3 h-3 rounded-full'
											style={{ backgroundColor: categoryColors[index] }}
										></div>
										<h2 className='font-semibold'>{category.name}</h2>
									</div>
									<div className='flex flex-col md:flex-row items-center gap-2'>
										<span className='text-dark/50 text-sm'>{(index + 1) * 2} Productos</span>
										<div className='flex'>
											<Button
												className={"none"}
												icon={<FiEdit className='h-4 w-4' />}
											/>
											<Button
												className={"none"}
												icon={<FiTrash className='h-4 w-4' />}
											/>
										</div>
									</div>
								</div>
								{isActive === index && category.subcategories && (
									category.subcategories.map((subcat, subIndex) => (
										<div
											key={subIndex}
											className='w-full flex border-b border-dark/20 py-4 px-6 md:px-15 items-center justify-between gap-1'
										>
											<div className='flex items-center gap-2'>
												<div
													className='w-3 h-3 rounded-full bg-dark/30'
												></div>
												<h2 className='font-semibold'>{subcat.name}</h2>
											</div>
											<div className='flex flex-col md:flex-row items-center gap-2'>
												<span className='text-dark/50 text-sm'>{(subIndex + 1) * 2} Productos</span>
												<div className='flex'>
													<Button
														className={"none"}
														icon={<FiEdit className='h-4 w-4' />}
													/>
													<Button
														className={"none"}
														icon={<FiTrash className='h-4 w-4' />}
													/>
												</div>
											</div>
										</div>
									))
								)}
							</div>
						))
					}
				</div>
			</section>
		</div>
	)
}
