import React from 'react'

export default function AlertCard({ productName, sucursal, stock, reserved, damaged, totalPhisical, store, max, min, status, children }) {
	const statusColor = {
		bajo: {
			border: "border-yellow",
			bg: "bg-yellow-50",
		},
		agotado: {
			border: "border-danger",
			bg: "bg-red-50",
		},
		exceso: {
			border: "border-blue",
			bg: "bg-blue-50",
		},
	}

	return (
		<div className={`border ${statusColor[status].border} ${statusColor[status].bg} rounded-lg p-4 mt-2 flex justify-between items-center`}>
			<div>
				<p className="font-semibold text-gray-800">
					{productName}
					<span className="ml-2 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
						{sucursal}
					</span>
				</p>
				{status === 'bajo' || status === 'agotado' ?
					<div>
						<p className="text-sm text-gray-600">
							Stock: <span className="font-medium">{stock}</span> (Minino: {min})
						</p>
						<p className="text-xs text-gray-500">Bodega: {store} | Reservado: {reserved}</p>
						<p className="text-xs text-gray-500">Dañado: {damaged} | Físico: {totalPhisical}</p>
					</div>
					:
					<div>
						<p className="text-sm text-gray-600">
							Stock: <span className="font-medium">{stock}</span> (Maximo: {max})
						</p>
						<p className="text-xs text-gray-500">Exceso: {stock - max}</p>
					</div>
				}
			</div>
			<div>
				{children}
			</div>
		</div>
	)
}
