import React from "react";

interface GaneshIconProps {
  className?: string;
  size?: number;
}

export function GaneshIcon({ className = "", size = 14 }: GaneshIconProps) {
  const gradId = `ganesh-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="50%" stopColor="#FF8C00" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
      </defs>
      {/* Left ear */}
      <path
        d="M10 28c-3-1-6 2-6 7s3 9 6 8c2-0.5 3-3 3-6s-1-8-3-9z"
        fill={`url(#${gradId})`}
        opacity="0.55"
      />
      {/* Right ear */}
      <path
        d="M54 28c3-1 6 2 6 7s-3 9-6 8c-2-0.5-3-3-3-6s1-8 3-9z"
        fill={`url(#${gradId})`}
        opacity="0.55"
      />
      {/* Head shape */}
      <ellipse cx="32" cy="28" rx="19" ry="20" fill={`url(#${gradId})`} opacity="0.85" />
      {/* Forehead dome */}
      <ellipse cx="32" cy="22" rx="14" ry="13" fill={`url(#${gradId})`} />
      {/* Crown */}
      <path
        d="M24 12c2-4 6-6 8-6s6 2 8 6c1 2 0 4-2 4h-12c-2 0-3-2-2-4z"
        fill={`url(#${gradId})`}
        opacity="0.7"
      />
      <circle cx="32" cy="11" r="2" fill="#FFD54F" opacity="0.8" />
      {/* Eyes */}
      <ellipse cx="24" cy="26" rx="3.5" ry="2.8" fill="white" opacity="0.95" />
      <circle cx="24.5" cy="26" r="1.5" fill="#4E342E" opacity="0.6" />
      <ellipse cx="40" cy="26" rx="3.5" ry="2.8" fill="white" opacity="0.95" />
      <circle cx="40.5" cy="26" r="1.5" fill="#4E342E" opacity="0.6" />
      {/* Trunk */}
      <path
        d="M32 33c0 0-1 3-2 6c-1.5 4-4 7-7 10c-2 2-3 4-1.5 4.5c1.5 0.5 3-0.5 4.5-2.5c2-2.5 3.5-5 4.5-8c0.5-1.5 1-3 1.5-4.5"
        stroke={`url(#${gradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M25.5 53c-1.5 2-1 3 0.5 2.5"
        stroke="#E65100"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Tusks */}
      <path d="M28 38c-1 2-0.5 5 1 6c0.5 0.3 1-0.2 0.8-0.8c-0.5-2 0-4 0.5-5.5" fill="#FFF8E1" opacity="0.9" />
      <path d="M36 38c1 2 0.5 5-1 6c-0.5 0.3-1-0.2-0.8-0.8c0.5-2 0-4-0.5-5.5" fill="#FFF8E1" opacity="0.9" />
      {/* Tilak */}
      <ellipse cx="32" cy="19" rx="1.8" ry="2.5" fill="#FFD54F" opacity="0.7" />
    </svg>
  );
}
