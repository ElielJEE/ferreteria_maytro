'use client'
import { useState } from "react";

export default function useFormField({ initialValue = '', fieldName, formErrors, setFormErrors }) {
	const [value, setValue] = useState(initialValue);

	const handleChange = (val) => {
		setValue(val);
		if (fieldName && formErrors && formErrors[fieldName]) {
			setFormErrors(prev => {
				const newErrors = { ...prev };
				delete newErrors[fieldName];
				return newErrors;
			});
		}
	};

	return [value, handleChange];
};
