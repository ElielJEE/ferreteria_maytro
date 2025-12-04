export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { checkAccess } from "@/lib/checkAccess";

export async function middleware(req) {
	const token = req.cookies.get("token")?.value;
	const url = req.nextUrl;

	const publicRoutes = ["/login", "/unauthorized"];

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
		const { payload } = await jwtVerify(token, secret);

		const roleId = payload.role;

		const res = await checkAccess({ roleId, path: url.pathname });

		if (!res.ok) {
			return NextResponse.redirect(new URL("/unauthorized", req.url));
		}

		if (!res.allowed) {
			return NextResponse.redirect(new URL("/unauthorized", req.url));
		}

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
		"/venta/:path*",
		"/compras",
		"/clientes/:path*",
		"/proveedores",
		"/configuracion/:path*",
		"/"
	]
}