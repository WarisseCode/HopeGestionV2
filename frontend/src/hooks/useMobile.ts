import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};
