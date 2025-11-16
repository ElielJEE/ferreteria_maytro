'use client'
import React, { useEffect, useState } from 'react'
import { Card, DropdownMenu, Input } from '../molecules'
import { FiCheck, FiDollarSign, FiFile, FiGlobe, FiKey, FiList, FiPlus, FiSearch, FiShoppingBag, FiShoppingCart, FiTrash, FiTrash2, FiTruck, FiUser, FiX } from 'react-icons/fi'
import { ProductService, SalesService, StockService, AuthService, CustomerService, SucursalesService, ProveedorService, ComprasService } from '@/services';
import { useActive, useFilter, useIsMobile } from '@/hooks';
import { Button, ModalContainer } from '../atoms';
import { BsBoxSeam, BsCalculator, BsCashCoin, BsWrench } from 'react-icons/bs';
import { useRouter } from 'next/navigation';

export default function NewPurchase() {
	const [products, setProducts] = useState([]);
	const [product, setProduct] = useState([]);
	const [precioCompraInput, setPrecioCompraInput] = useState('');
	const [subcategories, setSubcategories] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [productList, setProductList] = useState([]);
	const [error, setError] = useState(null);
	const [proveedorNombre, setProveedorNombre] = useState('');
	const [proveedorTelefono, setProveedorTelefono] = useState('');
	const [fechaEntrega, setFechaEntrega] = useState('');
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const [proveedores, setProveedores] = useState({});
	const [proveedoresFiltrados, setProveedoresFiltrados] = useState({});
	const router = useRouter();
	const { isActiveModal, setIsActiveModal } = useActive();
	const [mode, setMode] = useState('');

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const [productsData, subcats] = await Promise.all([
					ProductService.getProducts(),
					ProductService.getSubcategories()
				]);
				// Normalizar precio de compra exclusivamente desde la columna PRECIO_COMPRA
				const normalized = (productsData || []).map(p => ({
					...p,
					PRECIO_COMPRA: Number(p?.PRECIO_COMPRA ?? 0) || 0
				}));
				setProducts(normalized);
				setSubcategories(subcats);
			} catch (error) {
				console.error(error)
			}
		}
		fetchAll();
	}, []);

	const filteredProducts = useFilter({
		data: products.map(p => ({
			...p,
			category: p.NOMBRE_SUBCATEGORIA,
		})),
		searchTerm,
		matcher: (item, term) =>
			item.PRODUCT_NAME.toLowerCase().includes(term.toLowerCase()) ||
			item.CODIGO_PRODUCTO.toLowerCase().includes(term.toLowerCase()) ||
			item.NOMBRE_SUBCATEGORIA.toLowerCase().includes(term.toLowerCase())
	});

	const addToProductList = async (product) => {
		// Antes de abrir modal, recargar el producto desde la API para garantizar que PRECIO_COMPRA venga de la BD
		try {
			const all = await ProductService.getProducts();
			const normalizedAll = (all || []).map(p => ({ ...p, PRECIO_COMPRA: Number(p?.PRECIO_COMPRA ?? 0) || 0 }));
			// actualizar cache local de productos
			setProducts(normalizedAll);
			const prodFresh = normalizedAll.find(p => String(p.ID_PRODUCT) === String(product.ID_PRODUCT));
			const precioActual = Number(prodFresh?.PRECIO_COMPRA ?? 0) || 0;

			if (precioActual <= 0) {
				// abrir modal para pedir precio de compra
				toggleModalType('addPrice', product);
				return;
			}

			// normalize product object to always include PRECIO_COMPRA so UI and payload use it
			const productNormalized = { ...product, PRECIO_COMPRA: precioActual };

			setProductList((prevList) => {
				const existingProduct = prevList.find((item) => item.ID_PRODUCT === productNormalized.ID_PRODUCT);

				if (existingProduct) {
					const newQuantity = existingProduct.quantity + 1;
					return prevList.map((item) =>
						item.ID_PRODUCT === productNormalized.ID_PRODUCT
							? { ...item, quantity: newQuantity }
							: item
					);
				} else {
					return [...prevList, { ...productNormalized, quantity: 1 }];
				}
			});
		} catch (e) {
			console.error('Error verificando producto antes de agregar', e);
			// fallback: abrir modal para evitar añadir con precio desconocido
			addPrice(product);
		}
	};

	const addPrice = (productData) => {
		setIsActiveModal(true);
		setProduct(productData);
		// initialize modal input with current precio if exists
		setPrecioCompraInput(productData && productData.PRECIO_COMPRA ? String(productData.PRECIO_COMPRA) : '');
	}

	const updateQuantity = (id, newQuantity) => {
		setProductList((prevList) =>
			prevList.map((item) => {
				if (item.ID_PRODUCT === id) {
					// Validaciones de límites
					if (newQuantity < 1) newQuantity = 1;
					return { ...item, quantity: newQuantity };
				}
				return item;
			})
		);
	};

	const removeFromProductList = (id) => {
		setProductList((prevList) =>
			prevList.filter((item) => item.ID_PRODUCT !== id)
		);
	};

	const subtotal = productList.reduce((acc, item) => {
		const unit = Number(item?.PRECIO_COMPRA ?? 0);
		return acc + unit * (Number(item.quantity) || 0);
	}, 0);
	const descuento = 0; // o podrías usar un estado si más adelante aplicas descuentos
	const total = subtotal - descuento;

	const validateFields = (form) => {
		const newErrors = {};

		// Campos siempre requeridos: nombre, telefono y fecha estimada de entrega
		const required = ['nombre', 'telefono', 'fecha'];
		required.forEach((field) => {
			const value = form[field];
			if (value === null || value === undefined || String(value).trim() === '') {
				newErrors[field] = 'Este campo es requerido';
			}
		});
		// Validar formato YYYY-MM-DD para fecha (input type=date lo entrega así)
		if (form.fecha) {
			const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
			if (!isoDatePattern.test(form.fecha)) {
				newErrors.fecha = 'Formato de fecha inválido';
			}
		}

		setError(newErrors);
		return Object.keys(newErrors).length === 0;
	}

	const handleSubmitCompra = async () => {
		// La fecha estimada de entrega ahora es obligatoria: no sustituir por hoy
		const form = {
			nombre: proveedorNombre,
			telefono: proveedorTelefono,
			fecha: fechaEntrega,
		}

		const isValid = validateFields(form)
		if (!isValid) {
			console.debug('Validación de compra falló', error);
			return;
		}

		if (!productList || productList.length === 0) {
			setError(prev => ({ ...prev, lista: 'La lista de productos está vacía' }));
			return;
		}

		try {
			// intentar obtener usuario actual para enviar usuarioId
			const current = await AuthService.getCurrentUser();
			// obtener id del usuario (aceptar varias formas: ID o id)
			const usuarioId = current ? (current.ID ?? current.id ?? null) : null;
			// si el usuario tiene sucursal registrada, enviarla también (variantes posibles)
			const usuarioSucursal = current ? (current.ID_SUCURSAL ?? current.id_sucursal ?? current.ID_SUCURSAL ?? null) : null;

			const items = productList.map(p => ({
				ID_PRODUCT: p.ID_PRODUCT,
				quantity: p.quantity,
				PRECIO_COMPRA: Number(p?.PRECIO_COMPRA ?? 0) || 0
			}));

			const payload = {
				proveedorNombre: proveedorNombre || null,
				proveedorTelefono: proveedorTelefono || null,
				usuarioId: usuarioId,
				id_sucursal: usuarioSucursal,
				fecha_pedido: new Date().toISOString().slice(0, 10),
				fecha_entrega: fechaEntrega, // obligatorio en backend también
				total: total,
				items
			};

			console.debug('Enviando compra payload:', payload);
			const res = await ComprasService.createCompra(payload);
			console.debug('Respuesta createCompra:', res);
			// si se creó correctamente, limpiar y navegar
			setProductList([]);
			router.push('/compras');
		} catch (err) {
			console.error('Error procesando compra', err);
			setError(prev => ({ ...prev, submit: err?.message || 'Error al crear compra' }));
		}
	};

	const [activeTab, setActiveTab] = useState("productos");

	useEffect(() => {
		const fetchProveedores = async () => {
			try {
				const proveedoresData = await ProveedorService.getProveedores();
				setProveedores(proveedoresData.proveedores);
			} catch (error) {
				console.error(error);
			}
		};
		fetchProveedores();
	}, []);

	const handleProveedoresChange = (e) => {
		const value = e.target.value;
		setProveedorNombre(value);

		setError(prev => ({ ...prev, nombre: '' }))

		const resultados = proveedores.filter(proveedor =>
			proveedor.nombre.toLowerCase().includes(value.toLowerCase())
		);
		setProveedoresFiltrados(resultados);

		const proveedorExiste = proveedores.find(proveedor =>
			proveedor.nombre.toLowerCase() === value.toLowerCase()
		);
		if (proveedorExiste) {
			setProveedorTelefono(proveedorExiste.telefono);
		} else {
			setProveedorTelefono("");
		}
	}

	const toggleModalType = (type, productData) => {
		setMode(type);

		if (type === 'addPrice') {
			addPrice(productData)

		} else if (type === 'modifyPrice') {
			setProduct(productData)
			// initialize modal input with current precio_compra for modification
			setPrecioCompraInput(productData && (productData.PRECIO_COMPRA ?? productData.precio_compra) ? String(productData.PRECIO_COMPRA ?? productData.precio_compra) : '')
			setIsActiveModal(true)
		}
	}

	return (
		<>
			{isMobile &&
				<section className='w-full flex justify-center'>
					<div className='grid grid-cols-2 p-1 h-10 bg-dark/10 rounded-sm text-dark/50 font-semibold w-1/2'>
						<div
							className={`flex gap-2 items-center justify-center cursor-pointer rounded-sm ${activeTab === "productos" ? "bg-light text-dark" : ""
								}`}
							onClick={() => setActiveTab("productos")}
						>
							<FiList />
							<h2 className='hidden md:block'>Productos</h2>
						</div>
						<div
							className={`flex gap-2 items-center justify-center cursor-pointer rounded-sm ${activeTab === "venta" ? "bg-light text-dark" : ""
								}`}
							onClick={() => setActiveTab("venta")}
						>
							<FiShoppingBag />
							<h2 className='hidden md:block'>Compra</h2>
						</div>
					</div>
				</section>
			}
			<div className={`w-full p-6 grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} items-start gap-4`}>
				<section className={`${isMobile && activeTab === 'productos' ? 'flex' : !isMobile ? 'flex' : 'hidden'} w-full border border-dark/20 rounded-lg p-4 flex-col gap-4 col-span-2`}>
					<div className='flex flex-col'>
						<div className='flex items-center gap-2'>
							<BsBoxSeam className='h-6 w-6 text-dark' />
							<h2 className='md:text-2xl font-semibold'>Agregar Productos</h2>
						</div>
						<span className='text-sm md:text-medium text-dark/50'>Busca productos por nombre, codigo o categoria</span>
						<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-2'>
							<Input
								placeholder={"Buscar producto..."}
								type={"search"}
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
							/>
						</div>
					</div>
					<div className={`grid sm:grid-cols-2 grid-cols-1 gap-2 ${isMobile ? 'max-h-[calc(100vh-320px)]' : 'max-h-[calc(100vh-280px)]'} overflow-y-scroll`}>
						{
							filteredProducts.map((item, index) => (
								<Card
									key={index}
									productName={item.PRODUCT_NAME}
									id={"Codigo: " + item.CODIGO_PRODUCTO}
									category={item.NOMBRE_SUBCATEGORIA}
									bgColor={'secondary'}
								>
									<div className='w-full col-span-2'>
										<Button
											className={'primary'}
											text={'Agregar'}
											icon={<FiPlus className='h-4 w-4' />}
											func={(e) => addToProductList(item)}
										/>
									</div>
								</Card>
							))
						}
					</div>
				</section>
				<section className={`${isMobile && activeTab === 'venta' ? 'flex' : !isMobile ? 'flex' : 'hidden'} w-full flex-col gap-4 max-h-[calc(100vh-130px)] overflow-y-auto`}>
					<div className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
						<div className='flex items-center gap-2'>
							<FiTruck className='h-5 w-5 text-dark' />
							<h2 className='md:text-xl font-semibold'>Informacion del Proveedor</h2>
						</div>
						<div className="flex flex-col w-full">
							<div className='relative'>
								<Input
									label={"Nombre"}
									placeholder={"Ingrese nombre del Proveedor"}
									inputClass={"no icon"}
									value={proveedorNombre}
									onChange={handleProveedoresChange}
									error={error && error.nombre}
								/>
								{proveedoresFiltrados.length > 0 && proveedorNombre !== "" && (
									<ul className='w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10'>
										{proveedoresFiltrados.map((proveedores, index) => (
											<li
												key={index}
												onClick={() => {
													setProveedorNombre(proveedores.nombre)
													setProveedorTelefono(proveedores.telefono)
													setProveedoresFiltrados({})
												}}
												className='px-2 py-1 cursor-pointer hover:bg-primary hover:text-white'
											>
												{proveedores.nombre}
											</li>
										))}
									</ul>
								)}
							</div>
							<Input
								label={"Telefono"}
								placeholder={"Ingrese numero de telefono del Proveedor"}
								inputClass={"no icon"}
								value={proveedorTelefono}
								onChange={(e) => {
									setProveedorTelefono(e.target.value)
									setError(prev => ({ ...prev, telefono: '' }))
								}}
								error={error && error.telefono}
							/>
							<Input
								label={'Fecha Estimada de Entrega'}
								type={'date'}
								inputClass={'no icon'}
								value={fechaEntrega}
								onChange={(e) => {
									setFechaEntrega(e.target.value)
									setError(prev => ({ ...prev, fecha: '' }))
								}}
								error={error && error.fecha}
							/>
						</div>
					</div>
					<div className='w-full border max-h-[297px] border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
						<div className='flex items-center gap-2'>
							<FiShoppingCart className='h-5 w-5 text-dark' />
							<h2 className='md:text-xl font-semibold'>Lista de compras ({productList.length})</h2>
						</div>
						<div className='flex flex-col max-h-[300px] gap-2 overflow-y-auto'>
							{!productList.length
								? <span className="text-dark/70 text-medium w-full text-center">No hay productos en la lista</span>
								: (
									productList.map((product, index) => (
										<div
											key={index}
											className='w-full flex items-center justify-between border rounded-lg border-dark/20 p-2'
										>
											<div className='flex flex-col'>
												<span className='font-semibold'>{product.PRODUCT_NAME}</span>
												<span className='text-sm text-dark/70'>
													Código: {product.CODIGO_PRODUCTO}
												</span>
												<div className='flex items-center gap-2 mt-1'>
													<input
														type='number'
														min='1'
														value={product.quantity}
														onChange={(e) =>
															updateQuantity(product.ID_PRODUCT, parseInt(e.target.value) || 1)
														}
														className='w-16 text-center border border-dark/20 rounded-md p-1'
													/>
												</div>
											</div>

											<div className='flex flex-col items-end gap-2'>
												<Button
													className={'noneTwo'}
													text={''}
													icon={<FiTrash2 className='h-5 w-5 text-danger' />}
													func={() => removeFromProductList(product.ID_PRODUCT)}
												/>
												<div className='flex flex-col items-end'>
													<span className='font-semibold text-primary text-lg'>
														${(product.PRECIO_COMPRA * product.quantity).toFixed(2)}
													</span>
													<span className='text-dark/70 text-sm flex gap-2 items-center'>
														<Button
															icon={<BsWrench />}
															className={'none'}
															func={() => toggleModalType('modifyPrice', product)}
														/>
														${product.PRECIO_COMPRA} c/u
													</span>
												</div>
											</div>
										</div>
									))
								)
							}
						</div>
					</div>
					<div className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
						<div className='flex items-center gap-2'>
							<BsCalculator className='h-5 w-5 text-dark' />
							<h2 className='md:text-xl font-semibold'>Resumen de Compra</h2>
						</div>
						<div className='flex flex-col gap-2'>
							<div className='flex justify-between'>
								<span className='text-dark/70'>Total:</span>
								<span className='font-semibold text-primary text-lg'>${total.toFixed(2)}</span>
							</div>
						</div>
						<Button
							className={'success'}
							text={'Crear Orden'}
							icon={<FiShoppingBag className='h-5 w-5' />}
							func={() => handleSubmitCompra()}
						/>
					</div>
				</section>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={mode === 'addPrice' ? `Agregar precio a "${product.PRODUCT_NAME}"` : `Modificar precio a "${product.PRODUCT_NAME}"`}
						modalDescription={mode === 'addPrice' ? 'Agrega el precio unitario de la compra para este producto. Solo la primera vez.' : 'Modifica el precio unitario de la compra para este producto. El anterior sera actualizado.'}
						isForm={true}
					>
						{
							mode === 'addPrice' ?
								<form className='flex flex-col gap-2 mt-2' onSubmit={(e) => { e.preventDefault() }}>
									<Input
										label={'Precio unitario del producto'}
										placeholder={'Ingresa el precio unitario de la compra...'}
										inputClass={'no icon'}
										value={precioCompraInput}
										onChange={(e) => setPrecioCompraInput(e.target.value)}
									/>
									<div className='flex gap-2'>
										<Button
											text={'Cancelar'}
											className={'secondary'}
											func={() => setIsActiveModal(false)}
										/>
										<Button
											text={'Agregar'}
											className={'success'}
											func={async () => {
												// Si hay precio ingresado, guardarlo en la tabla productos antes de agregar
												const parsed = parseFloat(precioCompraInput);
												if (!isNaN(parsed) && parsed > 0) {
													try {
														await ProductService.editProduct({ id: product.ID_PRODUCT, precio_compra: parsed });
														// actualizar estado local de products y product para que no vuelva a pedir precio
														setProducts(prev => prev.map(p => p.ID_PRODUCT === product.ID_PRODUCT ? { ...p, PRECIO_COMPRA: parsed } : p));
														setProduct(prev => ({ ...prev, PRECIO_COMPRA: parsed }));
														setIsActiveModal(false);
														// ahora agregar a la lista
														setProductList((prevList) => {
															const existingProduct = prevList.find(
																(item) => item.ID_PRODUCT === product.ID_PRODUCT
															);
															if (existingProduct) {
																const newQuantity = existingProduct.quantity + 1;
																if (newQuantity > product.CANTIDAD) {
																	return prevList;
																}
																return prevList.map((item) =>
																	item.ID_PRODUCT === product.ID_PRODUCT
																		? { ...item, quantity: newQuantity }
																		: item
																);
															} else {
																return [...prevList, { ...product, quantity: 1, PRECIO_COMPRA: parsed }];
															}
														});
													} catch (e) {
														console.error('Error guardando precio de compra', e);
														// Mantener modal abierto para reintento
														return;
													}
												} else {
													// No se ingresó precio válido: simplemente cerrar modal sin guardar ni agregar
													setIsActiveModal(false);
												}
											}}
										/>
									</div>
								</form>

								:
								<form className='flex flex-col gap-2 mt-2' onSubmit={(e) => { e.preventDefault() }}>
									<Input
										label={'Precio unitario del producto'}
										placeholder={'Ingresa el precio unitario de la compra...'}
										inputClass={'no icon'}
										value={precioCompraInput}
										onChange={(e) => setPrecioCompraInput(e.target.value)}
									/>
									<div className='flex gap-2'>
										<Button
											text={'Cancelar'}
											className={'secondary'}
											func={() => setIsActiveModal(false)}
										/>
										<Button
											text={'Agregar'}
											className={'success'}
											func={async () => {
												const parsed = parseFloat(precioCompraInput);
												if (!isNaN(parsed) && parsed > 0) {
													try {
														// Persist change
														await ProductService.editProduct({ id: product.ID_PRODUCT, precio_compra: parsed });
														// REFRESH: fetch fresh products from API to avoid stale/shared-reference objects
														const fresh = await ProductService.getProducts();
														const normalizedFresh = (fresh || []).map(p => ({ ...p, PRECIO_COMPRA: Number(p?.PRECIO_COMPRA ?? 0) || 0 }));
														setProducts(normalizedFresh);
														const updatedProduct = normalizedFresh.find(p => String(p.ID_PRODUCT) === String(product.ID_PRODUCT));
														if (updatedProduct) setProduct(updatedProduct);
														// update productList entries (if present) using the fresh value
														setProductList(prevList => prevList.map(item => item.ID_PRODUCT === product.ID_PRODUCT ? { ...item, PRECIO_COMPRA: Number(updatedProduct?.PRECIO_COMPRA ?? parsed) } : item));
														setIsActiveModal(false);
													} catch (e) {
														console.error('Error actualizando precio de compra', e);
														return;
													}
												} else {
													// invalid input: keep modal open for correction
													return;
												}
											}}
										/>
									</div>
								</form>
						}
					</ModalContainer>
				)
			}
		</>
	)
}
