import React from 'react'
import { Button } from '../atoms'
import { Input } from '../molecules'

export default function LoginOrg() {
	return (
		<>
			<div className='min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary via-secondary to-success'>
				<div className="w-full max-w-md mx-auto shadow-2xl border-0 bg-light rounded-lg pt-8">
					<div className="space-y-1 text-center pb-8">
						<div className="mx-auto w-20 h-20 mb-4 flex items-center justify-center">
							<img src="/images/logo.jpg" alt="ferreteria-logo" className="w-full h-full object-contain" />
						</div>
						<h1 className="text-2xl font-bold text-dark">
							Sistema de Ferreteria el Maytro
						</h1>
						<p className="text-dark/70">
							Acceso para administradores y personal autorizado
						</p>
					</div>

					<div className="space-y-6 px-6">
						<form className="space-y-4">
							<Input
								label={"Nombre de usuario"}
								type={"username"}
								placeholder={"usuario_ejemplo123"}
							/>
							<Input
								label={"Contraseña"}
								type={"password"}
								placeholder={"•••••••••••"}
							/>

							<div className="flex item-center justify-end text-sm">
								<a href="#" className="text-accent hover:text-primary/80 font-medium transition-colors text-primary">
									¿Olvidaste tu contraseña?
								</a>
							</div>

							<Button
								text={"Iniciar sesion"}
								className={"login"}
								type={"button"}
							/>
						</form>
					</div>

					<div className="flex flex-col space-y-4 pt-6 pb-6">
						<div className="w-full h-px bg-gradient-to-r from-transparent via-dark/20 to-transparent"></div>
						<p className="text-center text-sm text-dark/70">
							¿Problemas para acceder?{" "}
							<a href="#" className="text-secondary hover:text-primary/80 font-medium transition-colors">Contacta al administrador del sistema.</a>
						</p>
					</div>
				</div>
			</div>
		</>
	)
}
