import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let animationId;
    let offset = 0;
    const speed = 0.015;
    
    const animate = () => {
      offset += speed;
      // Subtle parallax movement
      const x = Math.sin(offset * 0.3) * 15;
      const y = Math.cos(offset * 0.2) * 10;
      const scale = 1.1 + Math.sin(offset * 0.1) * 0.02;
      
      container.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: '-5%',
        width: '110%',
        height: '110%',
        backgroundImage: 'url(/images/fondo.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
        willChange: 'transform',
      }}
    />
  );
}
