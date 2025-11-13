'use client'
import React, { useEffect, useState } from 'react'
import DropdownMenu from './DropdownMenu';
import Input from './Input';
import { Button } from '../atoms';
import { ProductService, ReturnsService } from '@/services';

export default function ReturnView({ returnData, onClose, onSave, productData }) {
	const [productOpts, setProductOpts] = useState([]);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [cantidadDevolver, setCantidadDevolver] = useState(1);
	const [nuevoTotal, setNuevoTotal] = useState(returnData?.total || 0);
	const [totalAPagar, setTotalAPagar] = useState(0);
	const [totalADevolver, setTotalADevolver] = useState(0);
	const [subtotalNuevo, setSubtotalNuevo] = useState(0);
	const [estado, setEstado] = useState('BUENO');
	const [motivo, setMotivo] = useState('');

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

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const mapEstado = (val) => {
				if (!val) return 'BUENO';
				const t = val.toString().toLowerCase();
				if (t.includes('dañ')) return 'DANIADO';
				return 'BUENO';
			};
			const payload = {
				factura_id: returnData?.id,
				detalle_id: productData?.detalle_id,
				producto_id: productData?.producto_id || productData?.ID_PRODUCT,
				cantidad: Number(cantidadDevolver || 0),
				estado: mapEstado(estado),
				motivo: motivo || null,
			};
			if (selectedProduct && selectedProduct.value && selectedProduct.value.ID_PRODUCT) {
				payload.reemplazo = {
					producto_id: selectedProduct.value.ID_PRODUCT,
					cantidad: Number(cantidadDevolver || 0),
				};
			}
			const res = await ReturnsService.createReturn(payload);
			if (res?.ok) {
				try { window.dispatchEvent(new CustomEvent('returns:updated')); } catch {}
				onSave && onSave(res);
				onClose && onClose();
			} else {
				console.error('Error creando devolución:', res);
				alert(res?.error || res?.message || 'No se pudo procesar la devolución');
			}
		} catch (err) {
			console.error('handleSubmit devolución:', err);
			alert(err?.message || 'Error procesando la devolución');
		}
	};

	return (
		<div>
			<div className='bg-dark/5 py-2 px-4 rounded-lg flex flex-col mt-4 sm:w-120 w-full'>
				<h2 className='text-medium font-semibold'>{productData?.producto_nombre || ''}</h2>
				<span className='text-dark/60'>
					Cantidad: {productData?.cantidad || ''}
					{(() => {
						const unidadNombre = productData?.unidad || productData?.unit || productData?.unidad_nombre || productData?.unit_name || productData?.UNIDAD_NOMBRE || '';
						const cantidadPor = Number(productData?.cantidad_por_unidad || productData?.CANTIDAD_POR_UNIDAD || 0);
						if (unidadNombre) {
							return (<span> | Unidad: {unidadNombre}{(cantidadPor !== 0 && cantidadPor !== 1) ? (<small className='text-dark/50'> — x {cantidadPor} por unidad</small>) : null}</span>)
						}
						return null;
					})()}
					 | Cliente: {returnData?.cliente?.nombre || ''}
				</span>
			</div>

			<form className='grid grid-cols-2 gap-4 mt-4' onSubmit={handleSubmit}>
				<DropdownMenu
					label='Estado del producto'
					defaultValue='Selecciona un Estado'
					options={productStatus.map(s => ({ label: s, value: s }))}
					onChange={(opt) => setEstado(opt?.value || 'BUENO')}
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
					value={motivo}
					onChange={(e) => setMotivo(e.target.value)}
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
