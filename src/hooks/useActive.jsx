import React, { useState } from 'react'

export default function useActive() {
	const [isActive, setIsActive] = useState(null);

	const toggleActiveItem = (index) => {
		isActive === index ? setIsActive(null) : setIsActive(index);
		console.log("isActive: ", isActive, "index", index);
	}

	return { isActive, toggleActiveItem };
}
