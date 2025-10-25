const API_URL = "/api/cliente";

export const getClientes = async () => {
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
		console.error("getClientes error:", error)
		throw error;
	}
}