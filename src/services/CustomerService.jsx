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

export const actualizarCliente = async (cliente) => {
	try {
		const res = await fetch(API_URL, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(cliente),
		});

		if (!res.ok) {
			const errMsg = await res.text();
			throw new Error(`Error al actualizar cliente: ${errMsg}`);
		}

		return await res.json();
	} catch (error) {
		console.error("actualizarCliente error:", error);
		throw error;
	}
};

export const eliminarCliente = async (id) => {
	try {
		const res = await fetch(`${API_URL}?id=${id}`, {
			method: "DELETE"
		});
		if (!res.ok) {
			throw new Error("Error al eliminar cliente");
		}
		return await res.json();

	} catch (error) {
		console.error("eliminarCliente error:", error);
		throw error;
	}
};
