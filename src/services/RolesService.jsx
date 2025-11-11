const API_URL = "/api/roles";
const API_ROL_PERMISOS_URL = "/api/roles-permisos";

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

export const createRole = async (rolData) => {
	try {
		const res = await fetch(API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(rolData),
		});

		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.message || "Error al crear rol");
		}

		return await res.json();
	} catch (error) {
		console.error("createRole error:", error);
		throw error;
	}
};

export const updateRole = async (rolData) => {
	try {
		const res = await fetch(API_URL, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(rolData), // rolData debe tener { id, rol, descripcion }
		});

		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.message || "Error al actualizar rol");
		}

		return await res.json();
	} catch (error) {
		console.error("updateRole error:", error);
		throw error;
	}
};

export const deleteRole = async (id) => {
	try {
		const res = await fetch("/api/roles", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});

		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.message || "Error al eliminar rol");
		}

		return await res.json();
	} catch (error) {
		console.error("deleteRole error:", error);
		throw error;
	}
};

// -------------------- ROlES-PERMISOS ---------------------

export const assignPermissionsToRole = async ({ rolId, permisosId }) => {
	try {
		const res = await fetch(API_ROL_PERMISOS_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rolId, permisosId }),
		});

		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.message || "Error al asignar permisos");
		}

		return await res.json();
	} catch (error) {
		console.error("assignPermissionsToRole error:", error);
		throw error;
	}
};

export const updatePermissionsOfRole = async ({ rolId, permisosId }) => {
	try {
		const res = await fetch(API_ROL_PERMISOS_URL, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rolId, permisosId }),
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.message || "Error al actualizar permisos");
		}
		return await res.json();
	} catch (error) {
		console.error("updatePermissionsOfRole error:", error);
		throw error;
	}
};