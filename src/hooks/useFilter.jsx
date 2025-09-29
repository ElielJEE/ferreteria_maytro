import { useMemo } from 'react';

export function useFilter({ data, searchTerm = '', selectedCategory = '', selectedStatus = '' }) {
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter(item => {
      // Filtrar por categoría
      const categoryMatch =
        selectedCategory === 'Todas las categorias' || item.category === selectedCategory;

      // Filtrar por estado
      const statusMatch = selectedStatus === 'Todos los estados' || item.status === selectedStatus;

      // Filtrar por búsqueda
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());

      return categoryMatch && statusMatch && matchesSearch;
    });
  }, [data, searchTerm, selectedCategory, selectedStatus]);

  return filteredData;
}