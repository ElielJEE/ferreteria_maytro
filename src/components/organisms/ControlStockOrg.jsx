"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, InfoCard, ModalContainer } from '../atoms'
import { FiAlertTriangle, FiBox, FiDollarSign, FiEye, FiFile, FiGlobe, FiMaximize, FiMinus, FiPlus, FiSearch, FiShoppingCart, FiTrendingUp, FiX, FiXCircle } from 'react-icons/fi'
import { BsBoxSeam, BsBuilding, BsGear } from 'react-icons/bs'
import { Alerts, Card, Damaged, DropdownMenu, Input, Movements, Reserved, Summary } from '../molecules'
import StockService from '@/services/StockService';
import { CustomerService, NivelacionService } from '@/services';
import { useActive, useIsMobile } from '@/hooks'
import { errors } from 'jose'

export default function ControlStockOrg() {
	const [tipoMovimiento, setTipoMovimiento] = useState("");
	const [formErrors, setFormErrors] = useState({});

	const validateForm = (form, tipoMovimiento) => {
		const newErrors = {};

		// Campos siempre requeridos
		const required = ['sucursal', 'producto', 'tipoMovimiento'];
		required.forEach((field) => {
			const value = form[field];
			if (value === null || value === undefined || String(value).trim() === '') {
				newErrors[field] = 'Este campo es requerido';
			}
		});

		// Cantidad requerida excepto cuando es "Marcar como Dañado" y estado = Perdida Total (se auto-calcula)
		const requiereCantidad = (
			['Entrada (Aumentar Stock)', 'Salida (Reducir Stock)'].includes(tipoMovimiento) ||
			(tipoMovimiento === 'Marcar como Dañado' && form.estadoDano !== 'Perdida Total') ||
			(tipoMovimiento === 'Marcar como Reservado')
		);
		if (requiereCantidad) {
			if (!form.cantidad || Number(form.cantidad) <= 0) {
				newErrors.cantidad = 'Ingresa una cantidad válida';
			}
		}

		if (tipoMovimiento === "Marcar como Dañado") {
			if (!form.tipoDano) newErrors.tipoDano = 'Selecciona un tipo de daño';
			if (!form.estadoDano) newErrors.estadoDano = 'Selecciona un estado';
			if (!form.motivo) newErrors.motivo = 'Ingresa una descripción del daño';
		}

		if (tipoMovimiento === "Marcar como Reservado") {
			if (!form.cantidad || Number(form.cantidad) <= 0) newErrors.cantidad = 'Ingresa una cantidad válida';
			if (!form.cliente) newErrors.cliente = 'Selecciona o ingresa un cliente';
			if (!form.telefono) newErrors.telefono = 'Ingresa un teléfono';
		}

		// etc para otros tipos de movimiento...

		setFormErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		let effectiveCantidad = cantidadMovimiento;
		// Auto-calcular cantidad completa si es daño con pérdida total
		if (tipoMovimiento === 'Marcar como Dañado' && estadoDano === 'Perdida Total') {
			try {
				// Necesitamos sucursal y producto seleccionados
				if (selectedSucursal?.label && selectedProducto?.value != null) {
					const resumenResp = await fetch(`/api/stock?tab=Resumen&sucursal=${encodeURIComponent(selectedSucursal.label)}`);
					if (resumenResp.ok) {
						const resumenJson = await resumenResp.json().catch(() => ({}));
						const filas = resumenJson?.resumen || [];
						const row = filas.find(r => (r.ID_PRODUCT === selectedProducto.value || r.ID_PRODUCT === selectedProducto?.ID_PRODUCT) && (r.NOMBRE_SUCURSAL === selectedSucursal.label));
						if (row) {
							// Usar todo el stock sucursal disponible como pérdida total
							const stockSucursal = Number(row.STOCK_SUCURSAL || 0);
							effectiveCantidad = String(stockSucursal);
						} else {
							// fallback: si no encontramos fila, marcar error
							setFormErrors(prev => ({ ...prev, cantidad: 'No se pudo determinar stock para la pérdida total' }));
						}
					} else {
						setFormErrors(prev => ({ ...prev, cantidad: 'No se pudo obtener el resumen de stock' }));
					}
				} else {
					setFormErrors(prev => ({ ...prev, cantidad: 'Selecciona sucursal y producto' }));
				}
			} catch (err) {
				console.error('Auto-cálculo pérdida total:', err);
				setFormErrors(prev => ({ ...prev, cantidad: 'Error calculando pérdida total' }));
			}
		}

		const form = {
			sucursal: selectedSucursal,
			producto: selectedProducto,
			tipoMovimiento,
			cantidad: effectiveCantidad,
			motivo: motivoMovimiento,
			referencia: referenciaMovimiento,
			tipoDano,
			estadoDano,
			cliente,
			telefono,
		};

		const isValid = validateForm(form, tipoMovimiento);
		if (!isValid) return;

		const payload = {
			tipo: tipoMovimiento,
			producto: selectedProducto,
			sucursal: selectedSucursal,
			cantidad: Number(effectiveCantidad),
			motivo: motivoMovimiento,
			referencia: referenciaMovimiento,
			descripcion: motivoMovimiento,
			tipo_dano: tipoDano,
			estado_dano: estadoDano,

		};

		if (tipoMovimiento === 'Marcar como Reservado') {
			payload.cliente = cliente;
			payload.telefono = telefono;
			payload.fecha_entrega = fechaEntrega || null;
			payload.notas = notas || null;
		}

		const res = await StockService.registrarMovimiento(payload);

		if (!res.success) {
			setFormErrors({ general: res.message });
			return;
		}

		setIsActiveModal(false);
		window.dispatchEvent(new CustomEvent('stock:updated', {
			detail: { tipo: tipoMovimiento, producto: selectedProducto, sucursal: selectedSucursal, cantidad: Number(cantidadMovimiento), result: res }
		}));
	};

	const movimientos = [
		"Entrada (Aumentar Stock)",
		"Salida (Reducir Stock)",
		"Marcar como Dañado",
		"Marcar como Reservado"
	];

	const [cardData, setCardData] = useState({
		en_bodega: 0,
		en_stock: 0,
		fisico_total: 0,
		danados: 0,
		reservados: 0,
		criticos: 0,     // Requerido: dejar en 0 por ahora
		agotados: 0,  // Sin base de cálculo aún; dejamos 0 por ahora
	});

	const cardsConfig = [
		{ key: "en_bodega", title: "En Bodega Disponible", icon: BsBoxSeam, color: "primary" },
		{ key: "en_stock", title: "En stock", icon: FiTrendingUp, color: "success" },
		{ key: "fisico_total", title: "Fisico Total", icon: FiEye, color: "blue" },
		{ key: "danados", title: "Dañados", icon: FiX, color: "danger" },
		{ key: "reservados", title: "Reservados", icon: FiShoppingCart, color: "purple" },
		{ key: "criticos", title: "Criticos", icon: FiAlertTriangle, color: "yellow" },
		{ key: "agotados", title: "Agotados", icon: BsBoxSeam, color: "secondary" },
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
	const [currentUser, setCurrentUser] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);

	// Top dropdown: selected sucursal for filtering resumen
	const [topSucursales, setTopSucursales] = useState([]);
	const [topSucursal, setTopSucursal] = useState('Todas');

	// Cargar usuario actual y fijar sucursal por defecto
	useEffect(() => {
		(async () => {
			try {
				const res = await fetch('/api/me', { credentials: 'include' });
				if (!res.ok) return;
				const data = await res.json();
				const user = data?.user || null;
				setCurrentUser(user);
				// Admin: no pertenece a sucursal (ID_SUCURSAL null)
				const admin = !user?.ID_SUCURSAL;
				setIsAdmin(admin);
				if (!admin && user?.SUCURSAL_NOMBRE) {
					setTopSucursal(user.SUCURSAL_NOMBRE);
				}
			} catch { }
		})();
	}, []);

	// Cargar sucursales para el dropdown superior
	useEffect(() => {
		(async () => {
			try {
				const res = await fetch('/api/sucursales');
				if (!res.ok) {
					console.error('Error fetching top sucursales:', res.status);
					setTopSucursales([]);
					return;
				}
				const data = await res.json();
				const all = data.sucursales || [];
				if (isAdmin) setTopSucursales(all);
				else setTopSucursales(all.filter(s => s.label === (currentUser?.SUCURSAL_NOMBRE || '')));
			} catch (err) {
				console.error('Failed to fetch top sucursales:', err);
				setTopSucursales([]);
			}
		})();
	}, [isAdmin, currentUser]);

	// Top cards: calcular con datos reales del resumen
	useEffect(() => {
		const zeros = { en_bodega: 0, en_stock: 0, fisico_total: 0, danados: 0, reservados: 0, criticos: 0, agotados: 0, valor_total: 'C$ 0' };
		const normNum = (v) => (v == null || v === '' ? 0 : Number(v));
		const calcCards = (rows) => {
			// en_stock/danados/reservados se pueden sumar a nivel de fila (ya vienen por sucursal)
			const en_stock = rows.reduce((sum, r) => sum + normNum(r.STOCK_SUCURSAL), 0);
			const danados = rows.reduce((sum, r) => sum + normNum(r.DANADOS), 0);
			const reservados = rows.reduce((sum, r) => sum + normNum(r.RESERVADOS), 0);
			// Para en_bodega y fisico_total, evitar duplicar por sucursal: sumar por producto único
			const byProduct = new Map();
			rows.forEach(r => {
				const key = r.ID_PRODUCT ?? r.id_product ?? `${r.CODIGO_PRODUCTO}-${r.PRODUCT_NAME}`;
				if (!byProduct.has(key)) {
					byProduct.set(key, { STOCK_BODEGA: normNum(r.STOCK_BODEGA), FISICO_TOTAL: normNum(r.FISICO_TOTAL) });
				}
			});
			let en_bodega = 0; let fisico_total = 0;
			byProduct.forEach(v => { en_bodega += v.STOCK_BODEGA; fisico_total += v.FISICO_TOTAL; });
			let criticos = 0;
			let agotados = 0;

			rows.forEach(r => {
				const stock = Number(r.STOCK_SUCURSAL || 0);
				const minimo = Number(r.MINIMO || 0); // suponiendo que el API te devuelve mínimo
				if (stock === 0) agotados += 1;
				else if (stock <= minimo) criticos += 1;
			});
			return { en_bodega, en_stock, fisico_total, danados, reservados, criticos, agotados };
		};

		const load = async () => {
			const res = await StockService.getResumen(topSucursal);
			if (!res.success) {
				console.error('Resumen cards error:', res.message);
				setCardData(zeros);
				return;
			}
			console.log(res);
			const rows = res.resumen || [];
			const base = calcCards(rows);
			// Calcular valor total de inventario (igual que en Productos) y restar perdidas de dañados
			try {
				const [prodResp, danadosResp] = await Promise.all([
					fetch('/api/productos'),
					StockService.getDanados(topSucursal)
				]);
				let productos = [];
				if (prodResp && prodResp.ok) {
					productos = await prodResp.json().catch(() => []);
				}
				const toNum = (v) => (v == null || v === '' ? 0 : Number(v));
				const inventarioBase = Array.isArray(productos)
					? productos.reduce((acc, p) => acc + (toNum(p.CANTIDAD) * toNum(p.PRECIO)), 0)
					: 0;
				const perdidas = (danadosResp && danadosResp.success && Array.isArray(danadosResp.danados))
					? danadosResp.danados.reduce((acc, r) => acc + toNum(r.perdida), 0)
					: 0;
				const valorTotal = Math.max(inventarioBase - perdidas, 0);
				setCardData({ ...base, valor_total: `C$ ${valorTotal.toLocaleString()}` });
			} catch (e) {
				console.warn('No se pudo calcular valor total inventario:', e?.message || e);
				setCardData({ ...base, valor_total: 'C$ 0' });
			}
		};

		load();
		const handler = () => load();
		window.addEventListener('stock:updated', handler);
		return () => window.removeEventListener('stock:updated', handler);
	}, [topSucursal]);



	const data = [
		{ producto: "Martillo de Carpintero 16oz", sucursal: "Sucursal Sur" },
		{ producto: "Destornillador Phillips #2", sucursal: "Sucursal Centro" },
		{ producto: "Cable Eléctrico 12 AWG", sucursal: "Sucursal Centro" },
	];

	// Estado para productos reales
	const [productos, setProductos] = useState([]);

	// Form state para ajustar stock (guardamos objetos { label, value } retornados por el API)
	const [selectedSucursal, setSelectedSucursal] = useState(null);
	const [selectedProducto, setSelectedProducto] = useState(null);
	const [cantidadMovimiento, setCantidadMovimiento] = useState(0);
	const [motivoMovimiento, setMotivoMovimiento] = useState("");
	const [referenciaMovimiento, setReferenciaMovimiento] = useState("");
	const [tipoDano, setTipoDano] = useState("");
	const [estadoDano, setEstadoDano] = useState("");
	// Campos adicionales para Reservados
	const [fechaEntrega, setFechaEntrega] = useState("");
	const [notas, setNotas] = useState("");

	// Cargar productos reales al abrir el modal
	useEffect(() => {
		if (!isActiveModal) return;
		(async () => {
			try {
				const res = await fetch('/api/productos-lista');
				if (!res.ok) {
					console.error('Error fetching productos-lista:', res.status);
					setProductos([]);
					return;
				}
				const data = await res.json();
				setProductos(data.productos || []);
			} catch (err) {
				console.error('Failed to fetch productos-lista:', err);
				setProductos([]);
			}
		})();
	}, [isActiveModal]);
	// Estado para sucursales reales
	const [sucursales, setSucursales] = useState([]);

	// Modo del modal (stock | range)
	const [mode, setMode] = useState("stock");

	// Estado para rangos (nivelación)
	const [minimo, setMinimo] = useState('');
	const [maximo, setMaximo] = useState('');

	// Cargar sucursales reales al abrir el modal
	useEffect(() => {
		if (!isActiveModal) return;
		(async () => {
			try {
				const res = await fetch('/api/sucursales');
				if (!res.ok) {
					console.error('Error fetching sucursales (modal):', res.status);
					setSucursales([]);
					return;
				}
				const data = await res.json();
				const all = data.sucursales || [];
				if (isAdmin) setSucursales(all);
				else setSucursales(all.filter(s => s.label === (currentUser?.SUCURSAL_NOMBRE || '')));
			} catch (err) {
				console.error('Failed to fetch sucursales (modal):', err);
				setSucursales([]);
			}
		})();
	}, [isActiveModal, isAdmin, currentUser]);

	// Auto-seleccionar sucursal del usuario en el modal si no es admin
	useEffect(() => {
		if (!isActiveModal) return;
		if (isAdmin) return;
		if (!selectedSucursal && Array.isArray(sucursales) && sucursales.length === 1) {
			setSelectedSucursal(sucursales[0]);
		}
	}, [isActiveModal, isAdmin, sucursales, selectedSucursal]);

	// Reset form when modal opens/closes
	useEffect(() => {
		if (!isActiveModal) {
			setSelectedSucursal(null);
			setSelectedProducto(null);
			setCantidadMovimiento(0);
			setMotivoMovimiento("");
			setReferenciaMovimiento("");
			setTipoMovimiento("");
			setTipoDano("");
			setEstadoDano("");
			setCliente("");
			setTelefono("");
			setFechaEntrega("");
			setNotas("");
			setMinimo('');
			setMaximo('');
			setFormErrors({});
		}
	}, [isActiveModal]);

	// Precargar nivelación cuando se elijan sucursal y producto en modo "range"
	useEffect(() => {
		if (!isActiveModal || mode !== 'range') return;
		if (!selectedSucursal || !selectedProducto) return;
		(async () => {
			const { success, nivelacion } = await NivelacionService.getNivelacion(selectedSucursal.value, selectedProducto.value);
			if (success && Array.isArray(nivelacion) && nivelacion.length) {
				const item = nivelacion[0];
				setMinimo(item?.MINIMO ?? '');
				setMaximo(item?.MAXIMO ?? '');
			} else {
				setMinimo('');
				setMaximo('');
			}
		})();
	}, [isActiveModal, mode, selectedSucursal, selectedProducto]);

	const [clientes, setClientes] = useState({});

	useEffect(() => {
		const fetchClientes = async () => {
			try {
				const clientesData = await CustomerService.getClientes();
				setClientes(clientesData);
			} catch (error) {
				console.error(error);
			}
		};
		fetchClientes();
	}, []);

	const [cliente, setCliente] = useState("");
	const [telefono, setTelefono] = useState("");
	const [clientesFiltrados, setClientesFiltrados] = useState([]);

	const handleClienteChange = (e) => {
		const value = e.target.value;
		setCliente(value);
		setFormErrors(prev => ({ ...prev, cliente: '' }));

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

	const toggleModalType = (action) => {
		if (action === 'stock') {
			setMode("stock");
			setIsActiveModal(true);
		}

		if (action === 'range') {
			setMode("range");
			setIsActiveModal(true);
		}
	}

	const handleSubmitRange = async (e) => {
		e?.preventDefault?.();
		const errors = {};
		if (!selectedSucursal) errors.sucursal = 'Este campo es requerido';
		if (!selectedProducto) errors.producto = 'Este campo es requerido';
		if (minimo === '' || isNaN(Number(minimo)) || Number(minimo) < 0) errors.minimo = 'Ingresa un mínimo válido';
		if (maximo === '' || isNaN(Number(maximo)) || Number(maximo) < 0) errors.maximo = 'Ingresa un máximo válido';
		if (Object.keys(errors).length) { setFormErrors(prev => ({ ...prev, ...errors })); return; }

		const res = await NivelacionService.saveNivelacion({
			sucursal: selectedSucursal.value,
			productoId: selectedProducto.value,
			minimo: String(minimo),
			maximo: String(maximo),
		});
		if (!res.success) {
			setFormErrors(prev => ({ ...prev, general: res.message || 'No se pudo guardar' }));
			return;
		}
		setIsActiveModal(false);
		try {
			window.dispatchEvent(new CustomEvent('stock:updated', { detail: { tipo: 'Nivelacion', producto: selectedProducto, sucursal: selectedSucursal } }));
		} catch { }
	}

	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='flex flex-col md:flex-row w-full gap-1 md:items-center justify-start border border-dark/20 rounded-lg p-4 mb-4'>
					<div className='flex gap-1 items-center'>
						<FiGlobe className='h-4 w-4 md:h-5 md:w-5 text-blue' />
						<h3 className='md:text-lg font-semibold'>Sucursal: </h3>
					</div>
					<div className='lg:w-1/3 md:w-1/2'>
						{isAdmin ? (
							<DropdownMenu
								options={[{ label: 'Todas', value: 'Todas' }, ...topSucursales]}
								defaultValue={topSucursal === 'Todas' ? 'Vista general (Todas las sucursales)' : topSucursal}
								onChange={(opt) => setTopSucursal(opt.value === 'Todas' ? 'Todas' : opt.label)}
							/>
						) : (
							<div className='flex items-center h-10 px-3 border border-dark/20 rounded-lg bg-light'>
								<span>{topSucursal || currentUser?.SUCURSAL_NOMBRE || 'Sucursal'}</span>
							</div>
						)}
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
					<div className='gap-2 flex xl:w-[50%] lg:w-[60%] md:w-[70%] sm:w-[80%] w-full md:justify-end'>
						<Button
							className={"primary"}
							text={"Ajustar Stock"}
							icon={<BsGear className='h-4 w-4' />}
							func={() => toggleModalType('stock')}
						/>
						<Button
							className={"transparent"}
							text={"Ajustar Rangos"}
							icon={<FiMinus className='h-4 w-4' />}
							iconRight={<FiPlus className='h-4 w-4' />}
							func={() => toggleModalType('range')}
						/>
					</div>
				</section>
				<section className='w-full mt-4 border-dark/20 border rounded-lg p-4 flex flex-col'>
					{activeTab === 'Resumen' && <Summary setIsActiveModal={setIsActiveModal} sucursalFilter={topSucursal} />}
					{activeTab === 'Movimientos' && <Movements sucursalFilter={topSucursal} />}
					{activeTab === 'Alertas' && <Alerts sucursalFilter={topSucursal} />}
					{activeTab === 'Dañados' && <Damaged sucursalFilter={topSucursal} />}
					{activeTab === 'Reservados' && <Reserved sucursalFilter={topSucursal} />}
				</section>
			</div>
			{isActiveModal && (
				<ModalContainer
					setIsActiveModal={setIsActiveModal}
					txtButton={mode === "stock"
						? "Registrar Movimiento"
						: "Guardar Cambios"
					}
					modalTitle={mode === "stock"
						? "Ajustar Stock de Producto"
						: "Ajustar Rangos de Stock"
					}
					modalDescription={mode === "stock"
						? "Registra un movimiento de inventario"
						: "Ajusta los rangos mínimos y máximos de stock para productos"
					}
				>
					{
						mode === "stock" ? (
							<form className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" onSubmit={handleSubmit}>
								{/* 🔹 Sucursal */}
								<DropdownMenu
									label={"Sucursal"}
									options={sucursales.length > 0 ? sucursales : [{ label: 'Cargando...', value: null }]}
									defaultValue={selectedSucursal ? selectedSucursal.label : "Selecciona una sucursal"}
									onChange={(opt) => {
										setSelectedSucursal(opt);
										if (opt) setFormErrors(prev => ({ ...prev, sucursal: '' }));
									}}
									error={formErrors.sucursal}
								/>

								{/* 🔹 Producto */}
								<DropdownMenu
									label={"Producto"}
									options={productos.length > 0 ? productos : [{ label: 'Cargando...', value: null }]}
									defaultValue={selectedProducto ? selectedProducto.label : "Selecciona un producto"}
									onChange={(opt) => {
										setSelectedProducto(opt);
										if (opt) setFormErrors(prev => ({ ...prev, producto: '' }));
									}}
									error={formErrors.producto}
								/>

								{/* 🔹 Tipo de Movimiento */}
								<DropdownMenu
									label={"Tipo de Movimiento"}
									options={movimientos}
									defaultValue={"Selecciona un tipo"}
									onChange={(value) => {
										setTipoMovimiento(value);
										if (value) setFormErrors(prev => ({ ...prev, tipoMovimiento: '' }));
									}}
									error={formErrors.tipoMovimiento}
								/>

								{/* 🔹 Campos dinámicos */}
								{tipoMovimiento === "Marcar como Dañado" && (
									<>
										{/* Estado del daño primero para condicionar cantidad */}
										<DropdownMenu
											label="Estado"
											options={["Recuperable", "Perdida Total"]}
											defaultValue="Selecciona estado"
											onChange={(opt) => {
												const value = typeof opt === 'object' ? opt.label : opt;
												setEstadoDano(value);
												// Si es pérdida total limpiamos cantidad (ya no requerida)
												if (value === 'Perdida Total') {
													setCantidadMovimiento('');
													setFormErrors(prev => ({ ...prev, cantidad: '' }));
												}
												setFormErrors(prev => ({ ...prev, estadoDano: '' }));
											}}
											error={formErrors.estadoDano}
										/>

										<DropdownMenu
											label="Unidad de Medida"
											options={["mts", "pzs", "lts"]}
											defaultValue="Selecciona la unidad de medida"
											error={formErrors.unidad}
										/>

										{/* Cantidad solo cuando es recuperable */}
										{estadoDano !== 'Perdida Total' && (
											<Input
												label="Cantidad Recuperable"
												type="number"
												placeholder="0"
												inputClass="no icon"
												value={cantidadMovimiento}
												onChange={(e) => {
													setCantidadMovimiento(e.target.value);
													setFormErrors(prev => ({ ...prev, cantidad: '' }));
												}}
												error={formErrors.cantidad}
											/>
										)}

										<DropdownMenu
											label="Tipo de Daño"
											options={["Vencido", "Deteriorado", "Defectuoso"]}
											defaultValue="Selecciona un tipo de daño"
											onChange={(opt) => {
												const value = typeof opt === 'object' ? opt.label : opt;
												setTipoDano(value);
												setFormErrors(prev => ({ ...prev, tipoDano: '' }));
											}}
											error={formErrors.tipoDano}
										/>

										<Input
											label="Descripción"
											placeholder="Describe el daño..."
											isTextarea={true}
											inputClass="no icon"
											isLastElement={true}
											value={motivoMovimiento}
											onChange={(e) => {
												setMotivoMovimiento(e.target.value);
												setFormErrors(prev => ({ ...prev, motivo: '' }));
											}}
											error={formErrors.motivo}
										/>
									</>
								)}

								{tipoMovimiento === "Marcar como Reservado" && (
									<>
										<Input
											label="Cantidad"
											type="number"
											placeholder="0"
											inputClass="no icon"
											value={cantidadMovimiento}
											onChange={(e) => {
												setCantidadMovimiento(e.target.value);
												setFormErrors(prev => ({ ...prev, cantidad: '' }));
											}}
											error={formErrors.cantidad}
										/>
										<div className="relative">
											<Input
												label="Cliente"
												placeholder="Nombre del cliente"
												value={cliente}
												onChange={handleClienteChange}
												inputClass="no icon"
												error={formErrors.cliente}
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
										</div>
										<Input
											label="Teléfono"
											placeholder="Número del cliente"
											value={telefono}
											onChange={(e) => {
												setTelefono(e.target.value);
												setFormErrors(prev => ({ ...prev, telefono: '' }));
											}}
											inputClass="no icon"
											error={formErrors.telefono}
										/>

										<Input
											label="Fecha de Entrega"
											type="date"
											inputClass="no icon"
											value={fechaEntrega}
											onChange={(e) => {
												setFechaEntrega(e.target.value);
												setFormErrors(prev => ({ ...prev, fechaEntrega: '' }));
											}}
											error={formErrors.fechaEntrega}
										/>

										<Input
											label="Notas"
											placeholder="Agrega una nota..."
											isTextarea={true}
											inputClass="no icon"
											value={notas}
											onChange={(e) => setNotas(e.target.value)}
										/>
									</>
								)}

								{(tipoMovimiento === "Entrada (Aumentar Stock)" ||
									tipoMovimiento === "Salida (Reducir Stock)") && (
										<>
											<Input
												label="Cantidad"
												type="number"
												placeholder="0"
												inputClass="no icon"
												value={cantidadMovimiento}
												onChange={(e) => {
													setCantidadMovimiento(e.target.value);
													setFormErrors(prev => ({ ...prev, cantidad: '' }));
												}}
												error={formErrors.cantidad}
											/>
											<Input
												label="Motivo"
												placeholder="Describe el motivo..."
												inputClass="no icon"
												isTextarea={true}
												value={motivoMovimiento}
												onChange={(e) => setMotivoMovimiento(e.target.value)}
											/>
											<Input
												label="Referencia (opcional)"
												placeholder="Ej: ORD-001, VEN-1234"

												inputClass="no icon"
												value={referenciaMovimiento}
												onChange={(e) => setReferenciaMovimiento(e.target.value)}
											/>
										</>
									)}
								{formErrors.general && <span className='text-danger text-center'>{formErrors.general}</span>}
								<div className='col-span-2 flex gap-2 mt-2'>
									<Button
										className={"danger"}
										text={"Cancelar"}
										type="button"
										func={() => setIsActiveModal(false)}
									/>
									<Button
										className={"success"}
										text={"Ajustar Stock"}
										type="submit"
									/>
								</div>
							</form>
						) : (
							<form className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" onSubmit={handleSubmitRange}>
								<DropdownMenu
									label={"Sucursal"}
									options={sucursales.length > 0 ? sucursales : [{ label: 'Cargando...', value: null }]}
									defaultValue={selectedSucursal ? selectedSucursal.label : "Selecciona una sucursal"}
									onChange={(opt) => {
										setSelectedSucursal(opt);
										if (opt) setFormErrors(prev => ({ ...prev, sucursal: '' }));
									}}
									error={formErrors.sucursal}
								/>
								<DropdownMenu
									label={"Producto"}
									options={productos.length > 0 ? productos : [{ label: 'Cargando...', value: null }]}
									defaultValue={selectedProducto ? selectedProducto.label : "Selecciona un producto"}
									onChange={(opt) => {
										setSelectedProducto(opt);
										if (opt) setFormErrors(prev => ({ ...prev, producto: '' }));
									}}
									error={formErrors.producto}
								/>
								<Input
									label="Rango Mínimo de Stock"
									type="number"
									placeholder="0"
									inputClass="no icon"
									value={minimo}
									onChange={(e) => { setMinimo(e.target.value); setFormErrors(prev => ({ ...prev, minimo: '' })); }}
									error={formErrors.minimo}
								/>
								<Input
									label="Rango Máximo de Stock"
									type="number"
									placeholder="0"
									inputClass="no icon"
									value={maximo}
									onChange={(e) => { setMaximo(e.target.value); setFormErrors(prev => ({ ...prev, maximo: '' })); }}
									error={formErrors.maximo}
								/>
								<div className='col-span-2 flex gap-2 mt-2'>
									<Button
										className={"danger"}
										text={"Cancelar"}
										type="button"
										func={() => setIsActiveModal(false)}
									/>
									<Button
										className={"success"}
										text={"Guardar Rangos"}
										type="submit"
									/>
								</div>
							</form>
						)
					}
				</ModalContainer>
			)}
		</>
	)
}
