import React from 'react'

export default function Unauthorized() {
	return (
		<div className="flex flex-col items-center justify-center h-screen text-center">
			<h1 className="text-3xl font-bold mb-4">Acceso Denegado</h1>
			<p>No tienes permiso para acceder a esta página.</p>
		</div>
	)
}
