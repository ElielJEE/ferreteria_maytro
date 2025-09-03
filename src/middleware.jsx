import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(req) {
	const token = req.cookies.get("token")?.value || null;
	const { pathname } = req.nextUrl;

	const publicPaths = ["/login", "/api/login"];
	if (publicPaths.includes(pathname)) {
		return NextResponse.next();
	}

	if (!token) {
		return NextResponse.redirect(new URL("/login", req.url));
	}

	try {
		jwt.verify(token, process.env.JWT_SECRET);
		return NextResponse.next();
	} catch (error) {
		return NextResponse.redirect(new URL("/login", req.url));
	}
}

// Rutas que queremos proteger
export const config = {
	matcher: [
		'/inventario/:path*',
	]
};
