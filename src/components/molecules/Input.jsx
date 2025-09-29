'use client'

import React, { useState } from 'react'
import { HiOutlineLockClosed } from "react-icons/hi2";
import { BsEye } from "react-icons/bs";
import { BsEyeSlash } from "react-icons/bs";
import { HiOutlineUser } from "react-icons/hi2";

export default function Input({ type, placeholder, iconInput, value, onChange, label, inputClass, isTextarea }) {
	const [showPassword, setShowPassword] = useState(false);

	return (
		<>
			<div className="space-y-2">
				{label &&
					<label htmlFor={type} className="flex text-dark font-medium mb-2">{label}</label>
				}
				<div className="relative">
					{type === 'password' ? (
						<HiOutlineLockClosed className='absolute left-3 top-3 h-5 w-5 text-dark/50' />
					) : (
						type !== 'username' ? (
							<>
								{iconInput}
							</>
						) : (
							<HiOutlineUser className='absolute left-3 top-3 h-5 w-5 text-dark/50' />
						)
					)}
					{isTextarea ?
						<textarea
							placeholder={placeholder}
							value={value}
							onChange={onChange}
							id={type}
							className={`w-full h-30 min-h-30 border border-dark/20 hover:border-dark/30 rounded-lg bg-light ${inputClass === "no icon" ? "pl-3" : "pl-10"} transition-colors outline-none focus-visible:ring-1`}
							required
						/>
						:
						<input
							type={type === 'password' ? showPassword ? 'text' : 'password' : type}
							placeholder={placeholder}
							value={value}
							onChange={onChange}
							id={type}
							className={`w-full border border-dark/20 hover:border-dark/30 rounded-lg bg-light ${inputClass === "no icon" ? "pl-3" : "pl-10"} h-10 transition-colors outline-none focus-visible:ring-1`}
							required
						/>
					}
					{
						type === 'password' && (
							showPassword ?
								<BsEyeSlash className='absolute right-3 top-3 h-5 w-5 text-dark/50 cursor-pointer' onClick={() => setShowPassword(!showPassword)} /> :
								<BsEye className='absolute right-3 top-3 h-5 w-5 text-dark/50 cursor-pointer' onClick={() => setShowPassword(!showPassword)} />
						)
					}
				</div>
			</div >
		</>
	)
}
