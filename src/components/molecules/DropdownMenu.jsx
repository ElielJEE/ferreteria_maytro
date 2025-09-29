"use client"
import React from 'react'
import { useState } from 'react'
import { IoIosArrowDown } from "react-icons/io";


export default function DropdownMenu({ options, defaultValue, onChange, label }) {
		const [isOpen, setIsOpen] = useState(false);
		// Si defaultValue es un objeto, usa su label, si no, usa el string
		const getLabel = (opt) => (typeof opt === 'object' ? opt.label : opt);
		const getValue = (opt) => (typeof opt === 'object' ? opt.value : opt);
		const [selectedOption, setSelectedOption] = useState(defaultValue || "Select an option");

		const handleSelect = (option) => {
			setSelectedOption(getLabel(option));
			onChange && onChange(getValue(option));
			setIsOpen(false);
		}

	return (
		<div className='relative flex flex-col w-full'>
			{label &&
				<label htmlFor="dropdown" className="flex text-dark font-medium mb-2">{label}</label>
			}
			<div
				className='flex h-10 border border-dark/20 hover:border-dark/30 rounded-lg bg-light px-3 w-full cursor-pointer justify-between items-center gap-2'
				onClick={() => setIsOpen(!isOpen)}
			>
			<span>{selectedOption}</span>
				<IoIosArrowDown />
			</div>
			{
				isOpen && (
					<ul className='absolute top-12 bg-light border border-dark/20 rounded-md w-full shadow-lg z-10 p-1'>
								{options && options.map((option, index) => (
									<li
										key={index}
										onClick={() => handleSelect(option)}
										className='hover:bg-primary rounded-sm p-1 px-2 hover:text-white cursor-pointer flex items-center'
									>
										<span className='w-[20px]'>
											{getLabel(option) === selectedOption && '✓'}
										</span>
										{getLabel(option)}
									</li>
								))}
					</ul>
				)
			}
		</div>
	)
}
