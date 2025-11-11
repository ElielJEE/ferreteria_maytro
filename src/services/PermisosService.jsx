const API_URL = "/api/permisos";

export const getPermisos = async (params = {}) => {
	try {
		const query = new URLSearchParams(params).toString();
		const res = await fetch(`${API_URL}?${query}`, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		});

		if (!res.ok) {
			throw new Error("Error al obtener permisos");
		}

		return await res.json();
	} catch (error) {
		console.error("getPermisos error:", error);
		throw error;
	}
};
