import { useMemo } from 'react';

export default function useFilter({
	data,
	searchTerm = '',
	selectedCategory = '',
	selectedStatus = '',
	selectedDate = '',
	matcher,
}) {
	const filteredData = useMemo(() => {
		if (!data) return [];

		return data.filter(item => {
			// Filtrar por categoría si existe
			const categoryMatch =
				!selectedCategory ||
				selectedCategory === 'Todas las categorias' ||
				item.category === selectedCategory;

			// Filtrar por estado si existe
			const statusMatch =
				!selectedStatus ||
				selectedStatus === 'Todos los estados' ||
				item.status === selectedStatus;

			// Filtrar por búsqueda usando matcher
			const matchesSearch = matcher
				? matcher(item, searchTerm)
				: item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				item.id?.toString().toLowerCase().includes(searchTerm.toLowerCase());

			// Filtrar por fecha (si se selecciona)
			const dateMatch = !selectedDate || (
				item.fecha?.startsWith?.(selectedDate) ||
				item.fecha_venta?.startsWith?.(selectedDate) ||
				item.fechaFiltro?.startsWith?.(selectedDate)
			);

			return categoryMatch && statusMatch && matchesSearch && dateMatch;
		});
	}, [data, searchTerm, selectedCategory, selectedStatus, selectedDate, matcher]);

	return filteredData;
}
