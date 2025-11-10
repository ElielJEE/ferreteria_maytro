const API_URL = "/api/usuarios";

export const getUsuarios = async () => {
	try {
		const res = await fetch(API_URL, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		})

		if (!res.ok) {
			throw new Error("Error al obtener usuarios");
		}

		return await res.json();
	} catch (error) {
		console.error("getUsuarios error:", error)
		throw error;
	}
}

export const createUsuario = async (usuarioData) => {
	try {
		const res = await fetch(API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(usuarioData),
		});

		const data = await res.json();

		if (!res.ok) {
			throw new Error(data.error || "Error al crear usuario");
		}

		return data; // Contendrá el mensaje e id del nuevo usuario
	} catch (error) {
		console.error("createUsuario error:", error);
		throw error;
	}
};

export const updateUsuario = async (usuarioData) => {
	try {
		const res = await fetch(API_URL, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(usuarioData),
		});

		const data = await res.json();

		if (!res.ok) {
			throw new Error(data.error || "Error al actualizar usuario");
		}

		return data; // Contendrá el mensaje e id del nuevo usuario
	} catch (error) {
		console.error("updateUsuario error:", error);
		throw error;
	}
};

export const deleteUsuario = async (id) => {
	try {
		if (!id) throw new Error("El ID del usuario es obligatorio");

		const res = await fetch(`${API_URL}?id=${id}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data = await res.json();

		if (!res.ok) {
			throw new Error(data.error || "Error al eliminar usuario");
		}

		return data; // Contendrá el mensaje de éxito
	} catch (error) {
		console.error("deleteUsuario error:", error);
		throw error;
	}
};

