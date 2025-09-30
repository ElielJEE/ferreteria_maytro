const API_URL = "/api/categorias";

export const getCategories = async () => {
	try {
		const res = await fetch(API_URL, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		})

		if (!res.ok) {
			throw new Error("Error al obtener categorias");
		}

		return await res.json();
	} catch (error) {
		console.error("getCategories error:", error)
		throw error;
	}
}

export const createCategory = async (category) => {
	try {
		const res = await fetch(API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(category)
		});

		const data = await res.json();
		if (!res.ok) {
			throw new Error(data?.error || data?.message || res.statusText || 'Error creating category');
		}

		return data;
	} catch (error) {
		console.error("createCategory error:", error);
		throw error;
	}
}

export const editCategory = async (category) => {
	try {
		const res = await fetch(API_URL, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(category)
		});

		const data = await res.json();
		if (!res.ok) {
			throw new Error(data?.error || data?.message || res.statusText || 'Error editing category');
		}

		return data;
	} catch (error) {
		console.error("editCategory error:", error);
		throw error;
	}
}

export const deleteCategory = async (category) => {
	try {
		const res = await fetch(API_URL, {
			method: "DELETE",
			headers: { "Content-Typer": "application/json" },
			body: JSON.stringify(category)
		})

		const data = await res.json();
		if (!res.ok) {
			throw new Error(data?.error || data?.message || res.statusText || 'Error deleting category');
		}

		return data;
	} catch (error) {
		console.error("deteleCategory error:", error);
		throw error;
	}
}