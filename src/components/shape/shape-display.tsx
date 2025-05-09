"use client";

import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

interface ShapeDisplayProps extends Omit<SVGProps<SVGSVGElement>, 'dangerouslySetInnerHTML' | 'className' | 'width' | 'height' | 'fill'> {
  svgString: string;
  size?: number | string;
  className?: string;
  color?: string; // Added color prop
}

export function ShapeDisplay({ svgString, size = 24, className, color = 'currentColor', ...props }: ShapeDisplayProps) {
  // Ensure the SVG string uses the passed color or currentColor
  const processedSvgString = svgString.replace(/fill="currentColor"/g, `fill="${color}"`);

  return (
    <div
      className={cn('inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: processedSvgString }}
      {...props}
    />
  );
}
