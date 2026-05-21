"use client"
import React, { useState } from 'react'

export default function useLoadMore() {
	const [visibleItems, setVisibleItems] = useState(200);

	const loadMore = () => {
		setVisibleItems((prev) => prev + 100);
	}
	
	return { visibleItems, loadMore };
}
