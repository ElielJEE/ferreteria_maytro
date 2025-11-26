"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IoIosArrowDown } from "react-icons/io";

export default function DropdownMenu({ options, defaultValue, onChange, label, error }) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedOption, setSelectedOption] = useState(defaultValue || "Selecciona una opción");
	const [position, setPosition] = useState(null);

	const triggerRef = useRef(null);
	const menuRef = useRef(null); // ⬅️ NUEVO

	// Actualizar posición del menú cuando se abre
	useEffect(() => {
		if (isOpen && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setPosition({
				top: rect.bottom + window.scrollY,
				left: rect.left + window.scrollX,
				width: rect.width
			});
		}
	}, [isOpen]);

	// Cerrar al hacer click afuera
	useEffect(() => {
		const handleClickOutside = (e) => {
			// ⬅️ SI EL CLICK ES EN EL MENÚ, NO CERRAR
			if (menuRef.current?.contains(e.target)) return;

			// ⬅️ SI EL CLICK ES EN EL TRIGGER, NO CERRAR
			if (triggerRef.current?.contains(e.target)) return;

			setIsOpen(false);
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelect = (option) => {
		const label = typeof option === "object" ? option.label : option;
		setSelectedOption(label);
		onChange && onChange(option);
		setIsOpen(false);
	};

	return (
		<div className="relative flex flex-col w-full">
			{label && <label className="mb-2 font-medium text-dark">{label}</label>}

			<div
				ref={triggerRef}
				className="flex h-10 border border-dark/20 hover:border-dark/30 rounded-lg bg-light px-3 w-full cursor-pointer justify-between items-center gap-2"
				onClick={() => setIsOpen(!isOpen)}
			>
				<span>{selectedOption}</span>
				<IoIosArrowDown />
			</div>

			{/* Menú en PORTAL */}
			{isOpen && position &&
				createPortal(
					<ul
						ref={menuRef} // ⬅️ AGREGADO
						className="absolute bg-light border border-dark/20 rounded-md shadow-lg p-1 max-h-60 overflow-y-auto"
						style={{
							top: position.top,
							left: position.left,
							width: position.width,
							zIndex: 99999,
							position: "absolute"
						}}
					>
						{options && options.length > 0 ? (
							options.map((option, index) => {
								const label = typeof option === "object" ? option.label : option;
								return (
									<li
										key={index}
										onClick={() => handleSelect(option)}
										className="hover:bg-primary hover:text-white rounded-sm p-1 px-2 cursor-pointer flex items-center gap-2"
									>
										{label === selectedOption && <span>✓</span>}
										{label}
									</li>
								);
							})
						) : (
							<li className="p-2 text-sm text-dark/50">No hay opciones</li>
						)}
					</ul>,
					document.body
				)
			}

			{error && <span className="text-danger text-sm">{error}</span>}
		</div>
	);
}
