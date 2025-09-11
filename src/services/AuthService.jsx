export const logout = async () => {
	try {
		const res = await fetch("/api/logout", {
			method: "POST",
		});
		return res.ok;
	} catch (error) {
		throw error;
	}
}

export const getCurrentUser = async () => {
	try {
		const res = await fetch("/api/me", {
			method: "GET",
			credentials: "include",
		});

		if (!res.ok) {
			return null;
		}

		const data = await res.json();
		return data.user;
	} catch (error) {
		console.error("Error al obtener usuario:", error);
		return null;
	}
}