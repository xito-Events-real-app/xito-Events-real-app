import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";

interface NepaliDateFilterProps {
  selectedYear: number | null;
  selectedMonth: number | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
  onReset: () => void;
}

const NepaliDateFilter = ({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  onReset,
}: NepaliDateFilterProps) => {
  const years = getBSYearsRange(-2, 3); // 2 years back to 3 years forward
  const hasFilters = selectedYear !== null || selectedMonth !== null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Filter className="h-4 w-4" />
        <span className="text-xs font-medium">Filter:</span>
      </div>
      
      {/* Year Filter */}
      <Select 
        value={selectedYear?.toString() || "all"} 
        onValueChange={(v) => onYearChange(v === "all" ? null : parseInt(v))}
      >
        <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-8 w-24 text-xs">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-600">
          <SelectItem value="all" className="text-white text-xs">All Years</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()} className="text-white text-xs">
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month Filter */}
      <Select 
        value={selectedMonth?.toString() || "all"} 
        onValueChange={(v) => onMonthChange(v === "all" ? null : parseInt(v))}
      >
        <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-8 w-28 text-xs">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-600">
          <SelectItem value="all" className="text-white text-xs">All Months</SelectItem>
          {nepaliMonthsEnglish.map((m, i) => (
            <SelectItem key={i} value={(i + 1).toString()} className="text-white text-xs">
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset Button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-2 text-xs text-slate-400 hover:text-white"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};

export default NepaliDateFilter;
