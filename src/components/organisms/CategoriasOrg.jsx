'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Button, InfoCard, ModalContainer } from '../atoms';
import { BiCategory, BiCategoryAlt } from 'react-icons/bi';
import { FiArrowRight, FiEdit, FiPlus, FiSearch, FiTrash } from 'react-icons/fi';
import { DropdownMenu, Input } from '../molecules';
import { useActive, useRandomColor } from '@/hooks';

export default function CategoriasOrg() {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", parent: null });
  const { toggleActiveItem, isActiveItem, setIsActiveModal, isActiveModal } = useActive();

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch('/api/categorias');
      const data = await res.json();
      setCategories(data);
    };
    fetchCategories();
  }, []);

  const searchHandler = categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubcategory = category.subcategories && category.subcategories.some(subcat =>
      subcat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesSearch || matchesSubcategory;
  });

  const categoryColors = useMemo(() => {
    return categories.map((category) => (
      useRandomColor(category.id)
    ));
  }, [categories]);

  const handleInputChange = (e) => {
    setNewCategory({ ...newCategory, name: e.target.value });
  };
  const handleParentChange = (value) => {
    setNewCategory({ ...newCategory, parent: value });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name) return;
    try {
      console.log('Submitting new category:', newCategory);
      const response = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error adding category:', errorText);
        return;
      }
      setIsActiveModal(false);
      setNewCategory({ name: "", parent: null });
      const res = await fetch('/api/categorias');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Exception in handleAddCategory:', err);
    }
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
                func={() => setIsActiveModal(true)}
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
              searchHandler.map((category, index) => (
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
                        />
                        <Button
                          className={"none"}
                          icon={<FiTrash className='h-4 w-4' />}
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
                            />
                            <Button
                              className={"none"}
                              icon={<FiTrash className='h-4 w-4' />}
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
            setIsActiveModal={setIsActiveModal}
            modalTitle={"Agregar Nueva Categoría"}
            modalDescription={"Rellena el formulario para agregar una nueva categoría"}
          >
            <form className='w-full grid grid-cols-1 gap-4' onSubmit={handleAddCategory}>
              <Input
                label={"Nombre de la Categoría"}
                placeholder={"Ej: Herramientas"}
                type={"text"}
                name="name"
                value={newCategory.name}
                onChange={handleInputChange}
                inputClass={"no icon"}
              />
              <DropdownMenu
                label={"Categoría Padre (Opcional)"}
                options={[{ label: "Ninguna", value: "Ninguna" }, ...categories.map(cat => ({ label: cat.name, value: cat.id }))]}
                defaultValue={"Ninguna"}
                onChange={handleParentChange}
              />
              <div className='flex gap-4 mt-2'>
                <Button
                  className={"primary"}
                  text={"Agregar Categoria"}
                  type="submit"
                />
                <Button
                  className={"danger"}
                  text={"Cancelar"}
                  type="button"
                  func={() => setIsActiveModal(false)}
                />
              </div>
            </form>
          </ModalContainer>
        )}
      </div>
    </>
  );
}
