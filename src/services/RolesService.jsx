const API_URL = "/api/roles";

export const getRoles = async () => {
	try {
		const res = await fetch(API_URL, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		})

		if (!res.ok) {
			throw new Error("Error al obtener roles");
		}

		return await res.json();
	} catch (error) {
		console.error("getRoles error:", error)
		throw error;
	}
}