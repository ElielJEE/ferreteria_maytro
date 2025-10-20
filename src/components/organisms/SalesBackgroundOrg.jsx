'use client'
import React from 'react'
import DropdownMenu from '../molecules/DropdownMenu'
import Input from '../molecules/Input'
import Card from '../molecules/Card'
import { FiSearch, FiMoreHorizontal, FiEye, FiEdit, FiTrash, FiUser } from 'react-icons/fi'
import { useActive, useIsMobile } from '@/hooks'
import useFilter from '@/hooks/useFilter'
import { SalesService } from '@/services'
import { Button, ModalContainer } from '../atoms'
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

	const fetchSales = React.useCallback(async () => {
		try {
			setLoading(true)
			// Try SalesService.getSales if available, otherwise call API directly
			let res
			if (SalesService && typeof SalesService.getSales === 'function') {
				res = await SalesService.getSales()
			} else {
				const r = await fetch('/api/ventas')
				res = await r.json().catch(() => ({}))
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
	const clienteFiltered = useFilter({
		data: sourceData,
		searchTerm: search,
		matcher: (item, term) => {
			if (!term) return true
			const q = term.toLowerCase()
			return (item.cliente_nombre || '').toLowerCase().includes(q) || (item.cliente || '').toLowerCase().includes(q)
		}
	})

	// Apply sucursal filter on top of clienteFiltered
	const finalData = clienteFiltered.filter(item => {
		if (!sucursalFilter || sucursalFilter === 'Todas') return true
		return item.sucursal === sucursalFilter
	})

	const [mode, setMode] = React.useState('')
	const [selectedSale, setSelectedSale] = React.useState(null)

	const toggleModalType = async (type, item = null) => {
		setMode(type)
		if (type === 'ver' && item?.id) {
			const { success, factura } = await SalesService.getSaleDetail(item.id);
			setSelectedSale(success ? factura : null);
			setIsActiveModal(true)

		} else if (type === 'editar') {
			const { success, factura } = await SalesService.getSaleDetail(item.id);
			setSelectedSale(success ? factura : null);
			if (success) {
				setIsActiveModal(true)
			}

		} else if (type === 'eliminar') {

		}
	}

	return (
		<>
			<div className='w-full p-4'>
				<section className='w-full flex flex-col mb-4'>
					<h2 className='md:text-2xl font-semibold'>Historial de Ventas</h2>
					<span className='text-sm md:text-medium text-dark/50'>Listado de ventas realizadas</span>
				</section>

				<section className='w-full flex flex-col gap-1 sticky top-0 bg-light pt-2 mb-4'>
					<Input
						placeholder={'Buscar por cliente, producto o código...'}
						type={'search'}
						iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<div className='md:w-1/2 w-full flex gap-2 flex-col md:flex-row'>
						<DropdownMenu
							options={['Todas', ...sucursales.map(s => s.NOMBRE_SUCURSAL)]}
							defaultValue={sucursalFilter}
							onChange={(v) => setSucursalFilter(typeof v === 'string' ? v : v)}
						/>
					</div>
				</section>

				{!isMobile ? (
					<section className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
						<table className='w-full border-collapse'>
							<thead className=' w-full border-b border-dark/20'>
								<tr className='w-full'>
									<th className='text-start text-dark/50 font-semibold p-2'>Fecha</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Cliente</th>
									<th className='text-center text-dark/50 font-semibold p-2'>Total</th>
									<th className='text-start text-dark/50 font-semibold p-2'>Usuario</th>
									<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
								</tr>
							</thead>
							<tbody className='w-full'>
								{(loading ? [] : data)
									.filter(item => {
										if (!search) return true
										const q = search.toLowerCase()
										return (item.producto_nombre || '').toLowerCase().includes(q) || (item.codigo || '').toLowerCase().includes(q) || (item.cliente_nombre || '').toLowerCase().includes(q)
									})
									.filter(item => {
										if (!sucursalFilter || sucursalFilter === 'Todas') return true
										return item.sucursal === sucursalFilter
									})
									.map((item, index) => (
										<tr key={index} className='text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3'>
											<td className='p-2'>{item.fecha || item.fecha_venta || ''}</td>
											<td className='p-2 text-dark/70 max-w-[180px] truncate'>
												<span className='flex items-center gap-1'>
													<BsBuilding />
													{item.sucursal ? item.sucursal : ''}
												</span>
											</td>
											<td className='p-2'>
												<div className='flex items-center gap-1 truncate'>
													<FiUser />
													{item.cliente_nombre || item.cliente || ''}
												</div>
											</td>
											<td className='p-2 text-center'>{item.total ? `C$${Number(item.total).toLocaleString()}` : (item.total_venta ? `C$${Number(item.total_venta).toLocaleString()}` : '-')}</td>
											<td className='p-2'>
												<div className='flex items-center gap-1 truncate'>
													<FiUser />
													{item.hecho_por || item.vendedor || ''}
												</div>
											</td>
											<td className='p-2 flex justify-center items-center'>
												<div className='flex gap-2 justify-center w-1/2'>
													<Button className={'primary'} icon={<FiEye />} func={() => toggleModalType('ver', item)} />
													<Button className={'blue'} icon={<FiEdit />} func={() => toggleModalType('editar', item)} />
													<Button className={'danger'} icon={<FiTrash />} func={() => toggleModalType('eliminar', item)} />
												</div>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</section>
				) : (
					<div className='flex flex-col mt-2 gap-2'>
						{data.map((item, index) => (
							<Card
								productName={item.cliente_nombre || item.cliente || '-'}
								key={index}
								sucursal={item.sucursal || ''}
							>
								<div className='flex flex-col'>
									<span className='text-sm text-dark/70'>Fecha</span>
									<span className='text-lg font-semibold'>{item.fecha || item.fecha_venta}</span>
								</div>
								<div className='flex flex-col'>
									<span className='text-sm text-dark/70'>Total</span>
									<div className='text-lg font-semibold'>{item.total ? `C$${Number(item.total).toLocaleString()}` : (item.total_venta ? `C$${Number(item.total_venta).toLocaleString()}` : '-')}</div>
								</div>
								<div className='flex flex-col'>
									<span className='text-sm text-dark/70'>Usuario</span>
									<span className='text-lg font-semibold'>{item.usuario || item.vendedor || ''}</span>
								</div>
								<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
									<Button className={"none"} text={"Ver"} icon={<FiEye />} />
									<Button className={"none"} text={"Editar"} icon={<FiEdit />} />
									<Button className={"none"} text={"Eliminar"} icon={<FiTrash />} />
								</div>
							</Card>
						))}
					</div>
				)}
			</div>
			{
				isActiveModal && (
					<ModalContainer setIsActiveModal={setIsActiveModal} modalTitle={mode === 'ver' ? 'Ver venta' : mode === 'editar' ? 'Editar venta' : mode === 'eliminar' ? 'Eliminar venta' : ''}>
						{mode === 'ver' && <SaleView sale={selectedSale} onClose={() => setIsActiveModal(false)} />}
						{mode === 'editar' && <SaleEdit sale={selectedSale} onClose={() => setIsActiveModal(false)} onSaved={() => fetchSales()} />}
						{mode === 'eliminar' && <SaleDelete sale={selectedSale} onClose={() => setIsActiveModal(false)} onDeleted={() => fetchSales()} />}
					</ModalContainer>
				)
			}
		</>
	)
}
