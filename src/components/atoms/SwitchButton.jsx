'use client'
import React, { useState } from 'react'

export default function SwitchButton({ text, onToggle }) {
	const [enabled, setEnabled] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	const handleToggle = async (e) => {
		e.preventDefault();
		if (isProcessing) return

		setIsProcessing(true)
		const newState = !enabled;
		setEnabled(newState);

		const result = onToggle ? onToggle(newState) : null
		if (result && typeof result.then === 'function') {
			try {
				await result
			} catch (error) {
				console.error(error)
			} finally {
				setIsProcessing(false)
			}
		} else {
			setTimeout(() => setIsProcessing(false), 300)
		}
	};

	return (
		<div className='flex items-center gap-2'>
			<span className='font-semibold'>{text}</span>
			<button
				onClick={handleToggle}
				disabled={isProcessing}
				className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${enabled ? "bg-primary" : "bg-gray-400"}${isProcessing ? ' opacity-50 cursor-not-allowed' : ''}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${enabled
						? "translate-x-6" : "translate-x-1"}`}
				/>
			</button>
		</div>
	)
}
