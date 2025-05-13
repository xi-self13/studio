import * as React from "react";

/**
 * ShapeTalkLogo component - Renders an "XL" style logo.
 * The "L" part is integrated with the right side of the "X",
 * connecting to the X's top-right and bottom-right points.
 */
function ShapeTalkLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none" // Set fill to none for the SVG container; paths are stroked
      xmlns="http://www.w3.org/2000/svg"
      {...props} // Spread props to allow overriding (e.g., className, fill for specific use cases)
    >
      {/* X part of the logo */}
      <path
        d="M5 7L15 17" // Diagonal from top-left to bottom-right sense
        stroke="currentColor" // Use current text color for the stroke
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7L5 17" // Diagonal from top-right to bottom-left sense
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* L part of the logo, "phasing" into the X */}
      <path
        d="M15 7L15 17" // Vertical stroke of the L, aligned with X's right-side extents
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 17L19 17" // Horizontal stroke of the L, extending from the bottom of its vertical stroke
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ShapeTalkLogo;
