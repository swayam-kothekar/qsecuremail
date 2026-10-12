import React from 'react';

export default function Logo({ size = 26, style = {}, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <rect width="64" height="64" rx="16" fill="#0c0e14" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="14.5" stroke="rgba(0,212,255,0.4)" strokeWidth="2" />
      {/* Quantum Orbital Rings */}
      <ellipse cx="32" cy="32" rx="23" ry="8.5" stroke="#00d4ff" strokeWidth="2" transform="rotate(-30 32 32)" opacity="0.75" />
      <ellipse cx="32" cy="32" rx="23" ry="8.5" stroke="#00d4ff" strokeWidth="2" transform="rotate(30 32 32)" opacity="0.75" />
      {/* Quantum Shield */}
      <path d="M32 16L44 21.5V32.5C44 40.5 38.5 46.5 32 49C25.5 46.5 20 40.5 20 32.5V21.5L32 16Z" fill="rgba(0,212,255,0.22)" stroke="#00d4ff" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Quantum Core */}
      <circle cx="32" cy="32.5" r="4" fill="#ffffff" />
      <circle cx="32" cy="32.5" r="2" fill="#00d4ff" />
    </svg>
  );
}
