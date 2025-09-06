import React from 'react'

export default function Button({ func, text, type, className, icon, iconRight }) {
	const ColorVariants = {
		primary: 'bg-primary hover:bg-primary/80 text-light',
		success: 'bg-success hover:bg-success/80 text-light',
		danger: 'bg-danger hover:bg-danger/80 text-light',
		light: 'bg-light hover:bg-danger/80 text-light',
		dark: 'bg-dark hover:bg-danger/80 text-light',
		blue: 'bg-blue hover:bg-danger/80 text-light',
		yellow: 'bg-yellow hover:bg-danger/80 text-light',
		secondary: 'bg-secondary hover:bg-secondary/80 text-light',
		transparent: 'bg-transparent hover:bg-primary text-dark hover:text-light border border-dark/20 font-semibold',
	}

	return (
		<button className={`btn ${ColorVariants[className]}`} onClick={func} type={type}>
			{icon} {text} {iconRight}
		</button>
	)
}
