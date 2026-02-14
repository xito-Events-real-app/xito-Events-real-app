import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CATEGORY_CODES, FreelancerField } from '@/lib/freelancer-assignment-api';

interface CrewCategorySelectorProps {
  selected: string[];
  onChange: (codes: string[]) => void;
  onClose?: () => void;
}

const CATEGORIES: { code: string; field: FreelancerField; color: string }[] = [
  { code: 'PB', field: 'photographerBride', color: 'bg-amber-500 border-amber-600' },
  { code: 'PG', field: 'photographerGroom', color: 'bg-amber-400 border-amber-500' },
  { code: 'VB', field: 'videographerBride', color: 'bg-purple-500 border-purple-600' },
  { code: 'VG', field: 'videographerGroom', color: 'bg-purple-400 border-purple-500' },
  { code: 'EP', field: 'extraPhotographer', color: 'bg-orange-400 border-orange-500' },
  { code: 'EV', field: 'extraVideographer', color: 'bg-fuchsia-400 border-fuchsia-500' },
  { code: 'Asst', field: 'assistant', color: 'bg-emerald-500 border-emerald-600' },
  { code: 'iPhone', field: 'iphoneShooter', color: 'bg-lime-500 border-lime-600' },
  { code: 'Drone', field: 'droneOperator', color: 'bg-cyan-500 border-cyan-600' },
  { code: 'FPV', field: 'fpvOperator', color: 'bg-sky-500 border-sky-600' },
];

export function CrewCategorySelector({ selected, onChange, onClose }: CrewCategorySelectorProps) {
  const toggle = useCallback((code: string) => {
    const next = selected.includes(code)
      ? selected.filter(c => c !== code)
      : [...selected, code];
    onChange(next);
  }, [selected, onChange]);

  return (
    <div className="p-3">
      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Required Crew</div>
      <div className="grid grid-cols-5 gap-2">
        {CATEGORIES.map(cat => {
          const isActive = selected.includes(cat.code);
          return (
            <button
              key={cat.code}
              onClick={() => toggle(cat.code)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-150",
                isActive
                  ? `${cat.color} text-white shadow-md scale-105`
                  : "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200"
              )}
              title={cat.field.replace(/([A-Z])/g, ' $1').trim()}
            >
              {cat.code}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onChange(CATEGORIES.map(c => c.code))}
          className="text-[10px] text-emerald-600 font-semibold hover:underline"
        >
          Select All
        </button>
        <button
          onClick={() => onChange([])}
          className="text-[10px] text-red-500 font-semibold hover:underline"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}

export function CategoryBadges({ categories }: { categories: string }) {
  if (!categories) return null;
  const codes = categories.split(',').map(c => c.trim()).filter(Boolean);
  if (codes.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-0.5">
      {codes.map(code => {
        const cat = CATEGORIES.find(c => c.code === code);
        return (
          <span
            key={code}
            className={cn(
              "text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white",
              cat ? cat.color.split(' ')[0] : 'bg-gray-400'
            )}
          >
            {code}
          </span>
        );
      })}
    </div>
  );
}
