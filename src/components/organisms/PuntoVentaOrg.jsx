'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Card, DropdownMenu, Input } from '../molecules'
import { FiArrowLeftCircle, FiArrowRight, FiCheck, FiCornerUpLeft, FiDollarSign, FiFile, FiGlobe, FiList, FiPlus, FiRotateCcw, FiSearch, FiShoppingBag, FiShoppingCart, FiTrash, FiTrash2, FiUser, FiX, FiXCircle } from 'react-icons/fi'
import { ProductService, SalesService, StockService, AuthService, CustomerService, SucursalesService, CotizacionesService, DescuentoService, CreditosService } from '@/services';
import { useActive, useFilter, useIsMobile } from '@/hooks';
import { Button, ModalContainer } from '../atoms';
import { BsCalculator, BsCashCoin, BsKey, BsRulers, BsScrewdriver, BsWrench } from 'react-icons/bs';
import { useRouter } from 'next/navigation';
import { imprimirVoucher } from '@/utils/imprimirVoucher';

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
	const [tasaCambio, setTasaCambio] = useState(36.55);
	const [error, setError] = useState({
		nombre: '',
		telefono: '',
		fecha: '',
		general: '',
	});
	const [currentUser, setCurrentUser] = useState(null);
	const [clienteNombre, setClienteNombre] = useState('');
	const [clienteTelefono, setClienteTelefono] = useState('');
	const [processing, setProcessing] = useState(false);
	const [savingQuote, setSavingQuote] = useState(false);
	// Unidad modal: opciones y producto objetivo
	const [unitOptions, setUnitOptions] = useState([]);
	const [unitProduct, setUnitProduct] = useState(null);
	const [customPriceProduct, setCustomPriceProduct] = useState(null);
	const [customPriceInput, setCustomPriceInput] = useState('');
	const [selectedUnitOption, setSelectedUnitOption] = useState(null);
	const [fechaVencimiento, setFechaVencimiento] = useState('');
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const [clientes, setClientes] = useState([]);
	const [clienteFiltrados, setClienteFiltrados] = useState([]);
	const [isAdmin, setIsAdmin] = useState();
	const [sucursales, setSucursales] = useState([]);
	// Admin-only: sucursal seleccionada (objeto { label, value }) o null para "Todas"
	const [selectedSucursal, setSelectedSucursal] = useState(null);
	const [descuentos, setDescuentos] = useState([])
	const [selectedDiscountOpt, setSelectedDiscountOpt] = useState([]);
	const [appliedDiscount, setAppliedDiscount] = useState(null);
	const [transportation, setTransportation] = useState(0);

	// Re-enabled discounts: fetch from service
	const ENABLE_DISCOUNTS = true;
	const router = useRouter();
	console.log(selectedDiscountOpt);

	useEffect(() => {
		if (!ENABLE_DISCOUNTS) {
			setDescuentos([]);
			return;
		}
		const fetchDescuentos = async () => {
			const descuentosData = await DescuentoService.getDescuentos();
			const onlyActiveDiscounts = descuentosData.filter(discount => discount.ESTADO === 'Activo');
			console.log(onlyActiveDiscounts);
			setDescuentos(onlyActiveDiscounts);
		}
		fetchDescuentos();
	}, [])

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

	// Cargar tasa de cambio actual
	useEffect(() => {
		const loadTasa = async () => {
			try {
				const res = await fetch('/api/tasa-cambio', { cache: 'no-store' });
				const data = await res.json();
				if (res.ok && data?.tasa) setTasaCambio(Number(data.tasa));
			} catch { }
		};
		loadTasa();
	}, []);

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
					CANTIDAD: Number(r.stock_sucursal || 0),
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

	const normalizeUnitOptions = React.useCallback((unidades) => {
		return (Array.isArray(unidades) ? unidades : []).map(u => {
			const value = u.UNIDAD_ID ?? u.unidad_id ?? u.ID_UNIDAD ?? u.id ?? u.value ?? null;
			return {
				label: u.NOMBRE || u.nombre || (value !== null ? String(value) : 'Unidad'),
				value,
				precio: u.PRECIO ?? u.precio ?? u.precio_unit ?? null,
				cantidad_por_unidad: Number(u.CANTIDAD_POR_UNIDAD ?? u.cantidad_por_unidad ?? 1) || 1
			};
		});
	}, []);

	const showUnitModal = React.useCallback((product, options, preselect = null) => {
		if (!Array.isArray(options) || options.length === 0) {
			setError(prev => ({ ...(prev || {}), general: 'No hay unidades disponibles para este producto.' }));
			return;
		}
		setUnitProduct(product);
		setUnitOptions(options);
		setSelectedUnitOption(preselect);
		setMode('unit');
		setIsActiveModal(true);
	}, [setError, setIsActiveModal]);

	const addToProductList = async (product) => {
		// No permitir agregar si no hay stock en sucursal
		if (!product || Number(product.CANTIDAD || 0) <= 0) {
			setError(prev => ({ ...(prev || {}), general: 'Producto sin stock en la sucursal' }));
			return;
		}
		const existingProduct = productList.find(item => item.ID_PRODUCT === product.ID_PRODUCT);
		if (existingProduct) {
			setProductList((prevList) => prevList.map((item) => {
				if (item.ID_PRODUCT === product.ID_PRODUCT) {
					const newQuantity = item.quantity + 1;
					if (newQuantity > product.CANTIDAD) {
						return item;
					}
					return { ...item, quantity: newQuantity };
				}
				return item;
			}));
			return;
		}

		let unitOptions = [];
		try {
			const unidades = await ProductService.getProductUnits(product.ID_PRODUCT);
			unitOptions = normalizeUnitOptions(unidades);
		} catch (fetchErr) {
			console.error('Error obteniendo unidades del producto:', fetchErr);
		}

		const productEntry = { ...product, quantity: 1 };
		if (unitOptions.length === 1) {
			const single = unitOptions[0];
			productEntry.unit = single.label;
			productEntry.unit_id = single.value;
			productEntry.cantidad_por_unidad = single.cantidad_por_unidad ?? 1;
			if (single.precio !== undefined && single.precio !== null) {
				const parsedPrice = Number(single.precio);
				if (!Number.isNaN(parsedPrice) && parsedPrice > 0) {
					productEntry.PRECIO = parsedPrice;
				}
			}
			setProductList(prevList => [...prevList, productEntry]);
			return;
		}

		setProductList(prevList => [...prevList, productEntry]);
		if (unitOptions.length > 1) {
			showUnitModal(productEntry, unitOptions, null);
		}
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
	const discountAmount = React.useMemo(() => {
		if (!appliedDiscount) return 0;
		const pct = Number(appliedDiscount?.VALOR_PORCENTAJE ?? appliedDiscount?.valor_porcentaje ?? 0) || 0;
		return Number(((subtotal * pct) / 100).toFixed(2));
	}, [appliedDiscount, subtotal]);
	const descuento = Number(discountAmount || 0);
	const transporte = Number(transportation || 0);
	const total = Number((subtotal - descuento + transporte).toFixed(2));

	const toggleModalType = async (type, product = null) => {
		setMode(type);
		console.log('toggleModalType ->', type, 'product?', !!product, 'productListLen', productList.length);
		// Abrir modal de unidad -> cargar unidades del producto si se pasa
		if (type === 'unit' && product) {
			try {
				const unidades = await ProductService.getProductUnits(product.ID_PRODUCT);
				const opts = normalizeUnitOptions(unidades);
				const existing = opts.find(o => o.label === product.unit || o.value === product.unit_id);
				showUnitModal(product, opts, existing || null);
			} catch (e) {
				console.error('Error cargando unidades del producto:', e);
				setError(prev => ({ ...(prev || {}), general: 'No se pudieron cargar las unidades de este producto, intenta nuevamente.' }));
			}
			return;
		}

		// Ensure credito modal always opens (fix for no-op when clicking Credito)
		if (type === 'credito') {
			// Si es admin, debe seleccionar una sucursal específica para crédito
			if (!currentUser?.ID_SUCURSAL && (!selectedSucursal || selectedSucursal?.value === 'Todas')) {
				setMode('credito');
				setIsActiveModal(true);
				setError(prev => ({ ...(prev || {}), general: 'Seleccione una sucursal para crear un crédito.' }));
				return;
			}
			setIsActiveModal(true);
			return;
		}

		// Casos previos sin carga extra
		if (type === 'venta' && productList.length > 0) {
			setIsActiveModal(true);

		} else if (type === 'cotizacion' && productList.length > 0) {
			handleCotizacion();

		} else if (type === 'credito' && productList.length > 0) {
			setIsActiveModal(true);

		} else if (type === 'confirmar venta' && productList.length > 0) {
			setIsActiveModal(false);
			handleSubmitVenta();

		} else if (type === 'price') {
			// open custom price modal for a specific product
			setCustomPriceProduct(product || null);
			setCustomPriceInput(product ? String((product.PRECIO !== undefined ? product.PRECIO : product.PRECIO) || '') : '');
			setIsActiveModal(true);

		} else if (type === 'credito') {
			setIsActiveModal(true);

		} else if (type === 'discount') {
			setIsActiveModal(true);

		} else if (type === 'transportation') {
			setIsActiveModal(true)

		} else {
			setMode('error');
			setIsActiveModal(true)
		}
	};

	const handleConfirmarVenta = (e) => {
		e.preventDefault();

		// Validar sucursal para admin o usuario:
		// - Usuario con sucursal: OK
		// - Admin: debe seleccionar una sucursal específica (no 'Todas')
		if (!currentUser?.ID_SUCURSAL) {
			if (!selectedSucursal || selectedSucursal?.value === 'Todas') {
				setError({ general: 'Seleccione una sucursal para procesar la venta.' });
				return;
			}
		}

		const totalRecibido = parseFloat(montoCordobas || 0) + (parseFloat(montoDolares || 0) * 36.55);

		if (totalRecibido < total) {
			setError({ general: "Monto no válido: el monto recibido es menor al total de la compra." });
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
			parseFloat(montoDolares || 0),
			tasaCambio
		);
		setCambio(cambioCalculado);
	}, [montoCordobas, montoDolares, total, tasaCambio]);

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
				unit_id: p.unit_id ?? p.UNIDAD_ID ?? null,
				unit_name: p.unit ?? p.UNIDAD_NOMBRE ?? null,
				cantidad_por_unidad: Number(p.cantidad_por_unidad ?? p.CANTIDAD_POR_UNIDAD ?? 1) || 1
			}));
			const payload = {
				items,
				subtotal: Number(subtotal.toFixed(2)),
				descuento: Number(descuento || 0),
				total: Number(total.toFixed(2)),
				servicio_transporte: Number(transportation || 0),
				// Información del descuento aplicado (si existe)
				discount: appliedDiscount ? {
					id: appliedDiscount.ID_DESCUENTO || appliedDiscount.id || appliedDiscount.value || null,
					nombre: appliedDiscount.NOMBRE_DESCUENTO || appliedDiscount.nombre_descuento || null,
					percent: Number(appliedDiscount.VALOR_PORCENTAJE ?? appliedDiscount.valor_porcentaje ?? 0) || 0,
					amount: Number(descuento || 0)
				} : null,
				pago: {
					cordobas: Number(montoCordobas || 0),
					dolares: Number(montoDolares || 0),
					tasaCambio: Number(tasaCambio || 36.55),
				},
				cliente: {
					nombre: clienteNombre,
					telefono: clienteTelefono,
				},
				// Si usuario tiene sucursal se usa; si es admin, usar la sucursal seleccionada
				sucursal_id: currentUser?.ID_SUCURSAL || (selectedSucursal?.value ?? null)
			};

			const res = await SalesService.createSale(payload);
			console.log(res);
			console.log(payload);

			const dataParaVoucher = {
				numero: res.numero,
				facturaId: res.facturaId,
				total: res.total,
				cambio: res.cambio,
				items: payload.items,
			};

			console.log(dataParaVoucher);

			await imprimirVoucher(res);

			setMode('confirmar venta');
			setIsActiveModal(true);
			setCambio(res?.cambio ?? cambio);
		} catch (e) {
			console.error('Error procesando venta:', e);
			setError({ general: e?.message || 'Error al procesar la venta' });
		} finally {
			setProcessing(false);
		}
	};

	const handleModalClose = () => {
		setMode('');
		setIsActiveModal(false);
		setMontoCordobas("");
		setMontoDolares("");
		setError({
			nombre: '',
			telefono: '',
			fecha: '',
			general: '',
		});
		// limpiar estado de unidad
		setUnitOptions([]);
		setUnitProduct(null);
		setSelectedUnitOption(null);
		// limpiar estado de precio personalizado
		setCustomPriceProduct(null);
		setCustomPriceInput('');
	};

	const handleDone = () => {
		setIsActiveModal(false);
		setMode('');
		setMontoCordobas("");
		setMontoDolares("");
		setProductList([]);
		setError({
			nombre: '',
			telefono: '',
			fecha: '',
			general: '',
		});
		setAppliedDiscount(null);
		setSelectedDiscountOpt([]);
		// limpiar custom price state
		setCustomPriceProduct(null);
		setCustomPriceInput('');
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

		setError(prev => ({ ...prev, nombre: '' }))

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

	useEffect(() => {
		if (isAdmin === undefined) return;
		if (!Array.isArray(sucursales) || sucursales.length === 0) {
			setSelectedSucursal(null);
			return;
		}
		if (!isAdmin) {
			setSelectedSucursal(null);
			return;
		}
		if (sucursales.length === 1) {
			setSelectedSucursal(prev => prev ?? sucursales[0]);
			return;
		}
		setSelectedSucursal(prev => {
			if (!prev) return null;
			const stillExists = sucursales.some(opt => opt?.value === prev?.value);
			return stillExists ? prev : null;
		});
	}, [isAdmin, sucursales]);

	const sucursalDropdownDefault = useMemo(() => {
		if (selectedSucursal?.label) return selectedSucursal.label;
		if (Array.isArray(sucursales) && sucursales.length === 1) {
			return sucursales[0]?.label || 'Selecciona una sucursal';
		}
		return 'Selecciona una sucursal';
	}, [selectedSucursal, sucursales]);

	const validateFields = (form) => {
		const newErrors = {};

		// Campos siempre requeridos
		const required = ['nombre', 'telefono'];
		required.forEach((field) => {
			const value = form[field];
			if (value === null || value === undefined || String(value).trim() === '') {
				newErrors[field] = 'Este campo es requerido';
			}
		});

		setError(newErrors);
		return Object.keys(newErrors).length === 0;
	}

	const handleCotizacion = () => {
		const form = {
			nombre: clienteNombre,
			telefono: clienteTelefono,
		}

		const isValid = validateFields(form)
		if (!isValid) {
			return;
		} else {
			setIsActiveModal(true);
		}
	}

	const confirmCotizacion = async () => {
		if (savingQuote) return;
		// Validaciones mínimas
		const errs = {};
		if (!clienteNombre?.trim()) errs.nombre = 'Este campo es requerido';
		if (!clienteTelefono?.trim()) errs.telefono = 'Este campo es requerido';
		if (!fechaVencimiento) errs.fecha = 'Este campo es requerido';
		if (!productList?.length) errs.general = 'Agrega al menos un producto';
		setError(prev => ({ ...(prev || {}), ...errs }));
		if (Object.keys(errs).length) return;

		// Construir payload para /api/cotizaciones
		const items = productList.map(p => ({
			ID_PRODUCT: p.ID_PRODUCT,
			cantidad: Number(p.quantity || 0),
			PRECIO: Number(p.PRECIO || 0),
			unit_id: p.unit_id ?? p.UNIDAD_ID ?? null,
			unit_name: p.unit ?? p.UNIDAD_NOMBRE ?? null,
			cantidad_por_unidad: Number(p.cantidad_por_unidad ?? p.CANTIDAD_POR_UNIDAD ?? 1) || 1
		}));

		const payload = {
			items,
			subtotal: Number(subtotal.toFixed(2)),
			descuento: Number(descuento || 0),
			transporte: Number(transportation || 0),
			total: Number(total.toFixed(2)),
			cliente: { nombre: clienteNombre, telefono: clienteTelefono },
			fecha_vencimiento: fechaVencimiento,
			// Ayuda a resolver sucursal en el backend (opcional)
			sucursal_id: currentUser?.ID_SUCURSAL || (selectedSucursal?.value ?? null),
		};

		try {
			setSavingQuote(true);
			const res = await CotizacionesService.createQuote(payload);
			setSavingQuote(false);
			if (!res?.success) {
				setError(prev => ({ ...(prev || {}), general: res?.message || 'No se pudo crear la cotización' }));
				return;
			}
			// Éxito
			setIsActiveModal(false);
			router.push('/venta/cotizaciones');
		} catch (e) {
			setSavingQuote(false);
			setError(prev => ({ ...(prev || {}), general: e?.message || 'Error al crear la cotización' }));
		}
	}
	// Al cambiar sucursal seleccionada, limpiar el carrito (evita mezclar stock entre sucursales)
	useEffect(() => {
		if (isAdmin) {
			setProductList([]);
		}
	}, [isAdmin, selectedSucursal]);

	const handleUnitSubmit = () => {
		if (unitProduct && selectedUnitOption) {
			setProductList((prev) => prev.map(p => {
				if (p.ID_PRODUCT === unitProduct.ID_PRODUCT) {
					const updated = {
						...p,
						unit: selectedUnitOption.label,
						unit_id: selectedUnitOption.value,
						cantidad_por_unidad: selectedUnitOption.cantidad_por_unidad ?? 1
					};
					// Si la unidad tiene precio asociado, actualizar PRECIO
					if (selectedUnitOption.precio !== undefined && selectedUnitOption.precio !== null) {
						updated.PRECIO = Number(selectedUnitOption.precio) || updated.PRECIO;
					}
					return updated;
				}
				return p;
			}));
		}
		// cerrar modal y limpiar estado de unidad
		setIsActiveModal(false);
		setUnitProduct(null);
		setUnitOptions([]);
		setSelectedUnitOption(null);
	}

	const handleCustomPrice = () => {
		try {
			const parsed = parseFloat(customPriceInput);
			if (isNaN(parsed) || parsed <= 0) {
				// invalid input, keep modal open for correction
				return;
			}
			// update only the current sale's line price (do NOT persist to DB)
			setProductList(prev => prev.map(item => {
				if (!customPriceProduct) return item;
				if (item.ID_PRODUCT === customPriceProduct.ID_PRODUCT) {
					return { ...item, PRECIO: Number(parsed) };
				}
				return item;
			}));
			setIsActiveModal(false);
			setCustomPriceProduct(null);
			setCustomPriceInput('');
		} catch (e) {
			console.error('Error setting custom price', e);
		}
	}

	const confirmCredito = async () => {
		if (processing) return;
		// Validaciones mínimas
		const errs = {};
		if (!clienteNombre?.trim()) errs.nombre = 'Este campo es requerido';
		if (!clienteTelefono?.trim()) errs.telefono = 'Este campo es requerido';
		if (!productList?.length) errs.general = 'Agrega al menos un producto';
		// Validar sucursal cuando es admin
		if (!currentUser?.ID_SUCURSAL && (!selectedSucursal || selectedSucursal?.value === 'Todas')) {
			errs.general = 'Seleccione una sucursal para crear un crédito.';
		}
		setError(prev => ({ ...(prev || {}), ...errs }));
		if (Object.keys(errs).length) return;

		setProcessing(true);
		try {
			console.log('confirmCredito: payload building... productListLen:', productList.length, 'total', total);
			const items = productList.map(p => ({
				ID_PRODUCT: p.ID_PRODUCT,
				cantidad: Number(p.quantity || 0),
				PRECIO: Number(p.PRECIO || 0),
				unit_id: p.unit_id ?? p.UNIDAD_ID ?? null,
				unit_name: p.unit ?? p.UNIDAD_NOMBRE ?? null,
				cantidad_por_unidad: Number(p.cantidad_por_unidad ?? p.CANTIDAD_POR_UNIDAD ?? 1) || 1
			}));

			const payload = {
				items,
				subtotal: Number(subtotal.toFixed(2)),
				descuento: Number(descuento || 0),
				transporte: Number(transportation || 0),
				total: Number(total.toFixed(2)),
				cliente: { nombre: clienteNombre, telefono: clienteTelefono },
				sucursal_id: currentUser?.ID_SUCURSAL || (selectedSucursal?.value ?? null),
			};

			console.log('confirmCredito: calling CreditosService.createCredit');
			const res = await CreditosService.createCredit(payload);
			console.log('confirmCredito: response', res);
			if (!res || !res.success) {
				setError(prev => ({ ...(prev || {}), general: res?.message || 'No se pudo crear el crédito' }));
				setProcessing(false);
				return;
			}
			// éxito: limpiar y redirigir al listado de créditos
			setProductList([]);
			setIsActiveModal(false);
			router.push('/clientes/creditos');
		} catch (e) {
			console.error('Error creando crédito:', e);
			setError(prev => ({ ...(prev || {}), general: e?.message || 'Error al crear el crédito' }));
		} finally {
			setProcessing(false);
		}
	}

	const handelApplyDiscount = () => {
		// Aplicar el descuento seleccionado al resumen de la venta
		if (selectedDiscountOpt && Object.keys(selectedDiscountOpt).length) {
			setAppliedDiscount(selectedDiscountOpt);
		}
		setIsActiveModal(false)
	}

	const handleTransportation = () => {
		// Normalize transportation value and close modal
		const parsed = Number(transportation || 0);
		if (isNaN(parsed)) {
			setTransportation(0);
		} else {
			setTransportation(parsed);
		}
		setIsActiveModal(false);
		setMode('');
	}

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
								defaultValue={sucursalDropdownDefault}
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
						<div className="flex flex-col w-full gap-2">
							<div className='relative'>
								<Input
									label={"Nombre"}
									placeholder={"Ingrese nombre del cliente"}
									inputClass={"no icon"}
									value={clienteNombre}
									onChange={handleClienteChange}
									error={error && error.nombre}
								/>
								{clienteFiltrados.length > 0 && clienteNombre !== "" && (
									<ul className='w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10'>
										{clienteFiltrados.map((clientes, index) => (
											<li
												key={index}
												onClick={() => {
													setClienteNombre(clientes.nombre)
													setClienteTelefono(clientes.telefono)
													setClienteFiltrados([])
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
								onChange={(e) => {
									setClienteTelefono(e.target.value)
									setError(prev => ({ ...prev, telefono: '' }))
								}}
								error={error && error.telefono}
							/>
							{ENABLE_DISCOUNTS && (
								<Button
									text={'Aplicar Descuento'}
									className={'blue'}
									func={() => toggleModalType('discount')}
								/>
							)}
							<Button
								text={"Servicio de Trasporte"}
								className={'dark'}
								func={() => toggleModalType('transportation')}
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
													<span className='text-dark/70 text-sm flex gap-2'>
														<Button
															icon={<BsRulers />}
															className={'noneTwo'}
															func={() => toggleModalType('unit', product)}
														/>
														<Button
															icon={<BsWrench />}
															className={'noneTwo'}
															func={() => toggleModalType('price', product)}
														/>
														${product.PRECIO} {product.unit || 'c/u'}
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
								<div className='flex gap-1'>
									{appliedDiscount && (
										<Button
											icon={<FiXCircle />}
											iconRight={<FiArrowRight />}
											className={'noneTwo'}
											func={() => { setAppliedDiscount(null); setSelectedDiscountOpt([]); }}
										/>
									)}
									<span className='font-semibold'>${descuento.toFixed(2)}</span>
								</div>
							</div>
							<div className='flex justify-between'>

								<span className='text-dark/70'>Transporte:</span>
								<div className='flex gap-1'>
									{transportation > 0 && (
										<Button
											icon={<FiXCircle />}
											iconRight={<FiArrowRight />}
											className={'noneTwo'}
											func={() => { setTransportation(0); }}
										/>
									)}
									<span className='font-semibold'>${transportation.toFixed(2)}</span>
								</div>
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
								func={() => toggleModalType('cotizacion')}
							/>
							<Button
								className={'danger'}
								text={'Credito'}
								icon={<FiFile className='h-5 w-5' />}
								func={() => toggleModalType('credito')}
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
									: (mode === 'error'
										? 'Lista de productos vacia'
										: (mode === 'unit'
											? ''
											: (mode === 'price'
												? ''
												: (mode === 'credito'
													? 'Confirmar esta venta como Credito'
													: (mode === 'discount'
														? 'Aplicar un descuento'
														: (mode === 'transportation'
															? ''
															: 'Cambio Total: C$' + cambio
														)
													)
												)
											)
										)
									)
								)
							)
						}
						modalDescription={mode === 'venta'
							? 'Confirma los detalles de la venta antes de proceder.'
							: (mode === 'cotizacion'
								? ('Genera una cotización para el cliente ingresando la fecha de espera \npara procesar la venta.')
								: (mode === 'Credito'
									? 'Gestiona el crédito para el cliente.'
									: (mode === 'error'
										? 'Agrega al menos un producto a la lista para realiar una venta.'
										: (mode === 'credito'
											? '¿Esta seguro que desea crear un credito apartir de esta venta?'
											: (mode === 'discount'
												? 'Aplica un descuento a esta venta'
												: ''
											)
										)
									)
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
								{error.general && <span className='text-danger text-sm'>{error.general}</span>}
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
						) : mode === 'cotizacion' ? (
							<div className='flex flex-col gap-2'>
								<Input
									label={'Fecha Valida Hasta:'}
									type={'date'}
									inputClass={'no icon'}
									value={fechaVencimiento}
									onChange={(e) => {
										setFechaVencimiento(e.target.value);
										setError(prev => ({ ...(prev || {}), fecha: '' }));
									}}
									error={error && error.fecha}
								/>
								{error?.general && <span className='text-danger text-sm'>{error.general}</span>}
								<div className='flex gap-2 w-full'>
									<Button
										text={'Cancelar Cotizacion'}
										className={'secondary'}
										func={() => setIsActiveModal(false)}
									/>
									<Button
										text={savingQuote ? 'Guardando…' : 'Confirmar Cotizacion'}
										className={'success'}
										func={savingQuote ? undefined : confirmCotizacion}
									/>
								</div>
							</div>
						) : mode === 'error' ? (
							<div className='mt-2'>
								<Button
									className={'success'}
									text={'Aceptar'}
									icon={<FiCheck className='h-5 w-5' />}
									func={() => setIsActiveModal(false)}
								/>
							</div>
						) : (mode === 'unit' ? (
							<div className='flex flex-col gap-2'>
								<DropdownMenu
									label={"Unidad de Medida para este producto"}
									options={unitOptions}
									defaultValue={selectedUnitOption ? selectedUnitOption.label : 'Selecciona una unidad'}
									onChange={(opt) => setSelectedUnitOption(opt)}
								/>
								<div className='flex gap-2'>
									<Button
										text={"Cancelar"}
										className={'secondary'}
										func={() => handleModalClose()}
									/>
									<Button
										className={'success'}
										text={"Guardar"}
										func={() => handleUnitSubmit()}
									/>
								</div>
							</div>
						) : (mode === 'price' ? (
							<div className='flex flex-col gap-2'>
								<Input
									label={"Agrega un precio personalizado"}
									type={'number'}
									inputClass={'no icon'}
									placeholder={"ej: C$300.00"}
									value={customPriceInput}
									onChange={(e) => setCustomPriceInput(e.target.value)}
								/>
								<div className='flex gap-2'>
									<Button
										text={"Cancelar"}
										className={'secondary'}
										func={() => handleModalClose()}
									/>
									<Button
										className={'success'}
										text={"Guardar"}
										func={() => handleCustomPrice()}
									/>
								</div>
							</div>
						) : (mode === "credito" ? (
							<div className='flex flex-col gap-2 mt-2'>
								{isAdmin && (
									<span className='text-sm text-dark/70'>
										Sucursal seleccionada: <span className='font-semibold'>{selectedSucursal?.label || '—'}</span>
									</span>
								)}
								{error?.general && <span className='text-danger text-sm'>{error.general}</span>}
								<div className='flex gap-2'>
									<Button
										text={"Cancelar"}
										className={"secondary"}
										func={() => setIsActiveModal(false)}
									/>
									<Button
										className={'success'}
										text={"Confirmar credito"}
										func={() => confirmCredito()}
									/>
								</div>
							</div>
						) : (mode === "discount" ? (
							<div className='flex flex-col gap-2 mt-2'>
								<DropdownMenu
									options={descuentos.map((discount) => ({ ...discount, label: discount.NOMBRE_DESCUENTO, value: discount.ID_DESCUENTO }))}
									defaultValue={'Selecciona un descuento'}
									onChange={(opt) => setSelectedDiscountOpt(opt)}
								/>
								<div className='flex gap-2'>
									<Button
										text={"Cancelar"}
										className={"secondary"}
										func={() => setIsActiveModal(false)}
									/>
									<Button
										className={'success'}
										text={"Aplicar"}
										func={() => handelApplyDiscount()}
									/>
								</div>
							</div>
						) : (mode === 'transportation' ? (
							<div className='flex flex-col gap-2 mt-2'>
								<Input
									label={'Servicio de Transporte'}
									type={'number'}
									inputClass={'no icon'}
									placeholder={'Ingrese el precio del transporte...'}
									value={transportation}
									onChange={(e) => setTransportation(Number(e.target.value || 0))}
								/>
								<div className='flex gap-2'>
									<Button
										text={"Cancelar"}
										className={"secondary"}
										func={() => setIsActiveModal(false)}
									/>
									<Button
										className={'success'}
										text={"Aplicar"}
										func={() => handleTransportation()}
									/>
								</div>
							</div>
						) : (
							<div className='flex mt-2'>
								<Button
									className={'success'}
									text={'Hecho'}
									icon={<FiCheck className='h-5 w-5' />}
									func={handleDone}
								/>
							</div>
						))))))}
					</ModalContainer >
				)
			}
		</>
	)
}
