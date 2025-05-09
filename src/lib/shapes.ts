import type { Shape } from '@/types';

export const PREDEFINED_SHAPES: Shape[] = [
  {
    id: 'circle',
    name: 'Circle',
    svgString: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="currentColor"/></svg>',
  },
  {
    id: 'square',
    name: 'Square',
    svgString: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="currentColor"/></svg>',
  },
  {
    id: 'triangle',
    name: 'Triangle',
    svgString: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,10 90,90 10,90" fill="currentColor"/></svg>',
  },
  {
    id: 'star',
    name: 'Star',
    svgString: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 61,35 95,35 67,57 78,87 50,68 22,87 33,57 5,35 39,35" fill="currentColor"/></svg>',
  },
  {
    id: 'heart',
    name: 'Heart',
    svgString: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,30 C10,0 0,30 0,30 C0,70 50,100 50,100 C50,100 100,70 100,30 C100,30 90,0 50,30 Z" fill="currentColor"/></svg>',
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    svgString: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 93.3,27.5 93.3,72.5 50,95 6.7,72.5 6.7,27.5" fill="currentColor"/></svg>',
  }
];

export const getShapeById = (id: string): Shape | undefined => {
  return PREDEFINED_SHAPES.find(shape => shape.id === id);
};
