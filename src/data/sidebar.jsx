import { BiHomeAlt } from "react-icons/bi";
import { BsBarChartSteps, BsBoxSeam, BsCart2 } from "react-icons/bs";
import { FiSettings, FiTruck, FiUsers } from "react-icons/fi";
import { HiOutlineCalculator } from "react-icons/hi";


const sidebarData = [
	{
		title: "Dashboard",
		icon: <BiHomeAlt />,
		link: "/dashboard"
	},
	{
		title: "Inventario",
		icon: <BsBoxSeam />,
		roles: ["admin", "vendedor"],
		subModules: [
			{
				name: "Productos",
				path: "/inventario/productos",
				roles: ["admin", "vendedor"]
			},
			{
				name: "Categorías",
				path: "/inventario/categorias",
				roles: ["admin"]
			},
			{
				name: "Control de Stock",
				path: "/inventario/control-stock",
				roles: ["admin", "vendedor"]
			},
		]
	},
	{
		title: "Ventas",
		icon: <HiOutlineCalculator />,
		roles: ["admin", "vendedor"],
		subModules: [
			{
				name: "Punto de venta",
				path: "/venta/punto-venta",
				roles: ["admin", "vendedor"]
			},
			{
				name: "Historial de Ventas",
				path: "/venta/historial-ventas",
				roles: ["admin", "vendedor"]
			},
			{
				name: "Cotizaciones",
				path: "/venta/cotizaciones",
				roles: ["admin", "vendedor"]
			},
			{
				name: "Devoluciones",
				path: "/venta/devoluciones",
				roles: ["admin", "vendedor"]
			},
		]
	},
	{
		title: "Compras",
		icon: <BsCart2 />,
		roles: ["admin", "vendedor"],
		subModules: [
			{
				name: "Ordenes de Compra",
				path: "/compras/ordenes-compra",
				roles: ["admin", "vendedor"]
			},
			{
				name: "Historial de Compras",
				path: "/compras/historial-compras",
				roles: ["admin", "vendedor"]
			},
		]
	},
	{
		title: "Clientes",
		icon: <FiUsers />,
		roles: ["admin", "vendedor"],
		subModules: [
			{
				name: "Lista de clientes",
				path: "/clientes/clientes-lista",
				roles: ["admin", "vendedor"]
			},
			{
				name: "Creditos",
				path: "/clientes/creditos",
				roles: ["admin", "vendedor"]
			},
			{
				name: "Historial de Credito",
				path: "/clientes/historial-compras",
				roles: ["admin", "vendedor"]
			},
		]
	},
	{
		title: "Proveedores",
		icon: <FiTruck />,
		roles: ["admin", "vendedor"],
		link: "/proveedores",
	},
	{
		title: "Configuración",
		icon: <FiSettings />,
		roles: ["admin"],
		subModules: [
			{
				name: "Usuarios",
				path: "/configuracion/usuarios",
				roles: ["admin"]
			},
			{
				name: "Roles",
				path: "/configuracion/usuarios",
				roles: ["admin"]
			},
			{
				name: "Caja",
				path: "/configuracion/usuarios",
				roles: ["admin"]
			},
			{
				name: "Tasa de cambio",
				path: "/configuracion/usuarios",
				roles: ["admin"]
			},
			{
				name: "Sucursales",
				path: "/configuracion/usuarios",
				roles: ["admin"]
			},
		]
	},
]

export default sidebarData;