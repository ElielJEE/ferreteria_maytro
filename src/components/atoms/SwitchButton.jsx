'use client'
import React, { useState } from 'react'

export default function SwitchButton({ text, onToggle }) {
	const [enabled, setEnabled] = useState(false);

	const handleToggle = () => {
		const newState = !enabled;
		setEnabled(newState);
		if (onToggle) onToggle(newState);
	};

	return (
		<div className='flex items-center gap-2'>
			<span className='font-semibold'>{text}</span>
			<button
				onClick={handleToggle}
				className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${enabled ? "bg-primary" : "bg-gray-400"}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${enabled
						? "translate-x-6" : "translate-x-1"}`}
				/>
			</button>
		</div>
	)
}
