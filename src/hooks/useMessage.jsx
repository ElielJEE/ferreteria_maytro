import React, { useEffect, useState } from 'react'

export default function useMessage() {
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (!message) return;
		const id = setTimeout(() => setMessage(''), 3000);
		return () => clearTimeout(id);
	}, [message]);

	return { message, setMessage };
}
