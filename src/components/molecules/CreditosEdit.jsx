'use client'
import React, { useEffect, useState } from 'react'
import Input from './Input';
import { ProductService } from '@/services';
import DropdownMenu from './DropdownMenu';
import { Button } from '../atoms';
import { FiTrash2 } from 'react-icons/fi';

export default function CreditosEdit({ creditData, onClose, onSave }) {
	const [cliente, setCliente] = useState(creditData.cliente?.nombre || '');
	const [telefono, setTelefono] = useState(creditData.cliente?.telefono || '');
	const [productsOptions, setProductsOptions] = useState([]);

	useEffect(() => {
		const fetchProducts = async () => {
			const res = await ProductService.getProducts();
			const opts = res.map(producto => ({ label: `${producto.PRODUCT_NAME}`, value: producto }));
			setProductsOptions(opts)
		}
		fetchProducts();
	}, [])

	console.log(creditData);

	return (
		<div className='py-4'>
			<div className='mb-2'>
				<div className='text-sm text-dark/70'>Editar cliente</div>
				<Input
					value={cliente}
					onChange={(e) => setCliente(e.target.value)}
					inputClass={'no icon'}
				/>
				<Input
					value={telefono}
					onChange={(e) => setTelefono(e.target.value)}
					inputClass={'no icon'}
					placeholder={'Teléfono'}
				/>
			</div>

			<div className='mt-4'>
				<div className='text-sm text-dark/70 mb-2'>Items</div>
				<div className='flex flex-col gap-2'>
					{creditData?.items?.map((it, idx) => (
						<div key={idx}>
							<div className='p-2 border border-dark/10 rounded-md flex justify-between gap-2'>
								<div className='flex flex-col w-1/10'>
									<div className='text-xs text-dark/60'>Cantidad</div>
									<Input
										type={'number'}
										value={it?.cantidad}
										inputClass={'no icon'}
									/>
								</div>
								<div className='flex flex-col'>
									<div className='text-xs text-dark/60'>Producto</div>
									<DropdownMenu
										options={productsOptions}
										defaultValue={it.productName || ''}
									/>
								</div>
								<div className='flex flex-col'>
									<div className='text-xs text-dark/60'>Precio</div>
									<div className='font-semibold'>C${Number(it.unitPrice || 0).toLocaleString()}</div>
								</div>
								<div className='flex flex-col justify-end items-end'>
									<div className='text-xs text-dark/60'>Subtotal</div>
									<div className='font-semibold'>C${Number(it.cantidad || 0) * Number(it.unitPrice || 0).toLocaleString()}</div>
									<div className='mt-2'>
										<Button className={'danger'} icon={<FiTrash2 />} />
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className='flex gap-2 mt-4'>
				<Button className={'danger'} text={'Cancelar'} func={onClose} />
				<Button className={'success'} text={'Guardar Cambios'} func={async () => {
					// call API to update client for this credit
					try {
						const payload = { id: creditData.id, clienteNombre: cliente, clienteTelefono: telefono };
						const res = await (await import('@/services/CreditosService')).default.updateCredit(payload);
						if (res && res.success) {
							onSave && onSave(res);
							onClose && onClose();
						} else {
							console.error('Error updating credit:', res);
						}
					} catch (e) { console.error(e); }
				}} />
			</div>
		</div>
	)
}
