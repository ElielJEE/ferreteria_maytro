'use client'
import React, { useEffect, useState } from 'react'
import { Card, DropdownMenu, Input } from '../molecules'
import { FiCheck, FiDollarSign, FiFile, FiGlobe, FiList, FiPlus, FiSearch, FiShoppingBag, FiShoppingCart, FiTrash, FiTrash2, FiUser, FiX } from 'react-icons/fi'
import { ProductService, SalesService, StockService, AuthService, CustomerService, SucursalesService } from '@/services';
import { useActive, useFilter, useIsMobile } from '@/hooks';
import { Button, ModalContainer } from '../atoms';
import { BsCalculator, BsCashCoin } from 'react-icons/bs';

export default function PuntoVentaOrg() {
	const [products, setProducts] = useState([]);
	const [subcategories, setSubcategories] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [productList, setProductList] = useState([]);
	const { setIsActiveModal, isActiveModal } = useActive();
	const [mode, setMode] = useState('venta');
	const [montoCordobas, setMontoCordobas] = useState("");
	const [montoDolares, setMontoDolares] = useState("");
	const [cambio, setCambio] = useState(0);
	const [error, setError] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [clienteNombre, setClienteNombre] = useState('');
	const [clienteTelefono, setClienteTelefono] = useState('');
	const [processing, setProcessing] = useState(false);
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const [clientes, setClientes] = useState({});
	const [clienteFiltrados, setClienteFiltrados] = useState({});
	const [isAdmin, setIsAdmin] = useState();
	const [sucursales, setSucursales] = useState([]);
	// Admin-only: sucursal seleccionada (objeto { label, value }) o null para "Todas"
	const [selectedSucursal, setSelectedSucursal] = useState(null);

	useEffect(() => {
		const getCurrentUser = async () => {
			const res = await AuthService.getCurrentUser();
			const admin = !res?.ID_SUCURSAL;
			setIsAdmin(admin);
		}
		getCurrentUser();
	}, []);

	// Cargar usuario al montar y cuando se procese una venta (para refrescar datos de usuario si cambian)
	useEffect(() => {
		const fetchUser = async () => {
			const user = await AuthService.getCurrentUser();
			setCurrentUser(user);
		};
		fetchUser();
	}, [processing]);

	// Cargar catálogo según sucursal efectiva (usuario o selección admin)
	useEffect(() => {
		const fetchCatalog = async () => {
			try {
				// Determinar sucursal a consultar:
				// - Si el usuario tiene sucursal asignada => usar su nombre (compatibilidad)
				// - Si es admin y seleccionó una sucursal => usar su ID (value)
				// - En otro caso => 'Todas'
				const sucursalParam = currentUser?.ID_SUCURSAL
					? (currentUser?.SUCURSAL_NOMBRE || currentUser?.ID_SUCURSAL)
					: (selectedSucursal?.value || 'Todas');

				const { success, resumen } = await StockService.getResumen(sucursalParam);
				const rows = success ? (resumen || []) : [];
				const normalized = rows.map(r => ({
					ID_PRODUCT: r.ID_PRODUCT,
					CODIGO_PRODUCTO: r.CODIGO_PRODUCTO,
					PRODUCT_NAME: r.PRODUCT_NAME,
					PRECIO: Number(r.PRECIO_UNIT || r.PRECIO || 0),
					CANTIDAD: Number(r.STOCK_SUCURSAL || 0),
					ID_SUBCATEGORIAS: r.ID_SUBCATEGORIAS,
					NOMBRE_SUBCATEGORIA: r.SUBCATEGORY,
					NOMBRE_SUCURSAL: r.NOMBRE_SUCURSAL,
				}));
				setProducts(normalized);
				const subcats = Array.from(new Set(normalized.map(n => n.NOMBRE_SUBCATEGORIA).filter(Boolean)))
					.map((name, idx) => ({ ID_SUBCATEGORIAS: `sub-${idx}`, NOMBRE_SUBCATEGORIA: name }));
				setSubcategories(subcats);
			} catch (error) {
				console.error('Error cargando catálogo:', error);
			}
		};
		// Evitar llamada si aún no tenemos user (primera carga); se llamará tras setCurrentUser
		if (currentUser !== undefined) {
			fetchCatalog();
		}
	}, [currentUser, selectedSucursal]);

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
		// No permitir agregar si no hay stock en sucursal
		if (!product || Number(product.CANTIDAD || 0) <= 0) {
			setError('Producto sin stock en la sucursal');
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

	const toggleModalType = (type) => {
		if (type === 'venta') {
			setMode(type);
			setIsActiveModal(true);

		} else if (type === 'cotizacion') {
			setMode(type);
			setIsActiveModal(true);

		} else if (type === 'credito') {
			setMode(type);
			setIsActiveModal(true);

		} else if (type === 'confirmar venta') {
			setMode(type);
			setIsActiveModal(false);
			handleSubmitVenta();
		}
	};

	const handleConfirmarVenta = (e) => {
		e.preventDefault();

		// Validar sucursal para admin o usuario:
		// - Usuario con sucursal: OK
		// - Admin: debe seleccionar una sucursal específica (no 'Todas')
		if (!currentUser?.ID_SUCURSAL) {
			if (!selectedSucursal || selectedSucursal?.value === 'Todas') {
				setError('Seleccione una sucursal para procesar la venta.');
				return;
			}
		}

		const totalRecibido = parseFloat(montoCordobas || 0) + (parseFloat(montoDolares || 0) * 36.55);

		if (totalRecibido < total) {
			setError("Monto no válido: el monto recibido es menor al total de la compra.");
			return;
		}

		toggleModalType('confirmar venta');
	};


	const calcularCambio = (totalCompra, montoCordobas = 0, montoDolares = 0, tasaCambio = 36.55) => {
		if (montoCordobas + (montoDolares * tasaCambio) < totalCompra) {
			return 0;
		} else {
			const montoTotalCordobas = montoCordobas + (montoDolares * tasaCambio);
			const cambio = montoTotalCordobas - totalCompra;
			return parseFloat(cambio.toFixed(2));
		}
	};

	useEffect(() => {
		const cambioCalculado = calcularCambio(
			total,
			parseFloat(montoCordobas || 0),
			parseFloat(montoDolares || 0)
		);
		setCambio(cambioCalculado);
	}, [montoCordobas, montoDolares, total]);

	const handleSubmitVenta = async () => {
		try {
			setProcessing(true);
			// Construir payload separado de la UI/form
			const items = productList.map(p => ({
				ID_PRODUCT: p.ID_PRODUCT,
				CODIGO_PRODUCTO: p.CODIGO_PRODUCTO,
				PRODUCT_NAME: p.PRODUCT_NAME,
				PRECIO: Number(p.PRECIO || 0),
				quantity: Number(p.quantity || 0),
			}));
			const payload = {
				items,
				subtotal: Number(subtotal.toFixed(2)),
				descuento: Number(descuento || 0),
				total: Number(total.toFixed(2)),
				pago: {
					cordobas: Number(montoCordobas || 0),
					dolares: Number(montoDolares || 0),
					tasaCambio: 36.55,
				},
				cliente: {
					nombre: clienteNombre,
					telefono: clienteTelefono,
				},
				// Si usuario tiene sucursal se usa; si es admin, usar la sucursal seleccionada
				sucursal_id: currentUser?.ID_SUCURSAL || (selectedSucursal?.value ?? null)
			};

			const res = await SalesService.createSale(payload);
			// Mostrar modal de resultado con cambio
			setMode('confirmar venta');
			setIsActiveModal(true);
			setCambio(res?.cambio ?? cambio);
		} catch (e) {
			console.error('Error procesando venta:', e);
			setError(e?.message || 'Error al procesar la venta');
		} finally {
			setProcessing(false);
		}
	};

	const handleModalClose = () => {
		setMode('');
		setIsActiveModal(false);
		setMontoCordobas("");
		setMontoDolares("");
		setError(null);
	};

	const handleDone = () => {
		setIsActiveModal(false);
		setMode('');
		setMontoCordobas("");
		setMontoDolares("");
		setProductList([]);
		setError(null);
	}

	const [activeTab, setActiveTab] = useState("productos");

	useEffect(() => {
		const fetchClientes = async () => {
			try {
				const clientesData = await CustomerService.getClientes();
				setClientes(clientesData.clientes);
			} catch (error) {
				console.error(error);
			}
		};
		fetchClientes();
	}, []);

	const handleClienteChange = (e) => {
		const value = e.target.value;
		setClienteNombre(value);

		const resultados = clientes.filter(cliente =>
			cliente.nombre.toLowerCase().includes(value.toLowerCase())
		);
		setClienteFiltrados(resultados);

		const clienteExistente = clientes.find(cliente =>
			cliente.nombre.toLowerCase() === value.toLowerCase()
		);
		if (clienteExistente) {
			setClienteTelefono(clienteExistente.telefono);
		} else {
			setClienteTelefono("");
		}
	}

	useEffect(() => {
		const fetchSucursales = async () => {
			const res = await SucursalesService.getSucursales();
			const sucursalesData = res.sucursales;
			setSucursales(sucursalesData || []);
		};
		fetchSucursales();
	}, []);

	// Al cambiar sucursal seleccionada, limpiar el carrito (evita mezclar stock entre sucursales)
	useEffect(() => {
		if (isAdmin) {
			setProductList([]);
		}
	}, [isAdmin, selectedSucursal]);

	return (
		<>
			{isAdmin &&
				<section className='w-full py-4 p-6'>
					<div className='flex flex-col md:flex-row w-full gap-1 md:items-center justify-start border border-dark/20 rounded-lg p-4'>
						<div className='flex gap-1 items-center'>
							<FiGlobe className='h-4 w-4 md:h-5 md:w-5 text-blue' />
							<h3 className='md:text-lg font-semibold'>Sucursal: </h3>
						</div>
						<div className='lg:w-1/3 md:w-1/2'>
							<DropdownMenu
								options={[{ label: 'Todas', value: 'Todas' }, ...sucursales]}
								defaultValue={'Vista general (Todas las sucursales)'}
								onChange={(opt) => {
									if (typeof opt === 'object') {
										setSelectedSucursal(opt);
									} else {
										// opt === 'Todas'
										setSelectedSucursal(null);
									}
								}}
							/>

						</div>
					</div>
				</section>
			}
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
							<h2 className='hidden md:block'>Venta</h2>
						</div>
					</div>
				</section>
			}
			<div className={`w-full ${isAdmin ? 'py-0 px-6' : 'p-6'} grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} items-start gap-4`}>
				<section className={`${isMobile && activeTab === 'productos' ? 'flex' : !isMobile ? 'flex' : 'hidden'} w-full border border-dark/20 rounded-lg p-4 flex-col gap-4 col-span-2`}>
					<div className='flex flex-col'>
						<div className='flex items-center gap-2'>
							<FiSearch className='h-6 w-6 text-dark' />
							<h2 className='md:text-2xl font-semibold'>Catalogo de Productos</h2>
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
									sucursal={item.NOMBRE_SUCURSAL}
									status={Number(item.CANTIDAD || 0) <= 0 && 'Agotado'}
									bgColor={'secondary'}
									price={item.PRECIO}
									stock={item.CANTIDAD}
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
							<FiUser className='h-5 w-5 text-dark' />
							<h2 className='md:text-xl font-semibold'>Informacion del Cliente</h2>
						</div>
						<div className="flex flex-col w-full">
							<div className='relative'>
								<Input
									label={"Nombre"}
									placeholder={"Ingrese nombre del cliente"}
									inputClass={"no icon"}
									value={clienteNombre}
									onChange={handleClienteChange}
								/>
								{clienteFiltrados.length > 0 && clienteNombre !== "" && (
									<ul className='w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10'>
										{clienteFiltrados.map((clientes, index) => (
											<li
												key={index}
												onClick={() => {
													setClienteNombre(clientes.nombre)
													setClienteTelefono(clientes.telefono)
													setClienteFiltrados({})
												}}
												className='px-2 py-1 cursor-pointer hover:bg-primary hover:text-white'
											>
												{clientes.nombre}
											</li>
										))}
									</ul>
								)}
							</div>
							<Input
								label={"Telefono"}
								placeholder={"Ingrese numero de telefono del cliente"}
								inputClass={"no icon"}
								value={clienteTelefono}
								onChange={(e) => setClienteTelefono(e.target.value)}
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
														max={product.CANTIDAD}
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
														${(product.PRECIO * product.quantity).toFixed(2)}
													</span>
													<span className='text-dark/70 text-sm'>
														${product.PRECIO} c/u
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
							<h2 className='md:text-xl font-semibold'>Resumen de Venta</h2>
						</div>
						<div className='flex flex-col gap-2'>
							<div className='flex justify-between'>
								<span className='text-dark/70'>Subtotal:</span>
								<span className='font-semibold'>${subtotal.toFixed(2)}</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-dark/70'>Descuento:</span>
								<span className='font-semibold'>${descuento.toFixed(2)}</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-dark/70'>Total:</span>
								<span className='font-semibold text-primary text-lg'>${total.toFixed(2)}</span>
							</div>
						</div>
						<Button
							className={'success'}
							text={'Procesar Venta'}
							icon={<FiShoppingBag className='h-5 w-5' />}
							func={() => toggleModalType('venta')}
						/>
						<div className='flex gap-2'>
							<Button
								className={'blue'}
								text={'Crear Cotizacion'}
								icon={<FiFile className='h-5 w-5' />}
							/>
							<Button
								className={'danger'}
								text={'Credito'}
								icon={<FiFile className='h-5 w-5' />}
							/>
						</div>
					</div>
				</section>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={handleModalClose}
						modalTitle={mode === 'venta'
							? 'Procesar Venta'
							: (mode === 'cotizacion'
								? 'Crear Cotizacion'
								: (mode === 'Credito'
									? 'Gestionar Credito'
									: 'Cambio Total: C$' + cambio
								)
							)
						}
						modalDescription={mode === 'venta'
							? 'Confirma los detalles de la venta antes de proceder.'
							: (mode === 'cotizacion'
								? 'Genera una cotización para el cliente.'
								: (mode === 'Credito'
									? 'Gestiona el crédito para el cliente.'
									: ''
								)
							)
						}
					>
						{mode === 'venta' ? (
							<form className='flex flex-col gap-4'>
								<Input
									label={"Monto recibido en Cordobas"}
									placeholder={"Ingresar monto recibido en cordobas..."}
									iconInput={<BsCashCoin className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
									value={montoCordobas}
									onChange={(e) => setMontoCordobas(e.target.value)}
								/>
								<Input
									label={"Monto recibido en Dolares"}
									placeholder={"Ingresar monto recibido en dolares..."}
									iconInput={<FiDollarSign className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
									value={montoDolares}
									onChange={(e) => setMontoDolares(e.target.value)}
								/>
								{error && <span className='text-danger text-sm'>{error}</span>}
								<div className='flex gap-4'>
									<Button
										className={'danger'}
										text={"Cancelar"}
										icon={<FiX className='h-5 w-5' />}
										func={handleModalClose}
									/>
									<Button
										className={'success'}
										text={processing ? 'Procesando…' : 'Confirmar Venta'}
										icon={<FiCheck className='h-5 w-5' />}
										func={processing ? undefined : handleConfirmarVenta}
									/>
								</div>
							</form>
						) : (
							<div className='flex mt-2'>
								<Button
									className={'success'}
									text={'Hecho'}
									icon={<FiCheck className='h-5 w-5' />}
									func={handleDone}
								/>
							</div>
						)

						}
					</ModalContainer>
				)
			}
		</>
	)
}
