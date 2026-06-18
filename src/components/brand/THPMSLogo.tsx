import React from 'react';

export const THPMSLogo: React.FC<{ size?: number; color?: string }> = ({
  size = 32,
  color = 'var(--color-text-primary)',
}) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="40" y="30" width="50" height="140" fill={color} rx="4" />
    <rect x="110" y="30" width="50" height="140" fill={color} rx="4" />
    <rect x="85" y="85" width="30" height="30" fill="#0ea5e9" transform="rotate(45 100 100)" />
  </svg>
);
