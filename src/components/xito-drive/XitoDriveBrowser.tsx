import { useState, useMemo, useEffect } from "react";
import { ChevronRight, HardDrive, FolderPlus, Upload, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XitoDriveFolderCard } from "./XitoDriveFolderCard";
import {
  MonthYearGroup,
  buildMonthYearGroups,
  getUniqueYears,
  getClientCategories,
  getVideoSubfolders,
  getFreelancersForEvent,
  FreelancerAssignment,
} from "@/lib/xito-drive-utils";
import { BookedClientData } from "@/lib/sheets-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";

interface Props {
  clients: BookedClientData[];
  assignments: FreelancerAssignment[];
  isLoading: boolean;
}

type BreadcrumbSegment = { label: string; level: string };

export function XitoDriveBrowser({ clients, assignments, isLoading }: Props) {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbSegment[]>([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const groups = useMemo(() => buildMonthYearGroups(clients), [clients]);
  const uniqueYears = useMemo(() => getUniqueYears(groups), [groups]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (yearFilter !== "all" && g.year !== yearFilter) return false;
      if (monthFilter !== "all" && g.month !== monthFilter) return false;
      return true;
    });
  }, [groups, yearFilter, monthFilter]);

  // Current navigation state
  const currentLevel = breadcrumb.length;
  const selectedGroupKey = breadcrumb[0]?.level;
  const selectedClient = breadcrumb[1]?.label;
  const selectedCategory = breadcrumb[2]?.label;
  const selectedEvent = breadcrumb[3]?.label;

  const currentGroup = groups.find(g => g.key === selectedGroupKey);
  const currentClientFolder = currentGroup?.clients.find(c => c.clientName === selectedClient);

  const navigate = (label: string, level: string) => {
    setBreadcrumb(prev => [...prev, { label, level }]);
  };

  const navigateTo = (index: number) => {
    if (index < 0) {
      setBreadcrumb([]);
    } else {
      setBreadcrumb(prev => prev.slice(0, index + 1));
    }
  };

  // Render based on current level
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    // Level 0: Month-Year folders
    if (currentLevel === 0) {
      if (filteredGroups.length === 0) {
        return <p className="text-muted-foreground text-sm text-center py-12">No booked events found.</p>;
      }
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredGroups.map(g => (
            <XitoDriveFolderCard
              key={g.key}
              name={g.label}
              itemCount={g.clients.length}
              type="month-year"
              onClick={() => navigate(g.label, g.key)}
            />
          ))}
        </div>
      );
    }

    // Level 1: Client folders inside month-year
    if (currentLevel === 1 && currentGroup) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {currentGroup.clients.map(c => (
            <XitoDriveFolderCard
              key={c.registeredDateTimeAD}
              name={c.clientName}
              itemCount={6}
              type="client"
              onClick={() => navigate(c.clientName, c.registeredDateTimeAD)}
            />
          ))}
        </div>
      );
    }

    // Level 2: Category folders (Photos, Videos, etc.)
    if (currentLevel === 2) {
      const categories = getClientCategories();
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {categories.map(cat => {
            let count: number | undefined;
            if (cat.name === "Photos" || cat.name === "Project Managers" || cat.name === "Lightroom Catalog") {
              count = (currentClientFolder?.events.length || 0) + (cat.name === "Photos" ? 1 : 0); // +1 for Selected
            } else if (cat.name === "Videos") {
              count = 3;
            }
            return (
              <XitoDriveFolderCard
                key={cat.name}
                name={cat.name}
                itemCount={count}
                type="category"
                categoryName={cat.name}
                onClick={() => navigate(cat.name, cat.name)}
              />
            );
          })}
        </div>
      );
    }

    // Level 3: Inside a category
    if (currentLevel === 3 && currentClientFolder) {
      // Photos: event folders + "Selected"
      if (selectedCategory === "Photos") {
        const items = [...currentClientFolder.events, "Selected"];
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {items.map(ev => {
              const freelancers = ev !== "Selected"
                ? getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, ev)
                : { photographers: [], videographers: [] };
              return (
                <XitoDriveFolderCard
                  key={ev}
                  name={ev}
                  itemCount={ev === "Selected" ? undefined : freelancers.photographers.length || undefined}
                  type="event"
                  categoryName="Photos"
                  onClick={() => navigate(ev, ev)}
                />
              );
            })}
          </div>
        );
      }

      // Videos: 3 fixed subfolders
      if (selectedCategory === "Videos") {
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {getVideoSubfolders().map(sub => (
              <XitoDriveFolderCard
                key={sub}
                name={sub}
                type="leaf"
                categoryName="Videos"
                onClick={() => navigate(sub, sub)}
              />
            ))}
          </div>
        );
      }

      // Project Managers: event name folders only
      if (selectedCategory === "Project Managers") {
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {currentClientFolder.events.map(ev => (
              <XitoDriveFolderCard
                key={ev}
                name={ev}
                type="leaf"
                categoryName="Project Managers"
                onClick={() => navigate(ev, ev)}
              />
            ))}
          </div>
        );
      }

      // Lightroom Catalog: event folders -> freelancer folders (same as Photos)
      if (selectedCategory === "Lightroom Catalog") {
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {currentClientFolder.events.map(ev => {
              const freelancers = getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, ev);
              return (
                <XitoDriveFolderCard
                  key={ev}
                  name={ev}
                  itemCount={freelancers.photographers.length || undefined}
                  type="event"
                  categoryName="Lightroom Catalog"
                  onClick={() => navigate(ev, ev)}
                />
              );
            })}
          </div>
        );
      }

      // Quotation / Payments: empty folder (leaf)
      return (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground text-sm">This folder is empty. Files will appear here when iDrive E2 is connected.</p>
        </div>
      );
    }

    // Level 4: Inside event under Photos/Lightroom -> freelancer folders
    if (currentLevel === 4 && currentClientFolder) {
      if ((selectedCategory === "Photos" || selectedCategory === "Lightroom Catalog") && selectedEvent !== "Selected") {
        const { photographers } = getFreelancersForEvent(assignments, currentClientFolder.registeredDateTimeAD, selectedEvent!);
        if (photographers.length === 0) {
          return (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground text-sm">No freelancers assigned to this event yet.</p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {photographers.map(name => (
              <XitoDriveFolderCard
                key={name}
                name={name}
                type="freelancer"
                onClick={() => navigate(name, name)}
              />
            ))}
          </div>
        );
      }

      // Leaf folder
      return (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground text-sm">This folder is empty. Files will appear here when iDrive E2 is connected.</p>
        </div>
      );
    }

    // Level 5+: Leaf
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground text-sm">This folder is empty. Files will appear here when iDrive E2 is connected.</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filters (only at root) */}
        {currentLevel === 0 && (
          <>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Object.entries(NEPALI_MONTHS).map(([num, name]) => (
                  <SelectItem key={num} value={num}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" disabled className="text-xs opacity-50">
            <FolderPlus className="h-3.5 w-3.5 mr-1" /> New Folder
          </Button>
          <Button variant="outline" size="sm" disabled className="text-xs opacity-50">
            <Upload className="h-3.5 w-3.5 mr-1" /> Upload
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm flex-wrap bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
        <button
          onClick={() => navigateTo(-1)}
          className="flex items-center gap-1 text-primary hover:underline font-medium"
        >
          <HardDrive className="h-4 w-4" />
          XITO DRIVE
        </button>
        {breadcrumb.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => navigateTo(i)}
              className={`hover:underline ${i === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-primary"}`}
            >
              {seg.label}
            </button>
          </span>
        ))}
      </div>

      {/* Folder content */}
      {renderContent()}
    </div>
  );
}
