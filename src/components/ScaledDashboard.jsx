import React, { useRef, useState, useEffect } from 'react';

export const ScaledDashboard = ({ children }) => {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const parentWidth = containerRef.current.clientWidth;
                const designWidth = 896; // Baseline design boundary
                const newScale = Math.min(parentWidth / designWidth, 1);
                setScale(newScale);
                setHeight(560 * newScale); // Estimated browser height offset
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        const observer = new ResizeObserver(handleResize);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, []);

    return (
        <div ref={containerRef} className="relative w-full" style={{ height: height || 'auto' }}>
            <div
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: '896px',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                {children}
            </div>
        </div>
    );
};