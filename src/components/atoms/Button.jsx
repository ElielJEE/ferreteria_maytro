import React from 'react'

export default function Button({ func, text, type, className }) {
	return (
		<div className={`btn btn-${className}`} onClick={func} type={type}>
			{text}
		</div>
	)
}
