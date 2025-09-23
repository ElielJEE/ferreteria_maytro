import React from 'react'

export default function Button({ func, text, type, className, icon, iconRight }) {
	const ColorVariants = {
		primary: 'bg-primary hover:bg-primary/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		success: 'bg-success hover:bg-success/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		danger: 'bg-danger hover:bg-danger/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		light: 'bg-light hover:bg-danger/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		dark: 'bg-dark hover:bg-danger/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		blue: 'bg-blue hover:bg-danger/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		yellow: 'bg-yellow hover:bg-danger/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		secondary: 'bg-secondary hover:bg-secondary/80 text-light shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		transparent: 'bg-transparent hover:bg-primary text-dark hover:text-light border border-dark/20 font-semibold shadow-lg hover:shadow-xl py-2.5 px-4 w-full',
		none: 'bg-transparent text-dark hover:bg-primary p-2 hover:text-light',
	}

	return (
		<button className={`btn ${ColorVariants[className]} sm:text-sm text-xs`} onClick={func} type={type}>
			{icon} {text} {iconRight}
		</button>
	)
}
