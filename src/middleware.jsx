import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req) {
	const token = req.cookies.get("token")?.value;
	const url = req.nextUrl;

	const publicRoutes = ["/login"];

	if (publicRoutes.includes(url.pathname)) {
		return NextResponse.next();
	}

	if (!token) {
		return NextResponse.redirect(
			new URL(
				"/login",
				req.url
			)
		);
	}

	try {
		const secret = new TextEncoder().encode(process.env.JWT_SECRET);

		await jwtVerify(token, secret);

		return NextResponse.next();
	} catch (error) {
		console.error("Token invalido o expirado:", error);

		return NextResponse.redirect(
			new URL(
				"/login",
				req.url
			)
		);
	}
}

export const config = {
	matcher: [
		"/dashboard/:path*",
		"/inventario/:path*",
		"/venta/:path*"
	]
}