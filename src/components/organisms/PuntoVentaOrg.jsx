'use client'
import React, { useEffect, useState } from 'react'
import { Card, Input } from '../molecules'
import { FiPlus, FiSearch, FiShoppingBag, FiShoppingCart, FiUser } from 'react-icons/fi'
import { ProductService } from '@/services';
import { useFilter } from '@/hooks';
import { Button } from '../atoms';

export default function PuntoVentaOrg() {
	const [products, setProducts] = useState([]);
	const [subcategories, setSubcategories] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');

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

	return (
		<div className='w-full p-6 grid grid-cols-3 gap-4'>
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
							>
								<div className='w-full col-span-2'>
									<Button
										className={'primary'}
										text={'Agregar'}
										icon={<FiPlus className='h-4 w-4' />}
									/>
								</div>
							</Card>
						))
					}
				</div>
			</section>
			<section className='w-full flex flex-col gap-4'>
				<div className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
					<div className='flex items-center gap-2'>
						<FiUser className='h-5 w-5 text-dark' />
						<h2 className='md:text-xl font-semibold'>Informacion del Cliente</h2>
					</div>
				</div>
				<div className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
					<div className='flex items-center gap-2'>
						<FiShoppingCart className='h-5 w-5 text-dark' />
						<h2 className='md:text-xl font-semibold'>Catalogo de Productos</h2>
					</div>
				</div>
				<div className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
					<div className='flex items-center gap-2'>
						<FiSearch className='h-5 w-5 text-dark' />
						<h2 className='md:text-xl font-semibold'>Catalogo de Productos</h2>
					</div>
				</div>
			</section>
		</div>
	)
}
