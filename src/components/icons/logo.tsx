import type { SVGProps } from 'react';

export function ShapeTalkLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-label="ShapeTalk Logo"
      {...props}
    >
      <path d="M61.8,22.2C57,18.4,50.8,18.1,45.6,21.6L22.7,38.7c-2.1,1.4-3.1,4-2.5,6.4l7.6,30.3c0.6,2.4,2.7,4.1,5.1,4.1h30.3c2.4,0,4.5-1.8,5.1-4.1l7.6-30.3c0.6-2.4-0.4-5-2.5-6.4L61.8,22.2z M50,66.7c-9.2,0-16.7-7.5-16.7-16.7S40.8,33.3,50,33.3s16.7,7.5,16.7,16.7S59.2,66.7,50,66.7z"/>
      <circle cx="50" cy="50" r="10"/>
    </svg>
  );
}
