const API_URL = "/api/productos";

export const getProducts = async () => {
	try {
		const res = await fetch(API_URL, {
			method: 'GET',
			headers: { "Content-Type": "application/json" },
		})

		if (!res.ok) {
			throw new Error("Error al obtener	productos")
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