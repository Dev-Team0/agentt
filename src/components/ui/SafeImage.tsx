'use client';
import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
  theme?: 'light' | 'dark' | 'very-dark';
}

export function SafeImage({
  src = '/vb.png',
  alt = 'VB Logo',
  fallback = <Building2 className="w-8 h-8 text-gray-400" />,
  className,
  theme = 'light'
}: SafeImageProps) {
  const [error, setError] = useState(false);

  const isValidSrc = src && (src.startsWith('/') || src.startsWith('http'));

  if (error || !isValidSrc) {
    return <>{fallback}</>;
  }

  // Add theme-aware styling for the logo
  const getImageClasses = () => {
    let classes = className || '';
    
    // Add background and border for better visibility across themes
    if (theme === 'dark' || theme === 'very-dark') {
      classes += ' bg-white p-1 rounded-md border border-gray-600';
    } else {
      classes += ' bg-white p-1 rounded-md border border-gray-200';
    }
    
    return classes;
  };

  return (
    <img
      src={src}
      alt={alt}
      className={getImageClasses()}
      onError={() => setError(true)}
    />
  );
}