import { useMemo } from 'react';

export default function useFilter({ data, searchTerm = '', selectedCategory = '', selectedStatus = '', matcher }) {
	const filteredData = useMemo(() => {
		if (!data) return [];

		return data.filter(item => {
			// Filtrar por categoría si existe
			const categoryMatch =
				!selectedCategory || selectedCategory === 'Todas las categorias' || item.category === selectedCategory;

			// Filtrar por estado si existe
			const statusMatch =
				!selectedStatus || selectedStatus === 'Todos los estados' || item.status === selectedStatus;

			// Filtrar por búsqueda usando matcher si existe
			const matchesSearch = matcher
				? matcher(item, searchTerm)
				: item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(item.id && item.id.toLowerCase().includes(searchTerm.toLowerCase()));

			return categoryMatch && statusMatch && matchesSearch;
		});
	}, [data, searchTerm, selectedCategory, selectedStatus, matcher]);

	return filteredData;
}
