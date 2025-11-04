'use client'
import React, { useEffect, useState } from 'react'
import DropdownMenu from './DropdownMenu';
import Input from './Input';
import { Button } from '../atoms';
import { ProductService } from '@/services';

export default function ReturnView({ returnData, onClose, onSave, productData }) {
	const [productOpts, setProductOpts] = useState([]);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [cantidadDevolver, setCantidadDevolver] = useState(1);
	const [nuevoTotal, setNuevoTotal] = useState(returnData?.total || 0);
	const [totalAPagar, setTotalAPagar] = useState(0);
	const [totalADevolver, setTotalADevolver] = useState(0);
	const [subtotalNuevo, setSubtotalNuevo] = useState(0);

	const productStatus = ['En Buen Estado', 'Dañado'];

	useEffect(() => {
		const fetchProducts = async () => {
			const res = await ProductService.getProducts();
			const opts = res.map(product => ({
				label: product.PRODUCT_NAME,
				value: product
			}));
			setProductOpts(opts);
		};
		fetchProducts();
	}, []);

	const totalOriginal = Number(returnData?.total || 0);

	// 🧮 Recalcular total cada vez que cambia el producto o la cantidad
	useEffect(() => {
		if (!selectedProduct) return;

		// Total de la venta sin el producto devuelto
		const totalSinDevuelto = returnData.items
			.filter(it => it.producto_nombre !== productData.producto_nombre)
			.reduce((acc, it) => acc + it.cantidad * (it.precio_unit || it.precio || 0), 0);

		const productoDevuelto = returnData.items.find(
			it => it.producto_nombre === productData.producto_nombre
		);

		const totalRestar = productoDevuelto.precio_unit * cantidadDevolver;

		// Nuevo producto con su cantidad y precio
		const precioNuevo = selectedProduct.value.PRECIO || 0;
		const subtotalNuevo = precioNuevo * cantidadDevolver;
		setSubtotalNuevo(subtotalNuevo);
		console.log(selectedProduct);
		console.log(subtotalNuevo);
		console.log(productoDevuelto);
		console.log(totalRestar);

		const nuevoTotalCalculado = (totalOriginal - totalRestar) + subtotalNuevo;
		setNuevoTotal(nuevoTotalCalculado);

		// Calcular diferencia
		if (nuevoTotalCalculado > totalOriginal) {
			setTotalAPagar(nuevoTotalCalculado - totalOriginal);
			setTotalADevolver(0);

		} else if (nuevoTotalCalculado < totalOriginal) {
			setTotalADevolver(totalOriginal - nuevoTotalCalculado);
			setTotalAPagar(0);

		} else {
			setTotalAPagar(0);
			setTotalADevolver(0);
		}
	}, [selectedProduct, cantidadDevolver]);

	const handleSubmit = (e) => {
		e.preventDefault();
		onClose && onClose();
		onSave && onSave({
			productReturned: productData,
			productNew: selectedProduct,
			cantidadDevolver,
			nuevoTotal,
			totalAPagar,
			totalADevolver
		});
	};

	return (
		<div>
			<div className='bg-dark/5 py-2 px-4 rounded-lg flex flex-col mt-4 sm:w-120 w-full'>
				<h2 className='text-medium font-semibold'>{productData?.producto_nombre || ''}</h2>
				<span className='text-dark/60'>
					Cantidad: {productData?.cantidad || ''} | Cliente: {returnData?.cliente?.nombre || ''}
				</span>
			</div>

			<form className='grid grid-cols-2 gap-4 mt-4' onSubmit={handleSubmit}>
				<DropdownMenu
					label='Estado del producto'
					defaultValue='Selecciona un Estado'
					options={productStatus.map(s => ({ label: s, value: s }))}
				/>
				<Input
					label='Cantidad a devolver'
					type='number'
					inputClass='no icon'
					min={1}
					max={productData?.cantidad}
					value={cantidadDevolver}
					onChange={(e) => setCantidadDevolver(Number(e.target.value))}
				/>
				<div className='col-span-2'>
					<DropdownMenu
						label='Producto nuevo'
						defaultValue={productData.producto_nombre}
						options={productOpts}
						onChange={(opt) => setSelectedProduct(opt)}
					/>
				</div>
				<Input
					label='Motivo'
					isTextarea
					placeholder='Ingrese motivo de la devolución...'
					inputClass='no icon'
				/>

				{/* Totales */}
				<div className='flex flex-col gap-2 mt-2'>
					<div className='flex justify-between'>
						<span className='font-semibold'>Total original:</span>
						<span>C$ {totalOriginal.toLocaleString()}</span>
					</div>
					<div className='flex justify-between'>
						<span className='font-semibold'>Total nuevo:</span>
						<span>C$ {nuevoTotal.toLocaleString()}</span>
					</div>
					<div className='flex justify-between'>
						<span className='font-semibold'>Subtotal:</span>
						<span>C$ {subtotalNuevo.toLocaleString()}</span>
					</div>
					<div className='flex justify-between'>
						<span className='font-semibold'>Total a pagar:</span>
						<span className='text-green-600'>
							{totalAPagar > 0 ? `C$ ${totalAPagar.toLocaleString()}` : 'C$ 0'}
						</span>
					</div>
					<div className='flex justify-between'>
						<span className='font-semibold'>Total a devolver:</span>
						<span className='text-red-600'>
							{totalADevolver > 0 ? `C$ ${totalADevolver.toLocaleString()}` : 'C$ 0'}
						</span>
					</div>
				</div>

				<div className='flex gap-4 col-span-2'>
					<Button text='Cerrar' className='secondary' func={onClose} />
					<Button text='Procesar' className='success' type='submit' />
				</div>
			</form>
		</div>
	);
}
