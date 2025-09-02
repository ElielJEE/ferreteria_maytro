'use client'

import React, { useState } from 'react'
import { HiOutlineLockClosed } from "react-icons/hi2";
import { BsEye } from "react-icons/bs";
import { BsEyeSlash } from "react-icons/bs";
import { HiOutlineUser } from "react-icons/hi2";

export default function Input({ type, placeholder, className, value, onChange, label }) {
	const [showPassword, setShowPassword] = useState(false);
	return (
		<>
			<div className="space-y-2">
				<label htmlFor={type} className="text-dark font-medium">{label}</label>
				<div className="relative mt-2">
					{type === 'password' ? (
						<HiOutlineLockClosed className='absolute left-3 top-3 h-5 w-5 text-dark/50' />
					) : (
						type !== 'email' && type !== 'username' ? (
							""
						) : (
							<HiOutlineUser className='absolute left-3 top-3 h-5 w-5 text-dark/50' />
						)
					)}
					<input
						type={type === 'password' ? showPassword ? 'text' : 'password' : type}
						placeholder={placeholder}
						value={value}
						onChange={onChange}
						id={type}
						className='w-full border border-dark/20 hover:border-dark/30 rounded-lg bg-light pl-10 py-2 px-3 h-10 transition-colors outline-none focus-visible:ring-1'
						required
					/>
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
