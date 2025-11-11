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
		subModules: [
			{
				name: "Productos",
				path: "/inventario/productos",
			},
			{
				name: "Categorías",
				path: "/inventario/categorias",
			},
			{
				name: "Control de Stock",
				path: "/inventario/control-stock",
			},
		]
	},
	{
		title: "Ventas",
		icon: <HiOutlineCalculator />,
		subModules: [
			{
				name: "Punto de venta",
				path: "/venta/punto-venta",
			},
			{
				name: "Historial de Ventas",
				path: "/venta/historial-ventas",
			},
			{
				name: "Cotizaciones",
				path: "/venta/cotizaciones",
			},
			{
				name: "Devoluciones",
				path: "/venta/devoluciones",
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
		subModules: [
			{
				name: "Lista de clientes",
				path: "/clientes/clientes-lista",
			},
			{
				name: "Creditos",
				path: "/clientes/creditos",
			},
		]
	},
	{
		title: "Proveedores",
		icon: <FiTruck />,
		link: "/proveedores",
	},
	{
		title: "Configuración",
		icon: <FiSettings />,
		subModules: [
			{
				name: "Usuarios",
				path: "/configuracion/usuarios",
			},
			{
				name: "Roles",
				path: "/configuracion/roles",
			},
			{
				name: "Caja",
				path: "/configuracion/caja",
			},
			{
				name: "Tasa de cambio",
				path: "/configuracion/tasa-de-cambio",
			},
			{
				name: "Sucursales",
				path: "/configuracion/sucursales",
			},
			{
				name: "Unidades de Medida",
				path: "/configuracion/unidades-medidas",
			},
			{
				name: "Descuentos",
				path: "/configuracion/descuentos",
			},
		]
	},
]

export default sidebarData;