'use client'
import React, { useEffect, useState } from 'react'
import Input from './Input';
import DropdownMenu from './DropdownMenu';
import { Button } from '../atoms';
import { CustomerService, ProductService } from '@/services';

export default function ReturnEdit({ returnData, onClose, onSaved }) {
	const [cliente, setCliente] = useState(returnData?.cliente || '');
	const [clientes, setClientes] = useState([]);
	const [filteredCliente, setFilteredCliente] = useState('');
	const [clienteTelefono, setClienteTelefono] = useState(returnData?.telefono || '');
	const [products, setProducts] = useState([]);

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
		setCliente(value);

		const resultados = clientes.filter(cliente =>
			cliente.nombre.toLowerCase().includes(value.toLowerCase())
		);
		setFilteredCliente(resultados);

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
		const fetchProducts = async () => {
			const res = await ProductService.getProducts();
			const opts = res.map(prod => ({ label: `${prod.PRODUCT_NAME}`, value: prod }));
			setProducts(opts);
		}
		fetchProducts();
	}, [])

	const handleSubmit = (e) => {
		e.preventDefault();

		onClose && onClose();
		onSaved && onSaved();
	}

	return (
		<div>
			<form action="" className='flex flex-col gap-4 mt-4' onSubmit={(e) => handleSubmit(e)}>
				<div className='relative'>
					<Input
						label={'Cliente'}
						placeholder={'Nombre del cliente...'}
						inputClass={'no icon'}
						value={cliente}
						onChange={handleClienteChange}
					/>
					{filteredCliente.length > 0 && cliente !== "" && (
						<ul className='w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10 absolute'>
							{filteredCliente.map((clientes, index) => (
								<li
									key={index}
									onClick={() => {
										setCliente(clientes.nombre)
										setClienteTelefono(clientes.telefono)
										setFilteredCliente({})
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
					label={'Telefono'}
					placeholder={'Telefono del cliente...'}
					inputClass={'no icon'}
					value={clienteTelefono}
					onChange={(e) => setClienteTelefono(e.target.value)}
				/>
				<div className='col-span-2 flex gap-4'>
					<DropdownMenu
						label={'Producto'}
						options={products}
						defaultValue={returnData?.productName || ''}
					/>
					<Input
						label={'cantidad'}
						type={'number'}
						inputClass={'no icon'}
						value={returnData?.cantidad}
						min={'0'}
					/>
				</div>
				<Input
					label={'motivo'}
					isTextarea={true}
					placeholder={'Ingrese motivo de devolucion...'}
					inputClass={'no icon'}
					value={returnData?.motivo}
				/>
				<div className='flex gap-4 w-full'>
					<Button
						text={'Cancelar'}
						className={'secondary'}
						func={onClose}
					/>
					<Button
						text={'Guardar'}
						className={'success'}
					/>
				</div>
			</form>
		</div>
	)
}
