const API_URL = "/api/productos";

export const getProducts = async () => {
	try {
		const res = await fetch(API_URL, {
			method: 'GET',
			headers: { "Content-Type": "application/json" },
		})

		if (!res.ok) {
			// Try to parse JSON error body for a better message
			let body;
			try {
				body = await res.json();
			} catch (e) {
				body = await res.text().catch(() => null);
			}
			const msg = body && (body.error || body.message) ? (body.error || body.message) : (typeof body === 'string' ? body : null);
			const err = new Error(msg ? `API /api/productos error: ${msg}` : `API /api/productos returned status ${res.status}`);
			err.status = res.status;
			throw err;
		}

		return await res.json();
	} catch (error) {
		console.error("getProductos error:", error);
		throw error;
	}
}

export const getSubcategories = async () => {
	try {
		const res = await fetch(`${API_URL}?type=subcategorias`, {
			method: 'GET',
			headers: { "Content-Type": "application/json" },
		})

		if (!res.ok) {
			throw new Error("Error al obtener	subcategorias")
		}

		return await res.json();
	} catch (error) {
		console.error("getSubcategories error:", error);
		throw error;
	}
}

export const createProducts = async (product) => {
	try {
		const res = await fetch(API_URL, {
			method: 'POST',
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(product),
		})

		const data = await res.json();
		if (!res.ok) {
			throw new Error(data?.error || data?.message || res.statusText || "Error creating category");
		}
		
		return data;
	} catch (error) {
		console.error("createCategories error:", error);
		throw error;
	}
}

export const editProduct = async (product) => {
	try {
		const res = await fetch(API_URL, {
			method: 'PUT',
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(product),
		});

		const data = await res.json();
		if (!res.ok) {
			throw new Error(data?.error || data?.message || res.statusText || 'Error updating product');
		}

		return data;
	} catch (error) {
		console.error('updateProduct error:', error);
		throw error;
	}
}

export const deleteProduct = async (id) => {
	try {
		const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
			method: 'DELETE'
		});
		const data = await res.json();
		if (!res.ok) {
			throw new Error(data?.error || data?.message || res.statusText || 'Error deleting product');
		}
		// Emitir evento para que otras vistas (ej. Summary) se actualicen automáticamente
		try {
			window.dispatchEvent(new CustomEvent('stock:updated', { detail: { deletedProductId: id } }));
		} catch (e) {
			console.warn('No se pudo emitir evento stock:updated tras eliminar producto', e);
		}
		return data;
	} catch (error) {
		console.error('deleteProduct error:', error);
		throw error;
	}
}

export const getProductUnits = async (productId) => {
	try {
		const res = await fetch(`${API_URL}?type=unidades&id=${encodeURIComponent(productId)}`, {
			method: 'GET',
			headers: { "Content-Type": "application/json" },
		});

		if (!res.ok) {
			throw new Error('Error al obtener unidades del producto');
		}

		return await res.json();
	} catch (error) {
		console.error('getProductUnits error:', error);
		throw error;
	}
}