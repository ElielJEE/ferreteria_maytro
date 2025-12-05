import { pool } from "@/lib/db";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(req) {
	try {
		const { username, password } = await req.json();

		if (!username || !password) {
			return NextResponse.json(
				{ message: "Usuario y contraseña requeridos" },
				{ status: 400 }
			);
		}

		const [rows] = await pool.query(
			"SELECT * FROM usuarios WHERE NOMBRE_USUARIO = ?",
			[username]
		);

		if (rows.length === 0) {
			return NextResponse.json(
				{ message: "Usuario incorrecto" },
				{ status: 401 }
			);
		}

		const user = rows[0];

		if (user.ESTATUS !== 'ACTIVO') {
			return NextResponse.json(
				{ message: "El usuario esta inactivo." },
				{ status: 403 }
			)
		}

		const passwordMatch = await bcrypt.compare(password, user.CONTRASENA);
		if (!passwordMatch) {
			return NextResponse.json(
				{ message: "Contraseña incorrecta" },
				{ status: 401 }
			)
		}

		const token = jwt.sign(
			{ id: user.ID, username: user.NOMBRE_USUARIO, role: user.ID_ROL },
			process.env.JWT_SECRET
		);

		const response = NextResponse.json({ message: "Login exitoso" });
		response.cookies.set("token", token, {
			httpOnly: true,
			secure: true,
			path: "/",
			sameSite: "none",
		});

		return response;

	} catch (error) {
		console.error("Error en login:", error);
		return NextResponse.json(
			{ message: "Error interno del servidor" },
			{ status: 500 }
		);
	}
}
