'use client'
import React, { useActionState, useEffect, useState } from 'react'
import { PermisosService, RolesService } from '@/services';
import { FiEdit, FiLock, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button, ModalContainer } from '../atoms';
import { MdBlock } from 'react-icons/md';
import { useActive } from '@/hooks';
import { Input } from '../molecules';

export default function RolesOrg() {
	const [roles, setRoles] = useState([]);
	const [show, setShow] = useState(false);
	const { isActiveModal, setIsActiveModal } = useActive();
	const [mode, setMode] = useState('');
	const [error, setError] = useState({
		nombre: '',
		decripcion: '',
		general: '',
		onDelete: false,
	});
	const [newRole, setNewRole] = useState({
		nombreRol: '',
		descripcion: ''
	});
	const [editRol, setEditRol] = useState({
		nombreRol: '',
		descripcion: ''
	});
	const [permisos, setPermisos] = useState([]);
	const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
	const [rol, setRol] = useState({});


	useEffect(() => {
		const fetchRoles = async () => {
			const res = await RolesService.getRoles();
			setRoles(res.roles);
		}

		const fetchPermisos = async () => {
			const res = await PermisosService.getPermisos();
			setPermisos(res.permisos);
		}

		fetchRoles();
		fetchPermisos();
	}, []);
	console.log(permisos);
	const toggleRole = (id) => {
		setShow(prev => (prev === id ? null : id));
	}

	const toggleModalType = (type, roleData) => {
		setMode(type);

		if (type === 'create') {
			setIsActiveModal(true);
			setPermisosSeleccionados([]);

		} else if (type === 'edit') {
			setIsActiveModal(true);
			setEditRol({
				nombreRol: roleData.rol,
				descripcion: roleData.descripcion,
				id: roleData.id,
			})
			const permisosIds = roleData.permisos?.map(p => p.id) || [];
			setPermisosSeleccionados(permisosIds);
		} else if (type === 'delete') {
			setRol(roleData)
			setIsActiveModal(true);

		}
	}

	const handleChange = (e) => {
		const { name, value } = e.target;
		setNewRole((prev) => ({ ...prev, [name]: value }));
	}

	const handleEditChange = (e) => {
		const { name, value } = e.target;
		setEditRol(prev => ({ ...prev, [name]: value }));
	};


	const handleCheckbox = (e) => {
		const id = Number(e.target.value)

		if (e.target.checked) {
			setPermisosSeleccionados(prev => [...prev, id]);
		} else {
			setPermisosSeleccionados(prev => prev.filter(pid => pid !== id));
		}
	}

	const handleSubmitCreation = async () => {
		try {
			// 1️⃣ Crear rol con nombre y descripción
			const rolRes = await RolesService.createRole({
				rol: newRole.nombreRol,
				descripcion: newRole.descripcion
			});

			const rolId = rolRes.rol.id;
			console.log(rolId);
			console.log(permisosSeleccionados);

			// 2️⃣ Asignar permisos
			if (permisosSeleccionados.length > 0) {
				await RolesService.assignPermissionsToRole({
					rolId: rolId,
					permisosId: permisosSeleccionados,
				});
			}

			// 3️⃣ Limpiar estados y cerrar modal
			setIsActiveModal(false);
			setNewRole({ nombreRol: '', descripcion: '' });
			setPermisosSeleccionados([]);

			// 4️⃣ Refrescar lista de roles
			const res = await RolesService.getRoles();
			setRoles(res.roles);

		} catch (error) {
			console.error(error);
		}
	}

	const handleSubmitEdit = async () => {
		try {
			// 1️⃣ Actualizar el rol
			await RolesService.updateRole({
				id: editRol.id,
				rol: editRol.nombreRol,
				descripcion: editRol.descripcion,
			});

			// 2️⃣ Actualizar permisos
			await RolesService.updatePermissionsOfRole({
				rolId: editRol.id,
				permisosId: permisosSeleccionados,
			});

			// 3️⃣ Limpiar estados y cerrar modal
			setIsActiveModal(false);
			setEditRol({ nombreRol: '', descripcion: '' });
			setPermisosSeleccionados([]);

			// 4️⃣ Refrescar lista de roles
			const res = await RolesService.getRoles();
			setRoles(res.roles);

		} catch (error) {
			console.error("Error al actualizar rol:", error);
		}
	};

	const confirmDelete = async () => {
		try {
			if (!rol.id) return;

			// Llamamos al servicio para eliminar el rol
			await RolesService.deleteRole(rol.id);

			// Si se elimina correctamente, cerrar modal y actualizar lista de roles
			setIsActiveModal(false);
			setRol({});
			const res = await RolesService.getRoles();
			setRoles(res.roles);

		} catch (error) {
			// Mostrar mensaje de error si no se puede eliminar
			console.error(error);
			setError({
				onDelete: error.message ||
					"No se pudo eliminar el rol. Es posible que haya usuarios asociados a él."
			});
			return;
		}
	}


	return (
		<>
			<div className='p-6 flex flex-col gap-4'>
				<section className='flex flex-col gap-4'>
					<div className='flex justify-between items-center'>
						<div className='font-semibold text-2xl flex items-center gap-2'>
							<FiLock className='text-primary' />
							<h2>Roles del Sistema ({roles.length})</h2>
						</div>
						<div>
							<Button
								text={'Nuevo Rol'}
								icon={<FiPlus />}
								className={'primary'}
								func={() => toggleModalType('create')}
							/>
						</div>
					</div>
					{
						roles.map((rol, index) => (
							<div className='border border-primary rounded-lg p-6 flex flex-col gap-2' key={index}>
								<div className='flex justify-between items-start'>
									<div className='flex flex-col'>
										<h2 className='text-xl font-semibold'>{rol.rol}</h2>
										<span className='text-sm text-dark/70'>{rol.descripcion || 'Descripcion del rol'}</span>
									</div>
									<div className='px-2 border-primary border bg-primary-light/30 rounded-full text-primary font-semibold'>
										<span>{rol.permisos.length} permisos</span>
									</div>
								</div>
								<div className='border-t border-b p-2 border-dark/20'>
									<span
										className='text-primary font-semibold cursor-pointer hover:underline'
										onClick={() => toggleRole(rol.id || index)}
									>
										Ver permisos ({rol.permisos.length})
									</span>
									{show === (rol.id || index) &&
										<div className='border-l-2 ml-1 border-primary p-2'>
											{rol.permisos && rol.permisos.length > 0 ? (
												<ul className="flex flex-wrap gap-2">
													{rol.permisos.map(p => (
														<li key={p.id} className='border-2 font-semibold rounded-full px-2 border-dark/30'>{p.nombre}</li>
													))}
												</ul>
											) : (
												<span>No tiene permisos asignados</span>
											)}
										</div>
									}
								</div>
								<div className='flex justify-end'>
									<div className='flex gap-2 w-1/3'>
										<Button
											text={'Editar'}
											icon={<FiEdit />}
											className={'blue'}
											func={() => toggleModalType('edit', rol)}
										/>
										<Button
											text={'Eliminar'}
											icon={<FiTrash2 />}
											className={'danger'}
											func={() => toggleModalType('delete', rol)}
										/>
									</div>
								</div>
							</div>
						))
					}
				</section>
			</div>
			{
				isActiveModal && (
					<ModalContainer
						setIsActiveModal={setIsActiveModal}
						modalTitle={mode === 'create' ? 'Agrega un Nuevo Rol al Sitema' : mode === 'edit' ? 'Editar Rol' : !error.onDelete ? `¿Estas seguro que deseas eliminar el rol ${rol.rol}?` : error.onDelete}
						modalDescription={mode === 'create' ? 'Agrega la informacion y los datos necesarios para crear un nuevo rol' : mode === 'edit' ? 'Agrega los datos a nuevo al rol' : !error.onDelete ? `Esta accion no puede deshacerse ¿Desea continuar con la Eliminacion?` : ''}
						isForm={mode === 'create' || mode === 'edit' ? true : false}
					>
						{
							mode === 'create' ? (
								<div className='flex flex-col gap-4 mt-2'>
									<Input
										name={'nombreRol'}
										label={'Nombre del Rol*'}
										inputClass={'no icon'}
										placeholder={'ej: Gerente'}
										value={newRole.nombreRol}
										onChange={(e) => {
											handleChange(e)
											setError({ ...error, nombre: '' })
										}}
									/>
									<Input
										name={'descripcion'}
										label={'Descripcion'}
										inputClass={'no icon'}
										placeholder={'Describe el proposito de este rol...'}
										isTextarea={true}
										value={newRole.descripcion}
										onChange={(e) => {
											handleChange(e)
											setError({ ...error, descripcion: '' })
										}}
									/>
									<div className='flex flex-col gap-2'>
										<h2 className='text-lg font-semibold'>Seleccionar Permisos *</h2>
										<div className='grid grid-cols-2 gap-4 overflow-y-scroll max-h-[200px] p-2'>
											{permisos.map((permiso, index) => (
												<div key={index} className='border rounded-lg border-dark/30 flex items-center gap-2 px-2'>
													<Input
														type={'checkbox'}
														value={permiso.id}
														checked={permisosSeleccionados.includes(permiso.id)}
														onChange={(e) => handleCheckbox(e)}
													/>
													<span className='font-semibold'>{permiso.nombre}</span>
												</div>
											))}
										</div>
									</div>
									<div className='flex gap-2'>
										<Button
											text={'Cancelar'}
											className={'secondary'}
											func={() => {
												setIsActiveModal(false)
												setError({
													nombreRol: '',
													decripcion: '',
													general: '',
												})
											}}
										/>
										<Button
											text={'Crear Rol'}
											className={'success'}
											func={() => handleSubmitCreation()}
										/>
									</div>
								</div>
							) : (mode === 'edit' ? (
								<div className='flex flex-col gap-4 mt-2'>
									<Input
										name={'nombreRol'}
										label={'Nombre del Rol*'}
										inputClass={'no icon'}
										placeholder={'ej: Gerente'}
										value={editRol.nombreRol}
										onChange={(e) => {
											handleEditChange(e)
											setError({ ...error, nombre: '' })
										}}
									/>
									<Input
										name={'descripcion'}
										label={'Descripcion'}
										inputClass={'no icon'}
										placeholder={'Describe el proposito de este rol...'}
										isTextarea={true}
										value={editRol.descripcion}
										onChange={(e) => {
											handleEditChange(e)
											setError({ ...error, descripcion: '' })
										}}
									/>
									<div className='flex flex-col gap-2'>
										<h2 className='text-lg font-semibold'>Seleccionar Permisos *</h2>
										<div className='grid grid-cols-2 gap-4 overflow-y-scroll max-h-[200px] p-2'>
											{permisos.map((permiso, index) => (
												<div key={index} className='border rounded-lg border-dark/30 flex items-center gap-2 px-2'>
													<Input
														type={'checkbox'}
														value={permiso.id}
														checked={permisosSeleccionados.includes(permiso.id)}
														onChange={(e) => handleCheckbox(e)}
													/>
													<span className='font-semibold'>{permiso.nombre}</span>
												</div>
											))}
										</div>
									</div>
									<div className='flex gap-2'>
										<Button
											text={'Cancelar'}
											className={'secondary'}
											func={() => {
												setIsActiveModal(false)
												setError({
													nombreRol: '',
													decripcion: '',
													general: '',
												})
												setPermisosSeleccionados([])
											}}
										/>
										<Button
											text={'Guardar Cambios'}
											className={'success'}
											func={() => handleSubmitEdit()}
										/>
									</div>
								</div>
							) : (
								error.onDelete ? (
									<div>
										<Button
											text={'Aceptar'}
											className={'primary'}
											func={() => {
												setIsActiveModal(false)
												setError({})
											}}
										/>
									</div>
								) : (
									<div className='flex gap-2'>
										<Button
											text={'Cancelar'}
											className={'secondary'}
											func={() => setIsActiveModal(false)}
										/>
										<Button
											text={'Guardar Cambios'}
											className={'success'}
											func={() => confirmDelete()}
										/>
									</div>
								)
							))
						}
					</ModalContainer >
				)
			}
		</>
	)
}
