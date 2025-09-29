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

		return await res.json();
	} catch (error) {
		console.error("createCategory error:", error);
	}
}