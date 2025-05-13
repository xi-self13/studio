
"use client";
import { useEffect, useState } from 'react';
import ShapeTalkLogo from '@/components/icons/logo'; // Assuming logo is needed

export function StartupScreen({ onFinished }: { onFinished: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Call onFinished after the fade-out animation completes
      setTimeout(onFinished, 500); // Match this with transition duration
    }, 2500); // Display duration before starting fade-out

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div 
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background text-foreground transition-opacity duration-500 ease-in-out"
        style={{ opacity: isVisible ? 1 : 0 }}
    >
      <ShapeTalkLogo className="w-24 h-24 text-primary mb-6 animate-pulse" />
      <h1 className="text-3xl font-bold">ShapeTalk</h1>
      <p className="text-xl text-muted-foreground mt-2">Made by XIStudios</p>
    </div>
  );
}
