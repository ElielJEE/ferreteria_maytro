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
		link: "/compras"
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
				path: "/configuracion/roles",
				roles: ["admin"]
			},
			{
				name: "Caja",
				path: "/configuracion/caja",
				roles: ["admin"]
			},
			{
				name: "Tasa de cambio",
				path: "/configuracion/tasa-de-cambio",
				roles: ["admin"]
			},
			{
				name: "Sucursales",
				path: "/configuracion/sucursales",
				roles: ["admin"]
			},
			{
				name: "Unidades de Medida",
				path: "/configuracion/unidades-medidas",
				roles: ["admin"]
			},
		]
	},
]

export default sidebarData;