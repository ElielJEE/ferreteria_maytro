import React, { useEffect, useState } from 'react'

export default function useActive() {
	const [isActiveItem, setIsActiveItem] = useState(null);
	const [isActiveModal, setIsActiveModal] = useState(null);

	const toggleActiveItem = (index) => {
		isActiveItem === index ? setIsActiveItem(null) : setIsActiveItem(index);
		console.log("isActive: ", isActiveItem, "index", index);
	}

	useEffect(() => {
		isActiveModal
			? document.body.style.overflow = 'hidden'
			: document.body.style.overflow = 'auto';
	}, [isActiveModal]);

	return { isActiveItem, toggleActiveItem, isActiveModal, setIsActiveModal };
}
