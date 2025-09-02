import { NextResponse } from "next/server";

export function middleware(req) {
	const token = req.cookies.get("token")?.value || null;
	const loginUrl = new URL("/login", req.url);

	// Si el usuario no tiene token y no está en la página de login, redirigir a login
	if (!token && req.nextUrl.pathname !== "/login") {
		return NextResponse.redirect(loginUrl);
	}

	// si el usuario tiene token y está en la página de login, redirigir a dashboard
	if (token && req.nextUrl.pathname === "/login") {
		return NextResponse.redirect(new URL("/dashboard", req.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!login|_next/static|_next/image|favicon.ico).*)",
	]
}