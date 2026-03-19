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
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left ear */}
      <path
        d="M10 28c-3-1-6 2-6 7s3 9 6 8c2-0.5 3-3 3-6s-1-8-3-9z"
        fill="currentColor"
        opacity="0.55"
      />
      {/* Right ear */}
      <path
        d="M54 28c3-1 6 2 6 7s-3 9-6 8c-2-0.5-3-3-3-6s1-8 3-9z"
        fill="currentColor"
        opacity="0.55"
      />
      {/* Head shape - rounded elephant head */}
      <ellipse cx="32" cy="28" rx="19" ry="20" fill="currentColor" opacity="0.85" />
      {/* Forehead dome */}
      <ellipse cx="32" cy="22" rx="14" ry="13" fill="currentColor" />
      {/* Crown / headdress hint */}
      <path
        d="M24 12c2-4 6-6 8-6s6 2 8 6c1 2 0 4-2 4h-12c-2 0-3-2-2-4z"
        fill="currentColor"
        opacity="0.7"
      />
      {/* Crown jewel dot */}
      <circle cx="32" cy="11" r="2" fill="currentColor" opacity="0.5" />
      {/* Left eye */}
      <ellipse cx="24" cy="26" rx="3.5" ry="2.8" fill="white" opacity="0.95" />
      <circle cx="24.5" cy="26" r="1.5" fill="white" opacity="0.3" />
      {/* Right eye */}
      <ellipse cx="40" cy="26" rx="3.5" ry="2.8" fill="white" opacity="0.95" />
      <circle cx="40.5" cy="26" r="1.5" fill="white" opacity="0.3" />
      {/* Trunk - curving to the left, natural elephant style */}
      <path
        d="M32 33c0 0-1 3-2 6c-1.5 4-4 7-7 10c-2 2-3 4-1.5 4.5c1.5 0.5 3-0.5 4.5-2.5c2-2.5 3.5-5 4.5-8c0.5-1.5 1-3 1.5-4.5"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      {/* Trunk tip curl */}
      <path
        d="M25.5 53c-1.5 2-1 3 0.5 2.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Tusk left */}
      <path
        d="M28 38c-1 2-0.5 5 1 6c0.5 0.3 1-0.2 0.8-0.8c-0.5-2 0-4 0.5-5.5"
        fill="white"
        opacity="0.8"
      />
      {/* Tusk right */}
      <path
        d="M36 38c1 2 0.5 5-1 6c-0.5 0.3-1-0.2-0.8-0.8c0.5-2 0-4-0.5-5.5"
        fill="white"
        opacity="0.8"
      />
      {/* Tilak / bindi mark on forehead */}
      <ellipse cx="32" cy="19" rx="1.8" ry="2.5" fill="white" opacity="0.6" />
    </svg>
  );
}
