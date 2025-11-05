const API_URL = "/api/proveedor";

export const getProveedores = async () => {
	try {
		const res = await fetch(API_URL, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		})

		if (!res.ok) {
			throw new Error("Error al obtener proveedores");
		}

		return await res.json();
	} catch (error) {
		console.error("getProveedores error:", error)
		throw error;
	}
}