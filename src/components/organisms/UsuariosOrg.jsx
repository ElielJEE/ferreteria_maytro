'use client'
import React, { useEffect, useState } from 'react'
import { Button, InfoCard, ModalContainer, SwitchButton } from '../atoms'
import { CustomerService, RolesService, SucursalesService, UsuarioService } from '@/services';
import { FiEdit, FiPlus, FiSearch, FiTrash2, FiUsers } from 'react-icons/fi';
import { Card, DropdownMenu, Input } from '../molecules';
import { useActive, useFilter, useIsMobile } from '@/hooks';

export default function UsuariosOrg() {
	const [usuarios, setUsuarios] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [mode, setMode] = useState('');
	const isMobile = useIsMobile({ breakpoint: 1024 })
	const { isActiveModal, setIsActiveModal } = useActive();
	const [usuario, setUsuario] = useState({});
	const [newUsuario, setNewUsuario] = useState({
		nombre: '',
		nombreUsuario: '',
		correo: '',
		idRol: '',
		idSucursal: '',
		contrasenia: '',
		confirmarContrasenia: '',
	});
	const [roles, setRoles] = useState([]);
	const [sucursales, setSucursales] = useState([]);
	const [error, setError] = useState({
		nombre: '',
		nombreUsuario: '',
		correo: '',
		contrasenia: '',
		confirmarContrasenia: '',
		rol: '',
		sucursal: '',
	});
	const [editUsuario, setEditUsuario] = useState({
		id: '',
		nombre: '',
		nombreUsuario: '',
		correo: '',
		idRol: '',
		rol: '',
		idSucursal: '',
		sucursal: '',
		contrasenia: '',
		confirmarContrasenia: '',
	});
	const [showDeactives, setShowDeactives] = useState(false);

	useEffect(() => {
		const fetchUsuarios = async () => {
			const res = await UsuarioService.getUsuarios();
			setUsuarios(res.usuarios)
		}
		fetchUsuarios();
	}, []);

	useEffect(() => {
		const fetchRoles = async () => {
			const res = await RolesService.getRoles();
			const opts = res.roles.map(rol => ({ label: `${rol.rol}`, value: rol.id }));
			setRoles(opts);
		}
		fetchRoles();
	}, []);

	useEffect(() => {
		const fetchSucursales = async () => {
			const res = await SucursalesService.getSucursales();
			setSucursales(res.sucursales)
		}
		fetchSucursales();
	}, []);

	const filteredUsuarios = useFilter({
		data: usuarios,
		searchTerm,
		matcher: (item, term) =>
			item.nombre.toLowerCase().includes(term.toLowerCase()) ||
			item.nombreUsuario.includes(term)
	});

	const toggleModalType = (type, itemData) => {
		setMode(type);
		if (type === 'create') {
			setIsActiveModal(true)
		} else if (type === 'edit') {
			setUsuario(itemData);
			console.log(itemData);
			setEditUsuario({
				id: itemData.id,
				nombre: itemData.nombre || '',
				nombreUsuario: itemData.nombreUsuario || '',
				correo: itemData.correo || '',
				idRol: itemData.idRol || '',
				idSucursal: itemData.idSucursal || '',
				rol: itemData.rol || '',
				sucursal: itemData.sucursal || '',
				contrasenia: '',
				confirmarContrasenia: '',
			});
			setIsActiveModal(true);
		} else if (type === 'delete') {
			setUsuario(itemData);
			setIsActiveModal(true);
		}
	}

	const handleChange = (e) => {
		const { name, value } = e.target;
		setNewUsuario(prev => ({ ...prev, [name]: value }));
	};

	const handleEditChange = (e) => {
		const { name, value } = e.target;
		setEditUsuario((prev) => ({ ...prev, [name]: value }));
	};

	const validate = (mode = 'create') => {
		let isValid = true;
		const newErrors = {};

		const fieldLabels = {
			nombre: 'nombre',
			nombreUsuario: 'nombre de usuario',
			correo: 'correo',
			...(mode === 'create' ? { contrasenia: 'contraseña', confirmarContrasenia: 'confirmar contraseña' } : {}),
		};

		const data = mode === 'create' ? newUsuario : editUsuario; // Elegir el objeto correcto

		Object.keys(fieldLabels).forEach(field => {
			if (!data[field]?.trim()) {
				newErrors[field] = `El campo ${fieldLabels[field]} es obligatorio`;
				isValid = false;
			} else {
				newErrors[field] = '';
			}
		});

		if (!data.idRol) {
			newErrors.rol = 'Debes seleccionar un rol';
			isValid = false;
		} else {
			newErrors.rol = '';
		}

		if (!data.idSucursal) {
			newErrors.sucursal = 'Debes seleccionar una sucursal';
			isValid = false;
		} else {
			newErrors.sucursal = '';
		}

		setError(newErrors);
		return isValid;
	};


	const handleSubmitCreate = async (e) => {
		e.preventDefault();

		if (!validate('create')) {
			return;
		}

		if (newUsuario.contrasenia !== newUsuario.confirmarContrasenia) {
			setError({ confirmarContrasenia: "Las contraseñas no coinciden." });
			return;
		}

		try {
			const res = await UsuarioService.createUsuario(newUsuario);

			const usuariosActualizados = await UsuarioService.getUsuarios();
			setUsuarios(usuariosActualizados.usuarios);

			setIsActiveModal(false);
			setNewUsuario({
				nombre: '',
				nombreUsuario: '',
				correo: '',
				rol: '',
				sucursal: '',
				contrasenia: '',
				confirmarContrasenia: '',
			});
		} catch (error) {
			setError({ general: error.message || "Error al crear el usuario." });
		}
	};

	const handleEditSubmit = async (e) => {
		e.preventDefault();

		if (!editUsuario.id) {
			setError({ general: "No se puede actualizar: ID de usuario no válido." });
			return;
		}

		if (!validate('edit')) {
			return;
		}

		if (editUsuario.contrasenia !== editUsuario.confirmarContrasenia) {
			setError({ confirmarContrasenia: "Las contraseñas no coinciden." });
			return;
		}

		try {
			const res = await UsuarioService.updateUsuario(editUsuario);

			const usuariosActualizados = await UsuarioService.getUsuarios();
			setUsuarios(usuariosActualizados.usuarios);

			setIsActiveModal(false);
		} catch (error) {
			setError({ general: error.message || "Error al actualizar el usuario." });
		}
	};


	const confirmDelete = async () => {
		try {
			if (!usuario.id) return;

			const res = await UsuarioService.deleteUsuario(usuario.id);

			const usuariosActualizados = await UsuarioService.getUsuarios();
			setUsuarios(usuariosActualizados.usuarios);

			setIsActiveModal(false);
		} catch (error) {
			setError({ general: error.message || "Error al inactivar el usuario." });
		}
	};

console.log(usuario);
console.log(usuarios);
	return (
		<>
			<div className='w-full p-6 flex flex-col'>
				<section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
					<InfoCard
						CardTitle={"Total Usuarios"}
						cardValue={usuarios.length.toString() || 0}
						cardIconColor={"primary"}
						cardIcon={<FiUsers className='h-4 w-4 md:h-6 md:w-6 text-primary' />}
					/>
				</section>
				<section className='w-full mt-6 border-dark/20 border rounded-lg p-4 flex flex-col'>
					<div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
						<div className='flex flex-col'>
							<h2 className='md:text-2xl font-semibold'>Lista de Usuarios</h2>
							<span className='text-sm md:text-medium text-dark/50'>Gestiona y administra la lista de Usuarios</span>
						</div>
						<div className='flex flex-col gap-4'>
							<Button
								text={'Agregar Usuario'}
								className={'primary'}
								icon={<FiPlus />}
								func={() => toggleModalType('create')}
							/>
							<SwitchButton
								text={'Mostrar Usuarios Inactivos'}
								onToggle={setShowDeactives}
							/>
						</div>
					</div>
					<div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-4'>
						<Input
							placeholder={"Buscar usuario..."}
							type={"search"}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
						/>
					</div>
					{!isMobile ?
						(
							<div className='w-full overflow-x-auto rounded-lg border border-dark/20 mt-2'>
								<table className='w-full border-collapse'>
									<thead className=' w-full border-b border-dark/20'>
										<tr className='w-full'>
											<th className='text-start text-dark/50 font-semibold p-2'>#</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Nombre</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Nombre Usuario</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Correo</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Rol</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Sucursal</th>
											<th className='text-start text-dark/50 font-semibold p-2'>Estado</th>
											<th className='text-center text-dark/50 font-semibold p-2'>Acciones</th>
										</tr>
									</thead>
									<tbody className='w-full'>
										{filteredUsuarios.map((item, index) => (
											<tr key={index} className={`${!showDeactives ? item.estado !== 'ACTIVO' && 'hidden' : ''} text-sm font-semibold w-full border-b border-dark/20 hover:bg-dark/3`}>
												<td className='p-2 text-start'>{index + 1}</td>
												<td className='p-2 text-start'>{item.nombre}</td>
												<td className='p-2 text-start'>{item.nombreUsuario}</td>
												<td className='p-2 text-start'>{item.correo}</td>
												<td className='p-2 text-start'>{item.rol}</td>
												<td className='p-2 text-start'>{item.nombresucursal || 'N/A'}</td>
												<td className='p-2 text-start'>
													<div className={`${item.estado === 'ACTIVO' ? 'bg-success' : 'bg-secondary'} text-light w-max px-3 text-center rounded-full`}>
														{item.estado.toLowerCase()}
													</div>
												</td>
												<td className='p-2 text-center'>
													<div className='flex gap-2 justify-center'>
														<Button
															className={"blue"}
															icon={<FiEdit className='h-4 w-4' />}
															func={() => toggleModalType('edit', item)}
														/>
														<Button
															className={"danger"}
															icon={<FiTrash2 className='h-4 w-4' />}
															func={() => toggleModalType('delete', item)}
														/>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='w-full overflow-x-auto mt-2 flex flex-col gap-2'>
								{
									filteredCustomers.map((item, index) => (
										<Card
											key={index}
											productName={item.nombre}
										>
											<div className='flex flex-col'>
												<span className='text-sm text-dark/70'>Telefono</span>
												<span className='text-lg font-semibold'>{item.telefono}</span>
											</div>
											<div className='w-full flex justify-between items-center gap-2 mt-4 col-span-2'>
												<Button className={"blue"} text={"Editar"} icon={<FiEdit />} func={() => toggleModalType('edit', item)} />
												<Button className={"danger"} text={"Eliminar"} icon={<FiTrash2 />} func={() => toggleModalType('delete', item)} />
											</div>
										</Card>
									))
								}
							</div>
						)
					}
				</section>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={mode === 'create' ? 'Crear un Nuevo Usuario' : mode === 'edit' ? 'Editar Cliente' : `¿Estas seguro que deseas eliminar a ${usuario.nombre} de la lista de usuarios?`}
						modalDescription={mode === 'create' ? 'Crea un nuevo usuario en el sistema' : mode === 'edit' ? 'Edita la informacion del cliente' : 'Esta accion no se puede deshacer.'}
						isForm={mode === 'create' || mode === 'edit' ? true : false}
					>
						{mode === 'create' ? (
							<form className='w-full' onSubmit={handleSubmitCreate}>
								<div className='w-full grid grid-cols-3 gap-4'>
									<Input
										name={'nombre'}
										label={'Nombre'}
										placeholder={'Ingrese nombre del personal...'}
										inputClass={'no icon'}
										value={newUsuario.nombre}
										onChange={(e) => {
											handleChange(e);
											setError({ ...error, nombre: '' });
										}}
										error={error.nombre && error.nombre}
									/>
									<Input
										name={'nombreUsuario'}
										label={'Nombre de usuario'}
										placeholder={'Ingrese un nombre de usuario unico...'}
										inputClass={'no icon'}
										value={newUsuario.nombreUsuario}
										onChange={(e) => {
											handleChange(e);
											setError({ ...error, nombreUsuario: '' });
										}}
										error={error.nombreUsuario && error.nombreUsuario}
									/>
									<Input
										name={'correo'}
										label={'Correo'}
										placeholder={'ej. usuario@correo.com'}
										inputClass={'no icon'}
										value={newUsuario.correo}
										onChange={(e) => {
											handleChange(e);
											setError({ ...error, correo: '' });
										}}
										error={error.correo && error.correo}
									/>
									<DropdownMenu
										label={'Rol del Usuario'}
										defaultValue={"Selecciona un rol"}
										options={roles}
										onChange={(selected) => {
											setNewUsuario(prev => ({ ...prev, idRol: selected.value }));
											setError({ ...error, rol: '' })
										}}
										error={error.rol && error.rol}
									/>
									<DropdownMenu
										label={'Sucursal del Usuario'}
										defaultValue={"Selecciona una sucursal"}
										options={sucursales}
										onChange={(selected) => {
											setNewUsuario(prev => ({ ...prev, idSucursal: selected.value }));
											setError({ ...error, sucursal: '' })
										}}
										error={error.sucursal && error.sucursal}
									/>
									<Input
										name={'contrasenia'}
										type={'password'}
										label={'Contraseña'}
										placeholder={'•••••••••••'}
										value={newUsuario.contrasenia}
										onChange={(e) => {
											handleChange(e);
											setError({ ...error, contrasenia: '' });
										}}
										error={error.contrasenia && error.contrasenia}
									/>
									<Input
										name={'confirmarContrasenia'}
										type={'password'}
										label={'Confrimar contraseña'}
										placeholder={'•••••••••••'}
										value={newUsuario.confirmarContrasenia}
										onChange={(e) => {
											handleChange(e);
											setError({ ...error, confirmarContrasenia: '' });
										}}
										error={error.confirmarContrasenia && error.confirmarContrasenia}
									/>
								</div>
								<div className='flex gap-2 mt-4'>
									<Button
										text={'Cancelar'}
										className={'secondary'}
										func={() => {
											setIsActiveModal(false)
											setNewUsuario({
												nombre: '',
												nombreUsuario: '',
												correo: '',
												contrasenia: '',
												confirmarContrasenia: '',
											})
											setError({})
										}}
									/>
									<Button
										text={'Guardar'}
										className={'success'}
									/>
								</div>
							</form>
						) : (mode === 'edit' ? (
							<form className='w-full' onSubmit={handleEditSubmit}>
								<div className='w-full grid grid-cols-3 gap-4'>
									<Input
										name={'nombre'}
										label={'Nombre'}
										placeholder={'Ingrese nombre del personal...'}
										inputClass={'no icon'}
										value={editUsuario.nombre}
										onChange={(e) => {
											handleEditChange(e)
											setError({ ...error, nombre: '' })
										}}
										error={error.nombre && error.nombre}
									/>
									<Input
										name={'nombreUsuario'}
										label={'Nombre de usuario'}
										placeholder={'Ingrese un nombre de usuario unico...'}
										inputClass={'no icon'}
										value={editUsuario.nombreUsuario}
										onChange={(e) => {
											handleEditChange(e)
											setError({ ...error, nombreUsuario: '' })
										}}
										error={error.nombreUsuario && error.nombreUsuario}
									/>
									<Input
										name={'correo'}
										label={'Correo'}
										placeholder={'ej. usuario@correo.com'}
										inputClass={'no icon'}
										value={editUsuario.correo}
										onChange={(e) => {
											handleEditChange(e)
											setError({ ...error, correo: '' })
										}}
										error={error.correo && error.correo}
									/>
									<DropdownMenu
										label={'Rol del Usuario'}
										defaultValue={editUsuario.rol}
										options={roles}
										onChange={(selected) =>
											setEditUsuario((prev) => ({ ...prev, idRol: selected.value }))
										}
										error={error.rol && error.rol}
									/>
									<DropdownMenu
										label={'Sucursal del Usuario'}
										defaultValue={editUsuario.sucursal}
										options={sucursales}
										onChange={(selected) =>
											setEditUsuario((prev) => ({ ...prev, idSucursal: selected.value }))
										}
										error={error.sucursal && error.sucursal}
									/>
									<Input
										name={'contrasenia'}
										type={'password'}
										label={'Nueva contraseña'}
										placeholder={'•••••••••••'}
										value={editUsuario.contrasenia}
										onChange={(e) => {
											handleEditChange(e)
											setError({ ...error, contrasenia: '' })
										}}
										error={error.contrasenia && error.contrasenia}
									/>
									<Input
										name={'confirmarContrasenia'}
										type={'password'}
										label={'Confrimar nueva contraseña'}
										placeholder={'•••••••••••'}
										value={editUsuario.confirmarContrasenia}
										onChange={(e) => {
											handleEditChange(e)
											setError({ ...error, confirmarContrasenia: '' })
										}}
										error={error.confirmarContrasenia && error.confirmarContrasenia}
									/>
								</div>
								<div className='flex gap-2 mt-4'>
									<Button
										text={'Cancelar'}
										className={'secondary'}
										func={() => {
											setIsActiveModal(false)
											setError({});
										}}
									/>
									<Button
										text={'Guardar'}
										className={'success'}
									/>
								</div>
							</form>
						) : (
							<div className='flex gap-4 mt-2'>
								<Button
									text={'Cancelar'}
									className={'secondary'}
									func={() => setIsActiveModal(false)}
								/>
								<Button
									text={'Confirmar'}
									className={'success'}
									func={confirmDelete}
								/>
							</div>
						))}
					</ModalContainer>
				)
			}
		</>
	)
}
