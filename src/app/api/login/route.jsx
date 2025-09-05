import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(req) {
	try {
		const { username, password } = await req.json();

		if (!username || !password) {
			return NextResponse.json({ message: "Usuario y contraseña requeridos" }, { status: 400 });
		}

		const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);

		if (rows.length === 0) {
			return NextResponse.json({ message: "Usuario o contraseña incorrectos" }, { status: 401 });
		}

		const user = rows[0];

		// Verificar contraseña (asumiendo que las contraseñas están almacenadas en texto plano)
		// Si las contraseñas estuvieran hasheadas, usar bcrypt.compare(password, user.password)
		if (user.password !== password) {
			return NextResponse.json({ message: "Usuario o contraseña incorrectos" }, { status: 401 });
		}

		const token = jwt.sign(
			{ id: user.id, username: user.username },
			process.env.JWT_SECRET,
			{ expiresIn: "1h" }
		);

		const response = NextResponse.json({ message: "Login exitoso" });
		response.cookies.set("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: 3600,
			path: "/"
		});

		return response;
	} catch (error) {
		console.error("Error en login:", error);
		return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
	}
}
