'use client'
import React, { useEffect, useMemo, useState } from 'react'
import DropdownMenu from './DropdownMenu';
import Input from './Input';
import { Button, SwitchButton } from '../atoms';
import { ProductService, ReturnsService } from '@/services';

const parseNumber = (value) => {
	const num = Number(value ?? 0);
	return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value) => `C$ ${parseNumber(value).toLocaleString('es-NI', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})}`;

export default function ReturnView({ returnData, onClose, onSave, productData }) {
	const [productOpts, setProductOpts] = useState([]);
	const [replacementUnits, setReplacementUnits] = useState([]);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [selectedUnit, setSelectedUnit] = useState(null);
	const [cantidadDevolver, setCantidadDevolver] = useState(1);
	const [estado, setEstado] = useState('BUENO');
	const [motivo, setMotivo] = useState('');
	const [mostrar, setMostrar] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState(null);
	const [submitSuccess, setSubmitSuccess] = useState(false);
	const [hasServerTotals, setHasServerTotals] = useState(false);
	const [serverTotals, setServerTotals] = useState(null);
	const [nuevoTotal, setNuevoTotal] = useState(0);
	const [totalAPagar, setTotalAPagar] = useState(0);
	const [totalADevolver, setTotalADevolver] = useState(0);
	const [subtotalReemplazo, setSubtotalReemplazo] = useState(0);
	const [lineaDevuelta, setLineaDevuelta] = useState(0);
	const [descuentoAsignado, setDescuentoAsignado] = useState(0);
	const [totalOriginal, setTotalOriginal] = useState(0);
	const [subtotalFactura, setSubtotalFactura] = useState(0);
	const [descuentoFactura, setDescuentoFactura] = useState(0);
	const [refundAmount, setRefundAmount] = useState(0);

	const productStatus = useMemo(() => ['En Buen Estado', 'Dañado'], []);

	useEffect(() => {
		const fetchProducts = async () => {
			try {
				const res = await ProductService.getProducts();
				const opts = (res || []).map(product => ({
					label: product?.PRODUCT_NAME ? `${product.PRODUCT_NAME}${product?.CODIGO_PRODUCTO ? ` (${product.CODIGO_PRODUCTO})` : ''}` : product?.nombre || 'Producto sin nombre',
					value: product,
				}));
				setProductOpts(opts);
			} catch (error) {
				console.error('Error cargando productos para reemplazo', error);
			}
		};
		fetchProducts();
	}, []);

	useEffect(() => {
		const subtotalFromItems = () => {
			if (!Array.isArray(returnData?.items)) return 0;
			return returnData.items.reduce((acc, item) => {
				const qty = parseNumber(item?.cantidad ?? item?.AMOUNT ?? item?.qty);
				const price = parseNumber(item?.precio_unit ?? item?.PRECIO_UNIT ?? item?.precio ?? item?.PRECIO);
				const subtotal = parseNumber(item?.subtotal ?? item?.SUB_TOTAL);
				if (subtotal) return acc + subtotal;
				return acc + (qty * price);
			}, 0);
		};

		const subtotal = (() => {
			const provided = parseNumber(returnData?.subtotal ?? returnData?.SUBTOTAL);
			if (provided) return provided;
			const computed = subtotalFromItems();
			if (computed) return computed;
			return parseNumber(returnData?.total ?? returnData?.total_venta ?? returnData?.TOTAL);
		})();

		const descuento = (() => {
			const direct = parseNumber(returnData?.descuento ?? returnData?.DESCUENTO);
			if (direct) return direct;
			const discObj = returnData?.discount;
			if (discObj && typeof discObj === 'object') {
				return parseNumber(discObj?.monto ?? discObj?.MONTO ?? discObj?.valor);
			}
			return 0;
		})();

		const total = (() => {
			const provided = parseNumber(returnData?.total ?? returnData?.total_venta ?? returnData?.TOTAL);
			if (provided) return provided;
			return Math.max(0, subtotal - descuento);
		})();

		setSubtotalFactura(subtotal);
		setDescuentoFactura(descuento);
		setTotalOriginal(total);
		setNuevoTotal(total);
	}, [returnData]);

	const cantidadVendida = useMemo(() => parseNumber(productData?.cantidad ?? productData?.AMOUNT ?? productData?.cantidad_vendida), [productData]);
	const precioOriginal = useMemo(() => {
		const price = parseNumber(productData?.precio_unit ?? productData?.PRECIO_UNIT ?? productData?.precio ?? productData?.PRECIO);
		if (price) return price;
		const subtotalLinea = parseNumber(productData?.subtotal ?? productData?.SUB_TOTAL);
		if (cantidadVendida > 0 && subtotalLinea) return subtotalLinea / cantidadVendida;
		return 0;
	}, [productData, cantidadVendida]);

	useEffect(() => {
		if (cantidadVendida <= 0) return;
		if (cantidadDevolver > cantidadVendida) {
			setCantidadDevolver(cantidadVendida);
		}
		if (cantidadDevolver < 1) {
			setCantidadDevolver(1);
		}
	}, [cantidadVendida]);

	useEffect(() => {
		if (hasServerTotals) return;
		const qty = Math.max(0, Math.min(parseNumber(cantidadDevolver), cantidadVendida || parseNumber(productData?.cantidad || 0)));
		const lineaDev = parseNumber(qty * precioOriginal);
		setLineaDevuelta(lineaDev);
		const descuentoLinea = subtotalFactura > 0 ? parseNumber((lineaDev / subtotalFactura) * descuentoFactura) : 0;
		setDescuentoAsignado(descuentoLinea);

		let subtotalReempCalc = 0;
		if (mostrar && selectedProduct) {
			const unitPrice = selectedUnit ? parseNumber(selectedUnit.value?.PRECIO ?? selectedUnit.value?.precio) : parseNumber(selectedProduct.value?.PRECIO ?? selectedProduct.value?.precio);
			subtotalReempCalc = parseNumber(qty * unitPrice);
		}
		setSubtotalReemplazo(subtotalReempCalc);

		const subtotalNuevoCalc = Math.max(0, subtotalFactura - lineaDev + subtotalReempCalc);
		const totalNuevoCalc = Math.max(0, subtotalNuevoCalc - descuentoFactura);
		setNuevoTotal(totalNuevoCalc);
		const diff = totalNuevoCalc - totalOriginal;
		if (diff > 0) {
			setTotalAPagar(diff);
			setTotalADevolver(0);
		} else if (diff < 0) {
			setTotalADevolver(Math.abs(diff));
			setTotalAPagar(0);
		} else {
			setTotalAPagar(0);
			setTotalADevolver(0);
		}
	}, [cantidadDevolver, cantidadVendida, descuentoFactura, hasServerTotals, mostrar, precioOriginal, productData, selectedProduct, selectedUnit, subtotalFactura, totalOriginal]);

	const resetServerState = () => {
		setHasServerTotals(false);
		setServerTotals(null);
		setRefundAmount(0);
		setSubmitSuccess(false);
	};

	const handleSelectProduct = async (opt) => {
		setSelectedProduct(opt);
		setSelectedUnit(null);
		setReplacementUnits([]);
		resetServerState();
		if (!opt?.value?.ID_PRODUCT) return;
		try {
			const units = await ProductService.getProductUnits(opt.value.ID_PRODUCT);
			const mapped = (units || []).map(unit => ({
				label: unit?.NOMBRE ? `${unit.NOMBRE}${unit?.CANTIDAD_POR_UNIDAD ? ` • x${unit.CANTIDAD_POR_UNIDAD}` : ''}` : `Unidad ${unit?.UNIDAD_ID || ''}`,
				value: unit,
			}));
			setReplacementUnits(mapped);
			const defaultUnit = mapped.find(u => u?.value?.ES_POR_DEFECTO) || mapped[0] || null;
			setSelectedUnit(defaultUnit || null);
		} catch (error) {
			console.error('Error obteniendo unidades del producto seleccionado', error);
		}
	};

	const handleToggleReplace = (value) => {
		setMostrar(value);
		if (!value) {
			setSelectedProduct(null);
			setSelectedUnit(null);
			setReplacementUnits([]);
		}
		resetServerState();
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSubmitError(null);
		setSubmitSuccess(false);
		setIsSubmitting(true);
		resetServerState();
		try {
			const mapEstado = (val) => {
				if (!val) return 'BUENO';
				const t = val.toString().toLowerCase();
				if (t.includes('dañ')) return 'DANIADO';
				return 'BUENO';
			};
			const payload = {
				factura_id: returnData?.id ?? returnData?.ID_FACTURA ?? null,
				detalle_id: productData?.detalle_id ?? productData?.ID_DETALLES_FACTURA ?? null,
				producto_id: productData?.producto_id ?? productData?.ID_PRODUCT ?? productData?.id ?? null,
				cantidad: parseNumber(cantidadDevolver || 0),
				estado: mapEstado(estado),
				motivo: motivo || null,
			};
			if (!payload.producto_id) {
				throw new Error('No se pudo determinar el producto original.');
			}
			if (payload.cantidad <= 0) {
				throw new Error('Ingrese una cantidad válida a devolver.');
			}
			if (mostrar && selectedProduct?.value?.ID_PRODUCT) {
				payload.reemplazo = {
					producto_id: selectedProduct.value.ID_PRODUCT,
					cantidad: payload.cantidad,
				};
				if (selectedUnit?.value?.UNIDAD_ID) {
					payload.reemplazo.unidad_id = selectedUnit.value.UNIDAD_ID;
				}
			}
			const res = await ReturnsService.createReturn(payload);
			if (res?.ok) {
				const totals = res.totals || null;
				setServerTotals(totals);
				if (totals) {
					setTotalOriginal(parseNumber(totals.total_original));
					setSubtotalFactura(parseNumber(totals.subtotal_original));
					setDescuentoFactura(parseNumber(totals.descuento));
					setNuevoTotal(parseNumber(totals.total_nuevo));
					setSubtotalReemplazo(parseNumber(totals.subtotal_reemplazo));
					setTotalAPagar(parseNumber(totals.total_a_pagar));
					const totalDev = parseNumber(totals.total_a_devolver);
					setTotalADevolver(totalDev);
					setLineaDevuelta(parseNumber(totals.linea_bruta_devuelta));
					setDescuentoAsignado(parseNumber(totals.descuento_prorrateado));
				}
				setRefundAmount(parseNumber(res.refund));
				setHasServerTotals(true);
				setSubmitSuccess(true);
				try { window.dispatchEvent(new CustomEvent('returns:updated')); } catch { /* ignore */ }
				onSave && onSave(res, { payload, totals, refund: res.refund ?? null });
			} else {
				throw new Error(res?.error || res?.message || 'No se pudo procesar la devolución');
			}
		} catch (err) {
			console.error('handleSubmit devolución:', err);
			setSubmitError(err?.message || 'Error procesando la devolución');
		} finally {
			setIsSubmitting(false);
		}
	};

	const resumenRefund = hasServerTotals ? (serverTotals?.total_a_devolver ?? refundAmount) : Math.max(totalADevolver, refundAmount);

	return (
		<div>
			<div className='bg-dark/5 py-2 px-4 rounded-lg flex flex-col mt-4 sm:w-120 w-full'>
				<h2 className='text-medium font-semibold'>{productData?.producto_nombre || productData?.PRODUCT_NAME || ''}</h2>
				<span className='text-dark/60'>
					Cantidad: {cantidadVendida || productData?.cantidad || productData?.AMOUNT || ''}
					{(() => {
						const unidadNombre = productData?.unidad || productData?.unit || productData?.unidad_nombre || productData?.unit_name || productData?.UNIDAD_NOMBRE || '';
						const cantidadPor = parseNumber(productData?.cantidad_por_unidad ?? productData?.CANTIDAD_POR_UNIDAD);
						if (unidadNombre) {
							return (<span> | Unidad: {unidadNombre}{(cantidadPor && cantidadPor !== 1) ? (<small className='text-dark/50'> — x {cantidadPor} por unidad</small>) : null}</span>);
						}
						return null;
					})()}
				</span>
				<span className='text-dark/60'>Cliente: {returnData?.cliente?.nombre || ''}</span>
			</div>

			{submitError && (
				<div className='mt-3 px-3 py-2 rounded-md bg-red-100 text-red-700 text-sm'>
					{submitError}
				</div>
			)}
			{submitSuccess && (
				<div className='mt-3 px-3 py-2 rounded-md bg-green-100 text-green-700 text-sm'>
					Devolución procesada correctamente.
				</div>
			)}

			<form className='grid grid-cols-2 gap-4 mt-4' onSubmit={handleSubmit}>
				<DropdownMenu
					label='Estado del producto'
					defaultValue='Selecciona un Estado'
					options={productStatus.map(s => ({ label: s, value: s }))}
					onChange={(opt) => {
						setEstado(opt?.value || 'BUENO');
						resetServerState();
					}}
				/>
				<Input
					label='Cantidad a devolver'
					type='number'
					inputClass='no icon'
					min={1}
					max={cantidadVendida || productData?.cantidad}
					value={cantidadDevolver}
					onChange={(e) => {
						setCantidadDevolver(parseNumber(e.target.value));
						resetServerState();
					}}
					disabled={isSubmitting || submitSuccess}
				/>
				<SwitchButton
					text={'Cambiar por otro?'}
					onToggle={handleToggleReplace}
				/>
				{mostrar && (
					<>
						<div className='col-span-2 flex flex-col xl:flex-row gap-4'>
							<DropdownMenu
								label='Producto nuevo'
								defaultValue='Selecciona un producto'
								options={productOpts}
								onChange={handleSelectProduct}
							/>
							<DropdownMenu
								label={'Unidad de medida'}
								defaultValue={selectedUnit?.label || 'Selecciona una unidad'}
								options={replacementUnits}
								onChange={(opt) => {
									setSelectedUnit(opt);
									resetServerState();
								}}
							/>
						</div>
					</>
				)}
				<div className='col-span-2 grid grid-cols-2 gap-4 justify-between w-full'>
					<Input
						label='Motivo'
						isTextarea
						placeholder='Ingrese motivo de la devolución...'
						inputClass='no icon'
						value={motivo}
						onChange={(e) => {
							setMotivo(e.target.value);
							resetServerState();
						}}
						disabled={submitSuccess}
					/>
					<div className='flex flex-col gap-1 mt-2 bg-dark/10 p-3 rounded-lg w-full text-sm'>
						<div className='flex justify-between border-b pb-1 border-dark/30'>
							<span className='font-semibold'>Total original</span>
							<span>{formatCurrency(totalOriginal)}</span>
						</div>
						<div className='flex justify-between border-b pb-1 border-dark/30'>
							<span className='font-semibold'>Total nuevo</span>
							<span>{formatCurrency(nuevoTotal)}</span>
						</div>
						<div className='flex justify-between border-b pb-1 border-dark/30'>
							<span className='font-semibold'>Subtotal devuelto</span>
							<span>{formatCurrency(lineaDevuelta)}</span>
						</div>
						<div className='flex justify-between border-b pb-1 border-dark/30'>
							<span className='font-semibold'>Subtotal reemplazo</span>
							<span>{formatCurrency(subtotalReemplazo)}</span>
						</div>
						<div className='flex justify-between border-b pb-1 border-dark/30'>
							<span className='font-semibold'>Descuento aplicado</span>
							<span>{formatCurrency(descuentoAsignado)}</span>
						</div>
						<div className='flex justify-between border-b pb-1 border-dark/30'>
							<span className='font-semibold'>Total a pagar</span>
							<span className='text-green-600'>{formatCurrency(totalAPagar)}</span>
						</div>
						<div className='flex justify-between'>
							<span className='font-semibold'>Total a devolver</span>
							<span className='text-red-600'>{formatCurrency(resumenRefund)}</span>
						</div>
					</div>
				</div>
				<div className='flex gap-4 col-span-2'>
					<Button text='Cerrar' className='secondary' func={onClose} />
					<Button text={submitSuccess ? 'Procesado' : 'Procesar'} className='success' type='submit' disabled={isSubmitting || submitSuccess} />
				</div>
			</form>
		</div>
	);
}
