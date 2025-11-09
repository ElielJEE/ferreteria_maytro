const API_URL = "/api/sucursales";

export const getSucursales = async () => {
	try {
		const res = await fetch(API_URL, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		});
		if (!res.ok) throw new Error("Error al obtener sucursales");
		return await res.json();
	} catch (error) {
		console.error("getSucursales error:", error);
		throw error;
	}
};

export const crearSucursal = async ({ codigo, nombre, direccion, telefono }) => {
	try {
		const res = await fetch(API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ codigo, nombre, direccion, telefono })
		});
		if (!res.ok) throw new Error("Error al crear sucursal");
		return await res.json();
	} catch (error) {
		console.error("crearSucursal error:", error);
		throw error;
	}
};

export const actualizarSucursal = async ({ id, nombre, direccion, telefono }) => {
	try {
		const res = await fetch(API_URL, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, nombre, direccion, telefono })
		});
		if (!res.ok) throw new Error("Error al actualizar sucursal");
		return await res.json();
	} catch (error) {
		console.error("actualizarSucursal error:", error);
		throw error;
	}
};

export const eliminarSucursal = async (id) => {
	try {
		const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
		});
		if (!res.ok) throw new Error("Error al eliminar sucursal");
		return await res.json();
	} catch (error) {
		console.error("eliminarSucursal error:", error);
		throw error;
	}
};