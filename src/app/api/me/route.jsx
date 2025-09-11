import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req) {
	try {
		const token = req.cookies.get("token")?.value;

		if (!token) {
			return NextResponse.json(
				{ user: null },
				{ status: 401 }
			);
		}

		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET
		);

		return NextResponse.json(
			{ user: decoded }
		);

	} catch (error) {
		console.error("Error al obtener usuario:", error)
		return NextResponse.json(
			{ user: null },
			{ status: 401 }
		);
	}
}