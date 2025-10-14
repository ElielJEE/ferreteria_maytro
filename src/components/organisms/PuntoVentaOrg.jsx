'use client'
import React, { useEffect, useState } from 'react'
import { Card, Input } from '../molecules'
import { FiPlus, FiSearch, FiShoppingBag, FiShoppingCart, FiTrash, FiTrash2, FiUser, FiX } from 'react-icons/fi'
import { ProductService } from '@/services';
import { useFilter } from '@/hooks';
import { Button } from '../atoms';
import { BsCalculator } from 'react-icons/bs';

export default function PuntoVentaOrg() {
	const [products, setProducts] = useState([]);
	const [subcategories, setSubcategories] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [productList, setProductList] = useState([])

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const [productsData, subcats] = await Promise.all([
					ProductService.getProducts(),
					ProductService.getSubcategories()
				]);
				setProducts(productsData);
				setSubcategories(subcats);
				console.log(productsData, subcats);
			} catch (error) {
				console.error(error)
			}
		}
		fetchAll();
	}, []);

	const filteredProducts = useFilter({
		data: products.map(p => ({
			...p,
			category: p.NOMBRE_SUBCATEGORIA,
		})),
		searchTerm,
		matcher: (item, term) =>
			item.PRODUCT_NAME.toLowerCase().includes(term.toLowerCase()) ||
			item.CODIGO_PRODUCTO.toLowerCase().includes(term.toLowerCase()) ||
			item.NOMBRE_SUBCATEGORIA.toLowerCase().includes(term.toLowerCase())
	});

	const addToProductList = (product) => {
		setProductList((prevList) => {
			const existingProduct = prevList.find(
				(item) => item.ID_PRODUCT === product.ID_PRODUCT
			);

			if (existingProduct) {
				const newQuantity = existingProduct.quantity + 1;
				if (newQuantity > product.CANTIDAD) {
					return prevList;
				}
				return prevList.map((item) =>
					item.ID_PRODUCT === product.ID_PRODUCT
						? { ...item, quantity: newQuantity }
						: item
				);
			} else {
				return [...prevList, { ...product, quantity: 1 }];
			}
		});
	};

	const updateQuantity = (id, newQuantity) => {
		setProductList((prevList) =>
			prevList.map((item) => {
				if (item.ID_PRODUCT === id) {
					// Validaciones de límites
					if (newQuantity < 1) newQuantity = 1;
					if (newQuantity > item.CANTIDAD) {
						newQuantity = item.CANTIDAD;
					}
					return { ...item, quantity: newQuantity };
				}
				return item;
			})
		);
	};

	const removeFromProductList = (id) => {
		setProductList((prevList) =>
			prevList.filter((item) => item.ID_PRODUCT !== id)
		);
	};

	return (
		<div className='w-full p-6 grid grid-cols-3 items-start gap-4'>
			<section className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4 col-span-2'>
				<div className='flex flex-col'>
					<div className='flex items-center gap-2'>
						<FiSearch className='h-6 w-6 text-dark' />
						<h2 className='md:text-2xl font-semibold'>Catalogo de Productos</h2>
					</div>
					<span className='text-sm md:text-medium text-dark/50'>Busca productos por nombre, codigo o categoria</span>
					<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-2'>
						<Input
							placeholder={"Buscar producto..."}
							type={"search"}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
						/>
					</div>
				</div>
				<div className='grid grid-cols-2 gap-2 max-h-[calc(100vh-280px)] overflow-y-scroll'>
					{
						filteredProducts.map((item, index) => (
							<Card
								key={index}
								productName={item.PRODUCT_NAME}
								id={"Codigo: " + item.CODIGO_PRODUCTO}
								category={item.NOMBRE_SUBCATEGORIA}
								bgColor={'secondary'}
								price={item.PRECIO}
								stock={item.CANTIDAD}
							>
								<div className='w-full col-span-2'>
									<Button
										className={'primary'}
										text={'Agregar'}
										icon={<FiPlus className='h-4 w-4' />}
										func={(e) => addToProductList(item)}
									/>
								</div>
							</Card>
						))
					}
				</div>
			</section>
			<section className='w-full flex flex-col gap-4 max-h-[617px] overflow-y-auto'>
				<div className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
					<div className='flex items-center gap-2'>
						<FiUser className='h-5 w-5 text-dark' />
						<h2 className='md:text-xl font-semibold'>Informacion del Cliente</h2>
					</div>
					<div className="flex flex-col w-full">
						<Input
							label={"Nombre"}
							placeholder={"Ingrese nombre del cliente"}
							inputClass={"no icon"}
						/>
						<Input
							label={"Telefono"}
							placeholder={"Ingrese numero de telefono del cliente"}
							inputClass={"no icon"}
						/>
					</div>
				</div>
				<div className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
					<div className='flex items-center gap-2'>
						<FiShoppingCart className='h-5 w-5 text-dark' />
						<h2 className='md:text-xl font-semibold'>Lista de compras ({productList.length})</h2>
					</div>
					<div className='flex flex-col max-h-[300px] gap-2 overflow-y-auto'>
						{!productList.length
							? <span className="text-dark/70 text-medium w-full text-center">No hay productos en la lista</span>
							: (
								productList.map((product, index) => (
									<div
										key={index}
										className='w-full flex items-center justify-between border rounded-lg border-dark/20 p-2'
									>
										<div className='flex flex-col'>
											<span className='font-semibold'>{product.PRODUCT_NAME}</span>
											<span className='text-sm text-dark/70'>
												Código: {product.CODIGO_PRODUCTO}
											</span>
											<div className='flex items-center gap-2 mt-1'>
												<input
													type='number'
													min='1'
													max={product.CANTIDAD}
													value={product.quantity}
													onChange={(e) =>
														updateQuantity(product.ID_PRODUCT, parseInt(e.target.value) || 1)
													}
													className='w-16 text-center border border-dark/20 rounded-md p-1'
												/>
											</div>
										</div>

										<div className='flex flex-col items-end gap-2'>
											<Button
												className={'noneTwo'}
												text={''}
												icon={<FiTrash2 className='h-5 w-5 text-danger' />}
												func={() => removeFromProductList(product.ID_PRODUCT)}
											/>
											<div className='flex flex-col items-end'>
												<span className='font-semibold text-primary text-lg'>
													${(product.PRECIO * product.quantity).toFixed(2)}
												</span>
												<span className='text-dark/70 text-sm'>
													${product.PRECIO} c/u
												</span>
											</div>
										</div>
									</div>
								))
							)
						}
					</div>
				</div>
				<div className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
					<div className='flex items-center gap-2'>
						<BsCalculator className='h-5 w-5 text-dark' />
						<h2 className='md:text-xl font-semibold'>Resumen de Venta</h2>
					</div>
					<div className='flex flex-col gap-2'>
						<div className='flex justify-between'>
							<span className='text-dark/70'>Subtotal:</span>
							<span className='font-semibold'>${productList.reduce((acc, item) => acc + item.PRECIO * item.quantity, 0).toFixed(2)}</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-dark/70'>Descuento:</span>
							<span className='font-semibold'>${(0).toFixed(2)}</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-dark/70'>Total:</span>
							<span className='font-semibold text-primary text-lg'>${productList.reduce((acc, item) => acc + item.PRECIO * item.quantity, 0).toFixed(2)}</span>
						</div>
					</div>
					<Button
						className={'success'}
						text={'Procesar Venta'}
						icon={<FiShoppingBag className='h-5 w-5' />}
						func={() => alert('Venta procesada')}
					/>
				</div>
			</section>
		</div>
	)
}
