'use client'
import React, { useEffect, useState } from 'react'
import Input from './Input'
import DropdownMenu from './DropdownMenu';
import { CustomerService, ProductService, CotizacionesService } from '@/services';
import { Button } from '../atoms';
import { FiTrash2 } from 'react-icons/fi';

export default function QuoteEdit({ quote, onClose, onSave }) {
	const [clienteNombre, setClienteNombre] = useState(quote?.cliente || '');
	const [clientes, setClientes] = useState([]);
	const [clienteTelefono, setClienteTelefono] = useState(quote?.telefono || '');
	const [clienteFiltrados, setClienteFiltrados] = useState([]);
	const [products, setProducts] = useState([]);
	const [error, setError] = useState();
	const [saving, setSaving] = useState(false);
	const [items, setItems] = useState(() => (
		Array.isArray(quote?.products)
			? quote.products.map(it => ({
				producto_id: it.producto_id,
				productName: it.productName,
				productCode: it.productCode,
				cantidad: Number(it.cantidad || 0),
				unitPrice: Number(it.unitPrice || 0),
				subtotal: Number(it.subtotal ?? (Number(it.cantidad || 0) * Number(it.unitPrice || 0)))
			}))
			: []
	));

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

		const resultados = (clientes || []).filter(cliente =>
			cliente.nombre.toLowerCase().includes(value.toLowerCase())
		);
		setClienteFiltrados(resultados);

		const clienteExistente = (clientes || []).find(cliente =>
			cliente.nombre.toLowerCase() === value.toLowerCase()
		);
		if (clienteExistente) {
			setClienteTelefono(clienteExistente.telefono);
		} else {
			setClienteTelefono("");
		}
	}

	useEffect(() => {
		const getProducts = async () => {
			const res = await ProductService.getProducts();
			const opts = res.map(prod => ({ label: `${prod.PRODUCT_NAME}`, value: prod }))
			setProducts(opts)
		}
		getProducts();
	}, []);

	const handleCantidadChange = (idx, value) => {
		const val = Math.max(1, Number(value || 0));
		setItems(prev => prev.map((it, i) => i === idx ? ({
			...it,
			cantidad: val,
			subtotal: Number((val * Number(it.unitPrice || 0)).toFixed(2))
		}) : it));
	};

	const handleRemoveItem = (idx) => {
		setItems(prev => prev.filter((_, i) => i !== idx));
	};

	const handleSave = async () => {
		try {
			setError('');
			if (!clienteNombre?.trim() || !clienteTelefono?.trim()) {
				setError('Nombre y teléfono son requeridos');
				return;
			}
			if (!items.length) {
				setError('La cotización debe tener al menos un ítem');
				return;
			}
			const payloadItems = items.map(it => ({
				ID_PRODUCT: it.producto_id,
				cantidad: Number(it.cantidad || 0),
				PRECIO: Number(it.unitPrice || 0),
			}));
			const subtotal = items.reduce((acc, it) => acc + Number(it.unitPrice || 0) * Number(it.cantidad || 0), 0);
			const descuento = 0;
			const total = Math.max(0, subtotal - descuento);
			setSaving(true);
			const res = await CotizacionesService.updateQuote({
				id: quote?.id,
				items: payloadItems,
				subtotal: Number(subtotal.toFixed(2)),
				descuento,
				total: Number(total.toFixed(2)),
				cliente: { nombre: clienteNombre, telefono: clienteTelefono },
			});
			setSaving(false);
			if (!res?.success) {
				setError(res?.message || 'No se pudo guardar la cotización');
				return;
			}
			if (onSave) onSave(res);
			else if (onClose) onClose();
		} catch (e) {
			setSaving(false);
			setError(e?.message || 'Error al guardar');
		}
	};

	return (
		<>
			<div className='py-4 w-full'>
				<div className='mb-2 flex gap-4 w-full'>
					<div>
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
						value={clienteTelefono}
						onChange={(e) => setClienteTelefono(e.target.value)}
						inputClass={'no icon'}
					/>
				</div>

				<div className='mt-4'>
					<div className='text-sm text-dark/70 mb-2'>Items</div>
						<div className='flex flex-col gap-2 overflow-y-scroll max-h-[350px]'>
							{(items || []).map((it, idx) => (
							<div key={idx}>
								<div className='p-2 border border-dark/10 rounded-md flex justify-between gap-2'>
									<div className='flex flex-col w-1/10'>
										<div className='text-xs text-dark/60'>Cantidad</div>
										<Input
											type={'number'}
												value={it.cantidad}
												onChange={(e) => handleCantidadChange(idx, e.target.value)}
											inputClass={'no icon'}
										/>
									</div>
									<div className='flex flex-col'>
										<div className='text-xs text-dark/60'>Producto</div>
										<DropdownMenu
											options={products}
												defaultValue={it.productName || ''}
										/>
									</div>
									<div className='flex flex-col'>
										<div className='text-xs text-dark/60'>Precio</div>
											<div className='font-semibold'>C${Number(it.unitPrice || 0).toLocaleString()}</div>
									</div>
									<div className='flex flex-col justify-end items-end'>
										<div className='text-xs text-dark/60'>Subtotal</div>
											<div className='font-semibold'>C${Number(it.subtotal ?? (Number(it.cantidad || 0) * Number(it.unitPrice || 0))).toLocaleString()}</div>
										<div className='mt-2'>
												<Button className={'danger'} icon={<FiTrash2 />} func={() => handleRemoveItem(idx)} />
										</div>
									</div>
								</div>
								{error && <span className='text-danger text-sm'>*{error}</span>}
							</div>
						))}
							{(!items || items.length === 0) && (
							<div className='text-sm text-dark/60'>Sin items para mostrar.</div>
						)}
					</div>
				</div>

				<div className='flex gap-2 mt-4'>
					<Button className={'danger'} text={'Cancelar'} func={onClose} />
					<Button className={'success'} text={saving ? 'Guardando…' : 'Guardar Cambios'} func={saving ? undefined : handleSave} />
				</div>
			</div >
		</>
	)
}
