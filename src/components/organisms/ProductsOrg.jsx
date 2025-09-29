"use client"
import React, { useState, useEffect } from 'react'
import { Button, InfoCard, ModalContainer } from '@/components/atoms'
import { FiAlertTriangle, FiBox, FiDelete, FiEdit, FiPlus, FiSearch, FiTrash, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { BsBoxSeam, BsFillBoxFill } from 'react-icons/bs'
import { Card, DropdownMenu, Input } from '../molecules'
import { useActive, useFilter, useIsMobile, useLoadMore } from '@/hooks'

export default function ProductsOrg() {
	const [selectedCategory, setSelectedCategory] = useState('Todas las categorias');
	const [searchTerm, setSearchTerm] = useState('');
	const isMobile = useIsMobile({ breakpoint: 768 });
	const { visibleItems, loadMore } = useLoadMore();
	const { setIsActiveModal, isActiveModal } = useActive();

	// Estado para productos y subcategorías
	const [products, setProducts] = useState([]);
	const [subcategories, setSubcategories] = useState([]);

	// Estado para formulario
	const [form, setForm] = useState({
		id: '',
		codigo: '',
		nombre: '',
		subcategoria: '',
		precio_venta: '',
		cantidad: ''
	});
	const [isEdit, setIsEdit] = useState(false);

	// Cargar productos y subcategorías al montar
	useEffect(() => {
		fetch('/api/productos')
			.then(res => res.json())
			.then(data => setProducts(data));
		fetch('/api/productos?type=subcategorias')
			.then(res => res.json())
			.then(data => setSubcategories(data));
	}, []);

	const filteredProducts = products.filter(product => {
		const categoryMatch =
			selectedCategory === 'Todas las categorias' ||
			product.NOMBRE_SUBCATEGORIA === selectedCategory;
		const matchesSearch =
			product.PRODUCT_NAME?.toLowerCase().includes(searchTerm.toLocaleLowerCase()) ||
			String(product.ID_PRODUCT).toLowerCase().includes(searchTerm.toLocaleLowerCase());
		return categoryMatch && matchesSearch;
	});

	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
					<InfoCard
						CardTitle={"Total Productos"}
						cardValue={products.reduce((acc, prod) => acc + (Number(prod.CANTIDAD) || 0), 0)}
						cardIconColor={"primary"}
						cardIcon={<BsBoxSeam className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
					/>
					<InfoCard
						CardTitle={"Valor total de inventario"}
						cardValue={
								`C$${products.reduce((acc, prod) => acc + ((Number(prod.CANTIDAD) || 0) * (Number(prod.PRECIO) || 0)), 0).toLocaleString()}`
						}
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
								options={['Todas las categorias', ...subcategories.map(sub => sub.NOMBRE_SUBCATEGORIA)]}
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
											<th className='text-center text-dark/50 font-semibold p-2'>Código</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Producto</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Categoría</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Cantidad</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Precio Venta</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filteredProducts.map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2 text-center'>{item.CODIGO_PRODUCTO}</td>
												<td className='p-2 max-w-[180px] truncate text-center'>{item.PRODUCT_NAME}</td>
												<td className='p-2 text-center'>
													<span className='flex items-center justify-center border border-dark/20 p-1 rounded-full text-xs font-medium'>
														{item.NOMBRE_SUBCATEGORIA}
													</span>
												</td>
												<td className='p-2 text-center'>{item.CANTIDAD}</td>
												<td className='p-2 text-center'>C${item.PRECIO}</td>
												<td className='p-2 text-center'>
													<div className='flex gap-2 justify-center'>
														<Button
															className={"none"}
															icon={<FiEdit className='h-4 w-4' />}
															func={() => {
																setForm({
																	id: item.ID_PRODUCT,
																	codigo: item.CODIGO_PRODUCTO,
																	nombre: item.PRODUCT_NAME,
																	subcategoria: item.ID_SUBCATEGORIAS,
																	precio_venta: item.PRECIO,
																	cantidad: item.CANTIDAD
																});
																setIsEdit(true);
																setIsActiveModal(true);
															}}
														/>
														<Button
															className={"none"}
															icon={<FiTrash className='h-4 w-4' />}
															func={async () => {
																await fetch(`/api/productos?id=${item.ID_PRODUCT}`, { method: 'DELETE' });
																fetch('/api/productos')
																	.then(res => res.json())
																	.then(data => setProducts(data));
															}}
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
									filteredProducts.map((item, index) => (
										<div key={index} className='border rounded-lg p-4 flex flex-col gap-2 bg-white items-center text-center'>
											<div className='font-semibold'>{item.PRODUCT_NAME}</div>
											<div className='text-xs text-dark/60'>Código: {item.CODIGO_PRODUCTO}</div>
											<div className='text-xs text-dark/60'>Categoría: {item.NOMBRE_SUBCATEGORIA}</div>
											<div className='text-xs text-dark/60'>Cantidad: {item.CANTIDAD}</div>
											<div className='text-xs text-dark/60'>Precio Venta: C${item.PRECIO}</div>
										</div>
									))
								}
							</div>
						)
					}
					{/* Eliminado paginación y botón Ver Más innecesario */}
				</section>
			</div>
			{
				isActiveModal &&
				<ModalContainer
					modalTitle={"Categorias"}
					modalDescription={"Selecciona categorias y completa la informacion del producto"}
					txtButton={"Agregar Producto"}
					setIsActiveModal={setIsActiveModal}
				>
					<form
						className='w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'
						onSubmit={async (e) => {
							e.preventDefault();
							if (!form.nombre || !form.subcategoria || !form.precio_venta) return;
							if (isEdit) {
								await fetch('/api/productos', {
									method: 'PUT',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify(form)
								});
							} else {
								await fetch('/api/productos', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify(form)
								});
							}
							fetch('/api/productos')
								.then(res => res.json())
								.then(data => setProducts(data));
							setIsActiveModal(false);
							setForm({ id: '', codigo: '', nombre: '', subcategoria: '', precio_venta: '', cantidad: '' });
							setIsEdit(false);
						}}
					>
						<Input
							label={"Codigo del producto"}
							placeholder={"EJ: H0001"}
							type={"text"}
							inputClass={"no icon"}
							value={form.codigo}
							onChange={e => setForm({ ...form, codigo: e.target.value })}
						/>
						<Input
							label={"Nombre del producto"}
							placeholder={"EJ: Martillo de carpintero"}
							type={"text"}
							inputClass={"no icon"}
							value={form.nombre}
							onChange={e => setForm({ ...form, nombre: e.target.value })}
						/>
						<DropdownMenu
							label={"Categoría"}
							options={subcategories.map(sub => ({ value: sub.ID_SUBCATEGORIAS, label: sub.NOMBRE_SUBCATEGORIA }))}
							defaultValue={'Selecciona una categoría'}
							onChange={value => setForm({ ...form, subcategoria: value })}
						/>
						<Input
							label={"Cantidad"}
							placeholder={"EJ: 10"}
							type={"number"}
							inputClass={"no icon"}
							value={form.cantidad}
							onChange={e => setForm({ ...form, cantidad: e.target.value })}
						/>
						<Input
							label={"Precio de venta"}
							placeholder={"EJ: 180"}
							type={"number"}
							inputClass={"no icon"}
							value={form.precio_venta}
							onChange={e => setForm({ ...form, precio_venta: e.target.value })}
						/>
						<div className='col-span-2 flex gap-2 mt-2'>
							<Button
								className={'primary'}
								text={'Agregar Producto'}
								type='submit'
							/>
							<Button
								className={'secondary'}
								text={'Cancelar'}
								func={() => { setIsActiveModal(false); setForm({ id: '', codigo: '', nombre: '', subcategoria: '', precio_venta: '', cantidad: '' }); setIsEdit(false); }}
							/>
						</div>
					</form>
				</ModalContainer>
			}
		</>
	)
}
