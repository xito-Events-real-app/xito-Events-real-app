import React from "react";

interface GaneshIconProps {
  className?: string;
  size?: number;
}

export function GaneshIcon({ className = "", size = 14 }: GaneshIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Simple stylized elephant head - Ganesh symbol */}
      <circle cx="12" cy="10" r="7" fill="currentColor" opacity="0.15" />
      <path
        d="M12 3C8.13 3 5 6.13 5 10c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h1v2c0 .55.45 1 1 1s1-.45 1-1v-2h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h1c.55 0 1-.45 1-1v-1.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Trunk */}
      <path
        d="M12 11c0 0-1 1.5-2 3c-.5 .8 0 1.5.5 1.5c.3 0 .5-.1.7-.3L12 14l.8 1.2c.2.2.4.3.7.3c.5 0 1-.7.5-1.5c-1-1.5-2-3-2-3z"
        fill="white"
        opacity="0.9"
      />
      {/* Eyes */}
      <circle cx="9.5" cy="9" r="1" fill="white" />
      <circle cx="14.5" cy="9" r="1" fill="white" />
      {/* Ears */}
      <ellipse cx="4.5" cy="10" rx="1.5" ry="2.5" fill="currentColor" opacity="0.7" />
      <ellipse cx="19.5" cy="10" rx="1.5" ry="2.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
