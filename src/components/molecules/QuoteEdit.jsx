'use client'
import React, { useEffect, useState } from 'react'
import Input from './Input'
import DropdownMenu from './DropdownMenu';
import { CustomerService, ProductService } from '@/services';
import { Button } from '../atoms';
import { FiTrash2 } from 'react-icons/fi';

export default function QuoteEdit({ quote, onClose, onSave }) {
	const [clienteNombre, setClienteNombre] = useState(quote?.cliente || '');
	const [clientes, setClientes] = useState();
	const [clienteTelefono, setClienteTelefono] = useState(quote?.telefono || '');
	const [clienteFiltrados, setClienteFiltrados] = useState({});
	const [products, setProducts] = useState([]);
	const [error, setError] = useState();

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
		const getProducts = async () => {
			const res = await ProductService.getProducts();
			const opts = res.map(prod => ({ label: `${prod.PRODUCT_NAME}`, value: prod }))
			setProducts(opts)
		}
		getProducts();
	}, []);

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
						value={clienteTelefono}
						onChange={handleClienteChange}
						inputClass={'no icon'}
					/>
				</div>

				<div className='mt-4'>
					<div className='text-sm text-dark/70 mb-2'>Items</div>
					<div className='flex flex-col gap-2 overflow-y-scroll max-h-[350px]'>
						{quote?.products.map((it, idx) => (
							<div key={idx}>
								<div className='p-2 border border-dark/10 rounded-md flex justify-between gap-2'>
									<div className='flex flex-col w-1/10'>
										<div className='text-xs text-dark/60'>Cantidad</div>
										<Input
											type={'number'}
											value={it.cantidad}
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
											<Button className={'danger'} icon={<FiTrash2 />} />
										</div>
									</div>
								</div>
								{error && <span className='text-danger text-sm'>*{error}</span>}
							</div>
						))}
					</div>
				</div>

				<div className='flex gap-2 mt-4'>
					<Button className={'danger'} text={'Cancelar'} func={onClose} />
					<Button className={'success'} text={'Guardar Cambios'} />
				</div>
			</div >
		</>
	)
}
