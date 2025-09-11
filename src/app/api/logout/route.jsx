import { NextResponse } from "next/server";

export async function POST() {
	try {
		const response = NextResponse.json(
			{ message: "Sesion cerrada correctamente" }
		);

		response.cookies.set("token", "", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: 0,
			path: "/",
		})

		return response;

	} catch (error) {
		console.error("Error al cerrar sesion:", error);
		return NextResponse.json(
			{ message: "Error al cerrar sesion" },
			{ status: 500 }
		);
	}
}