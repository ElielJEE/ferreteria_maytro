const API_URL = "/api/sucursales";

export const getSucursales = async () => {
	try {
		const res = await fetch(API_URL, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		})

		if (!res.ok) {
			throw new Error("Error al obtener sucursales");
		}

		return await res.json();
	} catch (error) {
		console.error("getSucursales error:", error)
		throw error;
	}
}