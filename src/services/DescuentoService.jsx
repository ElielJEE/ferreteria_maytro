const API_URL = "/api/descuento";

export const getDescuentos = async () => {
	try {
		const res = await fetch(API_URL, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		});

		if (!res.ok) {
			throw new Error("Error al obtener descuentos");
		}

		return await res.json();
	} catch (error) {
		console.error("getDescuentos error:", error);
		throw error;
	}
};

export const createDescuento = async (descuento) => {
	try {
		const res = await fetch(API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(descuento),
		});

		if (!res.ok) throw new Error("Error al crear descuento");

		return await res.json();
	} catch (error) {
		console.error("createDescuento error:", error);
		throw error;
	}
};

export const updateDescuento = async (descuento) => {
	try {
		const res = await fetch(API_URL, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(descuento), // debe incluir id, codigo, nombre, porcentaje, descripcion
		});

		if (!res.ok) throw new Error("Error al actualizar descuento");

		return await res.json();
	} catch (error) {
		console.error("updateDescuento error:", error);
		throw error;
	}
};

export const changeEstadoDescuento = async (id, estado) => {
	try {
		const res = await fetch(API_URL, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, estado }), // Solo id y nuevo estado
		});

		if (!res.ok) throw new Error("Error al cambiar estado del descuento");

		return await res.json();
	} catch (error) {
		console.error("changeEstadoDescuento error:", error);
		throw error;
	}
};

export const deleteDescuento = async (id) => {
	try {
		const res = await fetch(API_URL, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }), // Solo id
		});

		if (!res.ok) throw new Error("Error al eliminar descuento");

		return await res.json();
	} catch (error) {
		console.error("deleteDescuento error:", error);
		throw error;
	}
};