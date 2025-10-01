'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Button, InfoCard, ModalContainer } from '../atoms';
import { BiCategory, BiCategoryAlt } from 'react-icons/bi';
import { FiArrowRight, FiEdit, FiPlus, FiSearch, FiTrash } from 'react-icons/fi';
import { DropdownMenu, Input } from '../molecules';
import { useActive, useFilter, useRandomColor } from '@/hooks';
import useModalManagerWithHandlers from '@/hooks/useModalManagerWithHandlers';
import { CategoriesService } from '@/services';

export default function CategoriasOrg() {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", parent: null });
  const [editMode, setEditMode] = useState(false);
  const [editCategory, setEditCategory] = useState({ id: null, categoryType: null })
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toggleActiveItem, isActiveItem, setIsActiveModal, isActiveModal } = useActive();

  const handleInputChange = (e) => {
    setNewCategory({ ...newCategory, name: e.target.value });
  };
  const handleParentChange = (value) => {
    setNewCategory({ ...newCategory, parent: value });
  };

  const handleCategoryForm = async (e) => {
    e.preventDefault();
    if (!newCategory.name || newCategory.name.trim() === '') {
      setError('El nombre es requerido');
      setMessage("");
      return;
    }
    try {
      if (editMode) {
        await CategoriesService.editCategory({ id: editCategory.id, name: newCategory.name, type: editCategory.categoryType });
        setMessage('Categoría actualizada correctamente');
        setIsActiveModal(false)
        setEditCategory({ id: null, categoryType: null });
      } else {
        await CategoriesService.createCategory(newCategory);
        setMessage('Categoría agregada correctamente');

        if (!isActiveModal) {
          setNewCategory({ name: "", parent: null });
        }
      }

      setError("");
      const data = await CategoriesService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Exception in handleAddCategory:', error);
      setError(error.message || 'Error en la operación');
      setMessage("");
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await CategoriesService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(id);
  }, [message]);

  const filteredCategories = useFilter({
    data: categories,
    searchTerm,
    matcher: (item, term) =>
      item.name.toLowerCase().includes(term.toLowerCase()) ||
      (item.subcategories && item.subcategories.some(sub => sub.name.toLowerCase().includes(term.toLowerCase())))
  });

  const categoryColors = useMemo(() => {
    return categories.map((category, index) => (
      useRandomColor(index)
    ));
  }, [categories]);

  // Handlers for modal actions: create / edit / delete / onClose
  const handlers = React.useMemo(() => ({
    create: () => {
      setEditMode(false);
      setEditCategory({ id: null, categoryType: null });
      setNewCategory({ name: "", parent: null });
      setConfirmDelete(null);
      setIsActiveModal(true);
    },
    edit: (p) => {
      const payload = p || {};
      setEditMode(true);
      setEditCategory({ id: payload.id ?? null, categoryType: payload.type ?? null });
      setNewCategory({ name: payload.name ?? "", parent: payload.parent ?? null });
      setConfirmDelete(null);
      setIsActiveModal(true);
    },
    delete: (p) => {
      const payload = p || {};
      setConfirmDelete({ id: payload.id ?? null, type: payload.type ?? null, name: payload.name ?? "" });
      setIsActiveModal(true);
    },
    onClose: () => {
      setIsActiveModal(false);
      setEditMode(false);
      setEditCategory({ id: null, categoryType: null });
      setNewCategory({ name: "", parent: null });
      setConfirmDelete(null);
    }
  }), [setIsActiveModal]);

  const { open, close } = useModalManagerWithHandlers(handlers);

  const toggleModalType = (action, item = null, type = null, parent = null) => {
    if (action === 'create') return open('create');
    if (action === 'edit') return open('edit', { id: item?.id, name: item?.name, type, parent });
    if (action === 'delete') return open('delete', { id: item?.id, name: item?.name, type });
  };

  const handleDelete = async () => {
    try {
      await CategoriesService.deleteCategory({ id: confirmDelete.id, type: confirmDelete.type });
      const data = await CategoriesService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Exception in handleDelete:', error);
    }
  };

  const handleModalClose = () => {
    // delegate to hook's close to ensure onClose handler runs
    close();
  };

  return (
    <>
      <div className='w-full p-6 flex flex-col gap-4'>
        <section className='w-full grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
          <InfoCard
            CardTitle={"Total Categorías"}
            cardValue={categories.length}
            cardIcon={<BiCategory className='h-6 w-6 text-primary' />}
            cardIconColor={"primary"}
          />
          <InfoCard
            CardTitle={"Subcategorías"}
            cardValue={categories.reduce((acc, cat) => acc + (cat.subcategories ? cat.subcategories.length : 0), 0)}
            cardIcon={<BiCategoryAlt className='h-6 w-6 text-blue' />}
            cardIconColor={"blue"}
          />
        </section>
        <section className='w-full border border-dark/20 rounded-lg p-4 flex flex-col gap-4'>
          <div className='w-full flex sm:flex-row flex-col sm:justify-between sm:items-center mb-4 gap-2 md:gap-0'>
            <div className='flex flex-col'>
              <h2 className='md:text-2xl font-semibold'>Lista de Categorías</h2>
              <span className='text-sm md:text-medium text-dark/50'>Gestiona las Categorias y Subcategorias de productos</span>
            </div>
            <div className='flex xl:w-[20%] lg:w-[30%] md:w-[40%] sm:w-[50%] w-full md:justify-end'>
              <Button
                className={"primary"}
                text={"Agregar Categoría"}
                icon={<FiPlus className='h-4 w-4' />}
                func={() => toggleModalType('create')}
              />
            </div>
          </div>
          <div className='w-full flex flex-col gap-1 sticky top-20 bg-light pt-2'>
            <Input
              placeholder={"Buscar categoria..."}
              type={"search"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              iconInput={<FiSearch className='absolute left-3 top-3 h-5 w-5 text-dark/50' />}
            />
          </div>
          <div className='w-full border border-dark/20 rounded-lg overflow-x-auto'>
            {categories.length > 0 &&
              filteredCategories.map((category, index) => (
                <div key={index}>
                  <div
                    className='w-full flex border-b border-dark/20 p-4 items-center justify-between gap-1 cursor-pointer'
                    onClick={() => toggleActiveItem(index)}
                  >
                    <div className='flex items-center gap-2'>
                      <FiArrowRight className={`h-4 w-4 text-dark/50 ${isActiveItem === index ? 'rotate-90' : ''}`} />
                      <div
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: categoryColors[index] }}
                      ></div>
                      <h2 className='font-semibold'>{category.name}</h2>
                    </div>
                    <div className='flex flex-col md:flex-row items-center gap-2'>
                      <span className='text-dark/50 text-sm'>{(index + 1) * 2} Productos</span>
                      <div className='flex'>
                        <Button
                          className={"none"}
                          icon={<FiEdit className='h-4 w-4' />}
                          func={() => toggleModalType('edit', category, 'categoria')}
                        />
                        <Button
                          className={"none"}
                          icon={<FiTrash className='h-4 w-4' />}
                          func={() => toggleModalType('delete', category, 'categoria')}
                        />
                      </div>
                    </div>
                  </div>
                  {isActiveItem === index && category.subcategories && (
                    category.subcategories.map((subcat, subIndex) => (
                      <div
                        key={subIndex}
                        className='w-full flex border-b border-dark/20 py-4 px-6 md:px-15 items-center justify-between gap-1'
                      >
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 rounded-full bg-dark/30'></div>
                          <h2 className='font-semibold'>{subcat.name}</h2>
                        </div>
                        <div className='flex flex-col md:flex-row items-center gap-2'>
                          <span className='text-dark/50 text-sm'>{(subIndex + 1) * 2} Productos</span>
                          <div className='flex'>
                            <Button
                              className={"none"}
                              icon={<FiEdit className='h-4 w-4' />}
                              func={() => toggleModalType('edit', subcat, 'subcategoria', category.id)}
                            />
                            <Button
                              className={"none"}
                              icon={<FiTrash className='h-4 w-4' />}
                              func={() => toggleModalType('delete', subcat, 'subcategoria')}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))
            }
          </div>
        </section>
        {isActiveModal && (
          <ModalContainer
            setIsActiveModal={handleModalClose}
            modalTitle={confirmDelete ? `Confirmar borrado` : (editMode ? "Editar Categoría/Subcategoría" : "Agregar Nueva Categoría")}
            modalDescription={confirmDelete ? `¿Estás seguro que deseas borrar "${confirmDelete?.name}"? Esta acción no se puede deshacer.` : (editMode ? "Modifica los datos y guarda los cambios" : "Rellena el formulario para agregar una nueva categoría")}
          >
            {confirmDelete ? (
              <div className='w-full flex flex-col gap-4'>
                <p className='text-dark/70'>Confirma que quieres eliminar la {confirmDelete.type === 'categoria' ? 'categoría' : 'subcategoría'} <strong>{confirmDelete.name}</strong>.</p>
                <div className='flex gap-4'>
                  <Button className={'danger'} text={'Cancelar'} func={handleModalClose} />
                  <Button className={'success'} text={'Eliminar'} func={async () => {
                    await handleDelete();
                    handleModalClose();
                  }} />
                </div>
              </div>
            ) : (
              <form className='w-full grid grid-cols-1 gap-4' onSubmit={handleCategoryForm}>
                <Input
                  label={"Nombre de la Categoría"}
                  placeholder={"Ej: Herramientas"}
                  type={"text"}
                  name="name"
                  value={newCategory.name}
                  onChange={handleInputChange}
                  inputClass={"no icon"}
                />
                {!editMode && (
                  <DropdownMenu
                    label={"Categoría Padre (Opcional)"}
                    options={[{ label: "Ninguna", value: "Ninguna" }, ...categories.map(cat => ({ label: cat.name, value: cat.id }))]}
                    defaultValue={"Ninguna"}
                    onChange={handleParentChange}
                  />
                )}
                <div className='flex gap-4 mt-2'>
                  <Button
                    className={"danger"}
                    text={"Cancelar"}
                    type="button"
                    func={handleModalClose}
                  />
                  <Button
                    className={"success"}
                    text={editMode ? "Guardar Cambios" : "Agregar Categoria"}
                    type="submit"
                  />
                </div>
                {error && <span className='text-danger text-center'>{error}</span>}
                {message && <span className='text-success text-center'>{message}</span>}
              </form>
            )}
          </ModalContainer>
        )}
      </div>
    </>
  );
}
