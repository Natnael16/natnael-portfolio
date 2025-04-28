import React from 'react';

export const floatingIcons = [
  { icon: '⚛️', delay: '0s', position: 'top-20 left-1/4' },
  { icon: '🚀', delay: '2s', position: 'top-40 right-1/3' },
  { icon: '💻', delay: '1s', position: 'bottom-32 left-1/3' },
  { icon: '📱', delay: '3s', position: 'bottom-20 right-1/4' },
];

export const FloatingIcons = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {floatingIcons.map((item, index) => (
        <div key={index} className={`absolute ${item.position} animate-float opacity-50`} style={{ animationDelay: item.delay }}>
          <span className="text-4xl">{item.icon}</span>
        </div>
      ))}
    </div>
  );
}; 