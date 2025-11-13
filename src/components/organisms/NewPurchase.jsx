'use client'
import React, { useEffect, useState } from 'react'
import { Card, DropdownMenu, Input } from '../molecules'
import { FiCheck, FiDollarSign, FiFile, FiGlobe, FiKey, FiList, FiPlus, FiSearch, FiShoppingBag, FiShoppingCart, FiTrash, FiTrash2, FiTruck, FiUser, FiX } from 'react-icons/fi'
import { ProductService, SalesService, StockService, AuthService, CustomerService, SucursalesService, ProveedorService } from '@/services';
import { useActive, useFilter, useIsMobile } from '@/hooks';
import { Button, ModalContainer } from '../atoms';
import { BsBoxSeam, BsCalculator, BsCashCoin, BsWrench } from 'react-icons/bs';
import { useRouter } from 'next/navigation';

export default function NewPurchase() {
	const [products, setProducts] = useState([]);
	const [product, setProduct] = useState([]);
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
				setProducts(productsData);
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

	const addToProductList = (product) => {
		// Permite agregar un precio de compra si no existe en la base de datos.
		if (Number(product.PRECIO_COMPRA || 0) <= 0 || Number(product.PRECIO_COMPRA || 0) === null) {
			toggleModalType('addPrice', product);
			return;
		}

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
				return [...prevList, { ...product, quantity: 1 }];
			}
		});
	};

	const addPrice = (productData) => {
		setIsActiveModal(true);
		setProduct(productData);
	}

	const updateQuantity = (id, newQuantity) => {
		setProductList((prevList) =>
			prevList.map((item) => {
				if (item.ID_PRODUCT === id) {
					// Validaciones de límites
					if (newQuantity < 1) newQuantity = 1;
					if (newQuantity > item.CANTIDAD) {
						newQuantity = item.CANTIDAD;
					}
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

	const subtotal = productList.reduce((acc, item) => acc + item.PRECIO * item.quantity, 0);
	const descuento = 0; // o podrías usar un estado si más adelante aplicas descuentos
	const total = subtotal - descuento;

	const validateFields = (form) => {
		const newErrors = {};

		// Campos siempre requeridos
		const required = ['nombre', 'telefono', 'fecha'];
		required.forEach((field) => {
			const value = form[field];
			if (value === null || value === undefined || String(value).trim() === '') {
				newErrors[field] = 'Este campo es requerido';
			}
		});

		setError(newErrors);
		return Object.keys(newErrors).length === 0;
	}

	const handleSubmitCompra = async () => {
		const form = {
			nombre: proveedorNombre,
			telefono: proveedorTelefono,
			fecha: fechaEntrega,
		}

		const isValid = validateFields(form)
		if (!isValid) {
			return;
		}

		router.push("/compras");
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
											disabled={Number(item.CANTIDAD || 0) <= 0}
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
							text={'Procesar Orden'}
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
											func={() => addToProductList(product)}
										/>
									</div>
								</form>
								:
								<form className='flex flex-col gap-2 mt-2' onSubmit={(e) => { e.preventDefault() }}>
									<Input
										label={'Precio unitario del producto'}
										placeholder={'Ingresa el precio unitario de la compra...'}
										inputClass={'no icon'}
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
