"use client"
import React, { useState, useEffect } from 'react'
import { Button, InfoCard, ModalContainer } from '@/components/atoms'
import { FiAlertTriangle, FiBox, FiDelete, FiEdit, FiPlus, FiSearch, FiTrash, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { BsBoxSeam, BsFillBoxFill } from 'react-icons/bs'
import { Card, DropdownMenu, Input } from '../molecules'
import { useActive, useFilter, useIsMobile, useLoadMore, useMessage } from '@/hooks'
import { ProductService } from '@/services'

export default function ProductsOrg() {
	const [selectedCategory, setSelectedCategory] = useState('Todas las categorias');
	const [searchTerm, setSearchTerm] = useState('');
	const isMobile = useIsMobile({ breakpoint: 768 });
	const { visibleItems, loadMore } = useLoadMore();
	const { setIsActiveModal, isActiveModal } = useActive();
	const [products, setProducts] = useState([]);
	const [subcategories, setSubcategories] = useState([]);
	const [form, setForm] = useState({
		id: '',
		codigo: '',
		nombre: '',
		subcategoria: '',
		precio_venta: '',
		cantidad: ''
	});
	const [editMode, setEditMode] = useState(false);
	const [errors, setErrors] = useState({});
	const { message, setMessage } = useMessage();
	const [confirmDelete, setConfirmDelete] = useState(null);

	const validateForm = () => {
		const newErrors = {};
		const required = ['codigo', 'nombre', 'subcategoria', 'precio_venta', 'cantidad'];
		required.map((field) => {
			const value = form[field];
			if (value === null || value === undefined || String(value).trim() === '') {
				newErrors[field] = 'Este campo es requerido';
			}
		});
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) return;
		try {
			if (editMode) {
				await ProductService.editProduct(form);
				setIsActiveModal(false);
			} else {
				await ProductService.createProducts(form);
				setMessage("Producto creado con exito");
			}

			const data = await ProductService.getProducts();
			setProducts(data);
			setForm({ id: '', codigo: '', nombre: '', subcategoria: '', precio_venta: '', cantidad: '' });
			setErrors({});
		} catch (err) {
			console.error('Error saving product:', err);
		}
	}

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const [productsData, subcats] = await Promise.all([
					ProductService.getProducts(),
					ProductService.getSubcategories()
				]);
				setProducts(productsData);
				setSubcategories(subcats);
				console.log(productsData, subcats);
			} catch (error) {
				console.error(error)
			}
		}
		fetchAll();
	}, []);

	const toggleModalType = (action, item = null) => {
		if (action === 'create') {
			setEditMode(false);
			setForm({ id: '', codigo: '', nombre: '', subcategoria: '', precio_venta: '', cantidad: '' });
			setIsActiveModal(true);
			return;
		}

		if (action === 'edit') {
			setForm({
				id: item.ID_PRODUCT,
				codigo: item.CODIGO_PRODUCTO,
				nombre: item.PRODUCT_NAME,
				subcategoria: item.ID_SUBCATEGORIAS,
				precio_venta: item.PRECIO,
				cantidad: item.CANTIDAD
			});
			setEditMode(true);
			setErrors({});
			setIsActiveModal(true);
			return;
		}

		if (action === 'delete') {
			setConfirmDelete({ id: item.ID_PRODUCT, name: item.PRODUCT_NAME })
			setIsActiveModal(true);
			return;
		}
	};

	const handleDelete = async () => {
		try {
			await ProductService.deleteProduct(confirmDelete.id);
			const data = await ProductService.getProducts();
			setProducts(data);
		} catch (err) {
			console.error('Error deleting product:', err);
		}
	}

	const filteredProducts = useFilter({
		data: products.map(p => ({
			...p,
			category: p.NOMBRE_SUBCATEGORIA,
		})),
		searchTerm,
		selectedCategory,
		matcher: (item, term) =>
			item.PRODUCT_NAME.toLowerCase().includes(term.toLowerCase()) ||
			item.CODIGO_PRODUCTO.toLowerCase().includes(term.toLowerCase())
	});

	const handleModalClose = () => {
		setForm({ id: '', codigo: '', nombre: '', subcategoria: '', precio_venta: '', cantidad: '' });
		setErrors({});
		setMessage("");
		setConfirmDelete(null)
		setIsActiveModal(false);
	}

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
								func={() => toggleModalType('create')}
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
											<th className='text-center text-dark/50 font-semibold p-2'>#</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Código</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Producto</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Categoría</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Cantidad</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Precio Venta</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filteredProducts.slice(0, visibleItems).map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2 text-center'>{index + 1}</td>
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
															func={() => toggleModalType('edit', item)}
														/>
														<Button
															className={"none"}
															icon={<FiTrash className='h-4 w-4' />}
															func={() => toggleModalType('delete', item)}
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
									filteredProducts.slice(0, visibleItems).map((item, index) => (
										<Card
											key={index}
											id={item.CODIGO_PRODUCTO}
											productName={item.PRODUCT_NAME}
											category={item.NOMBRE_SUBCATEGORIA}
										>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Cantidad</span>
												<span className='text-lg font-semibold'>{item.CANTIDAD}</span>
											</div>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Cantidad</span>
												<span className='text-lg font-semibold'>{item.PRECIO}</span>
											</div>
											<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
												<Button className={"none"} text={"Editar"} icon={<FiEdit />} func={() => toggleModalType('edit', item)} />
												<Button className={"none"} text={"Eliminar"} icon={<FiTrash />} func={() => toggleModalType('delete', item)} />
											</div>
										</Card>
									))
								}
							</div>
						)
					}
					<div className='w-full flex justify-center items-center'>
						{visibleItems < filteredProducts.length && (
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
					setIsActiveModal={handleModalClose}
					modalTitle={confirmDelete ? "Confirmar borrado" : (editMode ? "Editar Producto" : "Agregar Nuevo Producto")}
					modalDescription={confirmDelete ? `¿Estás seguro que deseas borrar "${confirmDelete?.name}"? Esta acción no se puede deshacer.` : (editMode ? "Modifica los datos y guarda los cambios" : "Rellena el formulario para agregar un nuevo producto")}
				>
					{confirmDelete ? (
						<div className='w-full flex flex-col gap-4'>
							<p className='text-dark/70'>Confirma que quieres eliminar <strong>{confirmDelete.name}</strong>.</p>
							<div className='flex gap-4'>
								<Button className={'danger'} text={'Cancelar'} func={handleModalClose} />
								<Button className={'success'} text={'Eliminar'} func={async () => {
									await handleDelete();
									handleModalClose();
								}} />
							</div>
						</div>
					) : (
						<>
							<form
								className='w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'
								onSubmit={handleSubmit}
							>
								<Input
									label={"Codigo del producto"}
									placeholder={"EJ: H0001"}
									type={"text"}
									inputClass={"no icon"}
									value={form.codigo}
									onChange={e => { setForm({ ...form, codigo: e.target.value }); setErrors(prev => ({ ...prev, codigo: undefined })); }}
									error={errors.codigo}
								/>
								<Input
									label={"Nombre del producto"}
									placeholder={"EJ: Martillo de carpintero"}
									type={"text"}
									inputClass={"no icon"}
									value={form.nombre}
									onChange={e => { setForm({ ...form, nombre: e.target.value }); setErrors(prev => ({ ...prev, nombre: undefined })); }}
									error={errors.nombre}
								/>
								<DropdownMenu
									label={"Categoría"}
									options={subcategories.map(sub => ({ value: sub.ID_SUBCATEGORIAS, label: sub.NOMBRE_SUBCATEGORIA }))}
									defaultValue={'Selecciona una categoría'}
									onChange={value => { setForm({ ...form, subcategoria: value }); setErrors(prev => ({ ...prev, subcategoria: undefined })); }}
									error={errors.subcategoria}
								/>
								<Input
									label={"Cantidad"}
									placeholder={"EJ: 10"}
									type={"number"}
									inputClass={"no icon"}
									value={form.cantidad}
									onChange={e => { setForm({ ...form, cantidad: e.target.value }); setErrors(prev => ({ ...prev, cantidad: undefined })); }}
									error={errors.cantidad}
								/>
								<Input
									label={"Precio de venta"}
									placeholder={"EJ: 180"}
									type={"number"}
									inputClass={"no icon"}
									value={form.precio_venta}
									onChange={e => { setForm({ ...form, precio_venta: e.target.value }); setErrors(prev => ({ ...prev, precio_venta: undefined })); }}
									error={errors.precio_venta}
								/>
								<div className='col-span-2 flex gap-2 mt-2'>
									<Button
										className={'danger'}
										text={'Cancelar'}
										func={() => { setIsActiveModal(false); setForm({ id: '', codigo: '', nombre: '', subcategoria: '', precio_venta: '', cantidad: '' }); setEditMode(false); }}
									/>
									<Button
										className={'success'}
										text={'Agregar Producto'}
										type='submit'
									/>
								</div>
							</form>
							{message && <span className='flex w-full text-success justify-center'>{message}</span>}
						</>
					)}

				</ModalContainer>
			}
		</>
	)
}
