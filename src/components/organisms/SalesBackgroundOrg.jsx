'use client'
import React from 'react'
import DropdownMenu from '../molecules/DropdownMenu'
import Input from '../molecules/Input'
import Card from '../molecules/Card'
import { FiSearch, FiMoreHorizontal, FiEye, FiEdit, FiTrash, FiUser, FiPrinter, FiDollarSign, FiFile } from 'react-icons/fi'
import { useActive, useIsMobile } from '@/hooks'
import useFilter from '@/hooks/useFilter'
import { SalesService } from '@/services'
import { Button, InfoCard, ModalContainer } from '../atoms'
import SaleView from '../molecules/SaleView'
import SaleEdit from '../molecules/SaleEdit'
import SaleDelete from '../molecules/SaleDelete'
import { BsBuilding } from 'react-icons/bs'

export default function SalesBackgroundOrg() {
	const [data, setData] = React.useState([])
	const [loading, setLoading] = React.useState(false)
	const [search, setSearch] = React.useState('')
	const [sucursalFilter, setSucursalFilter] = React.useState('Todas')
	const [sucursales, setSucursales] = React.useState([])
	const { setIsActiveModal, isActiveModal } = useActive();
	const [dateFilter, setDateFilter] = React.useState('');

	const fetchSales = React.useCallback(async () => {
		try {
			setLoading(true)
			// Try SalesService.getSales if available, otherwise call API directly
			let res
			if (SalesService && typeof SalesService.getSalesHistory === 'function') {
				res = await SalesService.getSalesHistory()
			}

			// Normalize response to always be an array
			let ventas = []
			if (!res) ventas = []
			else if (Array.isArray(res)) ventas = res
			else if (Array.isArray(res.ventas)) ventas = res.ventas
			else if (Array.isArray(res.data)) ventas = res.data
			else if (res.result && Array.isArray(res.result)) ventas = res.result
			else if (res.rows && Array.isArray(res.rows)) ventas = res.rows
			else ventas = [res]

			setData(ventas)

		} catch (err) {
			console.error('Error fetching ventas:', err)
			setData([])

		} finally {
			setLoading(false)
		}
	}, [])

	React.useEffect(() => {
		fetchSales()
		// load sucursales for filter
		fetch('/api/sucursales').then(r => r.json()).then(j => setSucursales(j.sucursales || []))
	}, [fetchSales])

	const isMobile = useIsMobile({ breakpoint: 768 })

	// Source data respects loading state
	const sourceData = loading ? [] : data

	// Use custom hook to filter by cliente (search term) — matcher focuses on cliente fields
	const filteredSales = useFilter({
		data: sourceData,
		searchTerm: search,
		selectedDate: dateFilter,
		matcher: (item, term) => {
			if (!term) return true;
			const q = term.toLowerCase();
			return (
				(item.cliente_nombre || '').toLowerCase().includes(q) ||
				(item.cliente || '').toLowerCase().includes(q) ||
				(item.factura_numero?.toString() || '').toLowerCase().includes(q) || // compat
				(item.numero?.toString() || '').toLowerCase().includes(q) // número expuesto por API
			);
		},
	});


	const [mode, setMode] = React.useState('')
	const [selectedSale, setSelectedSale] = React.useState(null)

	const handleSaleUpdate = React.useCallback((update) => {
		if (!update) return;
		setSelectedSale((prev) => {
			if (!prev) return prev;
			const matches = (prev?.id && update.id && prev.id === update.id) ||
				(prev?.ID_FACTURA && update.id && prev.ID_FACTURA === update.id);
			if (!matches) return { ...prev, ...update };
			return {
				...prev,
				subtotal: typeof update.subtotal !== 'undefined' ? update.subtotal : prev.subtotal,
				descuento: typeof update.descuento !== 'undefined' ? update.descuento : prev.descuento,
				total: typeof update.total !== 'undefined' ? update.total : prev.total,
				TOTAL: typeof update.total !== 'undefined' ? update.total : prev.TOTAL,
				total_venta: typeof update.total !== 'undefined' ? update.total : prev.total_venta,
			};
		});
		if (update.id) {
			setData((prevData) => (Array.isArray(prevData) ? prevData.map((item) => {
				const sameId = item?.id === update.id || item?.ID_FACTURA === update.id;
				if (!sameId) return item;
				return {
					...item,
					total: typeof update.total !== 'undefined' ? update.total : item.total,
					total_venta: typeof update.total !== 'undefined' ? update.total : item.total_venta,
					TOTAL: typeof update.total !== 'undefined' ? update.total : item.TOTAL,
					subtotal: typeof update.subtotal !== 'undefined' ? update.subtotal : item.subtotal,
				};
			}) : prevData));
		}
	}, []);

	const toggleModalType = async (type, item = null) => {
		setMode(type)
		if (type === 'ver' && item?.id) {
			const { success, factura } = await SalesService.getSaleDetail(item.id);
			setSelectedSale(success ? factura : null);
			setIsActiveModal(true)
			console.log(factura);

		} else if (type === 'editar') {
			const { success, factura } = await SalesService.getSaleDetail(item.id);
			setSelectedSale(success ? factura : null);
			if (success) {
				setIsActiveModal(true)
			}

		} else if (type === 'print') {

		}
	}

	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
					<InfoCard
						CardTitle={"Total Ventas"}
						cardValue={data.length.toString()}
						cardIconColor={"primary"}
						cardIcon={<FiFile className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
					/>
					<InfoCard
						CardTitle={"Monto Total"}
						cardValue={"C$ " + data.reduce((acc, sale) => acc + (Number(sale.total) || 0), 0).toLocaleString()}
						cardIconColor={"success"}
						cardIcon={<FiDollarSign className='h-4 w-4 md:h-6 md:w-6 text-success' />}
					/>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					<div className='w-full p-4'>
						<div className='w-full flex flex-col mb-4'>
							<h2 className='md:text-2xl font-semibold'>Historial de Ventas</h2>
							<span className='text-sm md:text-medium text-dark/50'>Listado de ventas realizadas</span>
						</div>

						<div className='w-full flex flex-col gap-1 sticky top-0 bg-light pt-2 mb-4'>
							<Input
								placeholder={'Buscar por cliente o N° Factura...'}
								type={'search'}
								iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
							<div className='md:w-1/2 w-full flex gap-2 flex-col md:flex-row'>
								<Input
									type={"date"}
									inputClass={'no icon'}
									value={dateFilter}
									onChange={(e) => setDateFilter(e.target.value)}

								/>
							</div>
						</div>

						{!isMobile ? (
							<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
								<table className='w-full border-collapse'>
									<thead className=' w-full border-b border-dark/20'>
										<tr className='w-full'>
											<th className='text-cebter text-dark/50 font-semibold p-2'>#</th>
											<th className='text-start text-dark/50 font-semibold p-2'>N° Factura</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Fecha</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Cliente</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Total</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Usuario</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{(loading ? [] : filteredSales).map((item, index) => (
											<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
												<td className='p-2 text-center'>
													{index + 1}
												</td>
												<td className='p-2'>
													{item.numero ?? ''}
												</td>
												<td className='p-2 flex flex-col'>
													<span>{item.fecha}</span>
													<span className='text-sm text-dark/60'>{item.hora}</span>
												</td>
												<td className='p-2 text-dark/70 max-w-[180px] truncate'>
													<span className='flex items-center gap-1'>
														<BsBuilding />
														{item.sucursal ? item.sucursal : ''}
													</span>
												</td>
												<td className='p-2'>
													<div className='flex items-center gap-1'>
														<FiUser />
														{item.cliente || 'Consumidor Final'}
													</div>
												</td>
												<td className='p-2 text-center text-primary'>{item.total ? `C$${Number(item.total).toLocaleString()}` : (item.total_venta ? `C$${Number(item.total_venta).toLocaleString()}` : '-')}</td>
												<td className='p-2'>
													<div className='flex items-center gap-1 truncate'>
														<FiUser />
														{item.hecho_por}
													</div>
												</td>
												<td className='p-2 flex justify-center items-center'>
													<div className='flex gap-2 justify-center w-1/2'>
														<Button className={'primary'} icon={<FiEye />} func={() => toggleModalType('ver', item)} />
														<Button className={'blue'} icon={<FiEdit />} func={() => toggleModalType('editar', item)} />
														<Button className={'success'} icon={<FiPrinter />} func={() => toggleModalType('print', item)} />
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='flex flex-col mt-2 gap-2'>
								{filteredSales.map((item, index) => (
									<Card
										productName={item.cliente || 'Consumidor Final'}
										key={index}
										sucursal={item.sucursal || ''}
									>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>N° Factura</span>
											<span className='text-lg font-semibold'>{item.numero ?? ''}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Fecha</span>
											<span className='text-lg font-semibold'>{item.fecha}</span>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Total</span>
											<div className='text-lg font-semibold'>{item.total ? `C$${Number(item.total).toLocaleString()}` : (item.total_venta ? `C$${Number(item.total_venta).toLocaleString()}` : '-')}</div>
										</div>
										<div className='flex flex-col'>
											<span className='text-sm text-dark/70'>Usuario</span>
											<span className='text-lg font-semibold'>{item.hecho_por}</span>
										</div>
										<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
											<Button className={"primary"} text={"Ver"} icon={<FiEye />} func={() => toggleModalType('ver', item)} />
											<Button className={"blue"} text={"Editar"} icon={<FiEdit />} func={() => toggleModalType('editar', item)} />
											<Button className={'success'} text={"Imprimir"} icon={<FiPrinter />} func={() => toggleModalType('print', item)} />
										</div>
									</Card>
								))}
							</div>
						)}
					</div>
				</section>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={mode === 'ver' ? 'Detalles de Venta' : mode === 'editar' ? 'Editar venta' : mode === 'eliminar' ? 'Eliminar venta' : ''}
						modalDescription={mode === 'ver' ? 'Información completa de la transacción' : mode === 'editar' ? 'Editar venta' : mode === 'eliminar' ? 'Eliminar venta' : ''}
						isForm={mode === 'editar' ? true : false}
					>
						{mode === 'ver' && <SaleView sale={selectedSale} onClose={() => setIsActiveModal(false)} onSaleUpdate={handleSaleUpdate} />}
						{mode === 'editar' && <SaleEdit sale={selectedSale} onClose={() => setIsActiveModal(false)} onSaved={() => fetchSales()} />}
						{mode === 'eliminar' && <SaleDelete sale={selectedSale} onClose={() => setIsActiveModal(false)} onDeleted={() => fetchSales()} />}
					</ModalContainer>
				)
			}
		</>
	)
}
