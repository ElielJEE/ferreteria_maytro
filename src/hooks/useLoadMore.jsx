import React, { useState } from 'react'

export default function useLoadMore() {
	const [visibleItems, setVisibleItems] = useState(20);

	const loadMore = () => {
		setVisibleItems((prev) => prev + 10);
	}
	
	return { visibleItems, loadMore };
}
