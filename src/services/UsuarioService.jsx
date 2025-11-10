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
