import React, { useState } from 'react'

export default function Button({ func, text, type, className, icon, iconRight, disabled = false }) {
	const [isProcessing, setIsProcessing] = useState(false)
	const isDisabled = disabled || isProcessing

	const ColorVariants = {
		primary: 'bg-primary hover:bg-primary/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		success: 'bg-success hover:bg-success/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		danger: 'bg-danger hover:bg-danger/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		light: 'bg-light hover:bg-light/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		dark: 'bg-dark hover:bg-dark/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		blue: 'bg-blue hover:bg-blue/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		yellow: 'bg-yellow hover:bg-yellow/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		secondary: 'bg-secondary hover:bg-secondary/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		purple: 'bg-purple hover:bg-purple/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		transparent: 'bg-transparent hover:bg-primary text-dark hover:text-light border border-dark/20 font-semibold shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		none: 'bg-transparent text-dark hover:bg-primary p-2 hover:text-light',
		noneTwo: 'bg-transparent',
	}

	const handleClick = async (e) => {
		if (isDisabled || typeof func !== 'function') return

		setIsProcessing(true)
		const result = func(e)

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
	}

	return (
		<button
			className={`btn ${ColorVariants[className]} sm:text-sm text-xs${isDisabled ? ' opacity-50 cursor-not-allowed' : ''}`}
			onClick={handleClick}
			type={type}
			disabled={isDisabled}
			aria-busy={isProcessing}
		>
			{icon} {text} {iconRight}
		</button>
	)
}
