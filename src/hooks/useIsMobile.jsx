import React, { useEffect, useState } from 'react'

export default function useIsMobile({ breakpoint = 768 }) {
	const [IsMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= breakpoint);
		};
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [breakpoint]);

	return IsMobile;
}
