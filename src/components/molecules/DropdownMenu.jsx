"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IoIosArrowDown } from "react-icons/io";

export default function DropdownMenu({ options, defaultValue, onChange, label, error, searchable = false, searchPlaceholder = "Buscar..." }) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedOption, setSelectedOption] = useState(defaultValue || "Selecciona una opción");
	const [position, setPosition] = useState(null);
	const [search, setSearch] = useState("");

	const triggerRef = useRef(null);
	const menuRef = useRef(null);

	useEffect(() => {
		if (defaultValue === undefined || defaultValue === null || defaultValue === '') {
			setSelectedOption("Selecciona una opción");
			return;
		}
		const labelText = typeof defaultValue === "object" ? defaultValue.label : defaultValue;
		setSelectedOption(labelText);
	}, [defaultValue]);

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

	useEffect(() => {
		if (!isOpen) setSearch("");
	}, [isOpen]);

	const filteredOptions = useMemo(() => {
		if (!search || !searchable) return options;
		return options.filter(option => {
			const label = typeof option === "object" ? option.label : option;
			return label.toString().toLowerCase().includes(search.toLowerCase());
		});
	}, [options, search, searchable]);

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
					<div
						ref={menuRef}
						className="absolute bg-light border border-dark/20 rounded-md shadow-lg p-2 max-h-72 overflow-y-auto"
						style={{
							top: position.top,
							left: position.left,
							width: position.width,
							zIndex: 99999,
							position: "absolute"
						}}
					>
						{searchable && (
							<div className="mb-2">
								<input
									type="text"
									value={search}
									placeholder={searchPlaceholder}
									onChange={(e) => setSearch(e.target.value)}
									className="w-full h-10 px-3 border border-dark/20 rounded-lg bg-white text-dark outline-none focus:border-primary"
								/>
							</div>
						)}
						{filteredOptions && filteredOptions.length > 0 ? (
							filteredOptions.map((option, index) => {
								const label = typeof option === "object" ? option.label : option;
								return (
									<li
										key={index}
										onClick={() => handleSelect(option)}
										className="hover:bg-primary hover:text-white rounded-sm p-1 px-2 cursor-pointer flex items-center gap-2 list-none"
									>
										{label === selectedOption && <span>✓</span>}
										{label}
									</li>
								);
							})
						) : (
							<li className="p-2 text-sm text-dark/50">
								{selectedOption && selectedOption !== "Selecciona una opción" 
									? `"${selectedOption}" (no encontrada)` 
									: "No hay opciones"}
							</li>
						)}
					</div>,
					document.body
				)
			}

			{error && <span className="text-danger text-sm">{error}</span>}
		</div>
	);
}
