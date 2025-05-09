"use client";

import { PREDEFINED_SHAPES, type Shape } from '@/lib/shapes';
import { ShapeDisplay } from './shape-display';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ShapePaletteProps {
  onSelectShape: (shape: Shape) => void;
  selectedShapeId?: string;
  className?: string;
}

export function ShapePalette({ onSelectShape, selectedShapeId, className }: ShapePaletteProps) {
  return (
    <ScrollArea className={cn("max-h-60", className)}>
      <div className="grid grid-cols-4 gap-2 p-2">
        {PREDEFINED_SHAPES.map((shape) => (
          <Button
            key={shape.id}
            variant="outline"
            className={cn(
              "p-2 h-16 flex flex-col items-center justify-center gap-1 border-2",
              selectedShapeId === shape.id ? "border-primary ring-2 ring-primary" : "border-border"
            )}
            onClick={() => onSelectShape(shape)}
            aria-label={`Select shape: ${shape.name}`}
          >
            <ShapeDisplay svgString={shape.svgString} size={32} />
            <span className="text-xs truncate">{shape.name}</span>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
