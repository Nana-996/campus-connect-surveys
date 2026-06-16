import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, ArrowUpDown, SlidersHorizontal } from "lucide-react";

export type SortOption = { value: string; label: string };
export type FilterOption = { value: string; label: string; count?: number };

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  sort?: string;
  onSortChange?: (v: string) => void;
  sortOptions?: SortOption[];
  filters?: Array<{
    key: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: FilterOption[];
  }>;
  totalCount: number;
  filteredCount: number;
  onClear?: () => void;
  extra?: ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  sort,
  onSortChange,
  sortOptions,
  filters = [],
  totalCount,
  filteredCount,
  onClear,
  extra,
}: FilterBarProps) {
  const activeFilters = filters.filter((f) => f.value && f.value !== "all");
  const hasActive = !!search || activeFilters.length > 0;

  return (
    <div className="mb-4 rounded-2xl border border-foreground/15 bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {filters.map((f) => (
          <Select key={f.key} value={f.value || "all"} onValueChange={f.onChange}>
            <SelectTrigger className="h-10 w-auto min-w-[140px] gap-1 rounded-xl">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                  {typeof o.count === "number" && (
                    <span className="ml-2 text-xs text-muted-foreground">({o.count})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {sortOptions && onSortChange && (
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className="h-10 w-auto min-w-[160px] gap-1 rounded-xl">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {extra}
      </div>

      {(hasActive || totalCount > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="rounded-full">
            {filteredCount} of {totalCount}
          </Badge>
          {activeFilters.map((f) => {
            const opt = f.options.find((o) => o.value === f.value);
            return (
              <Badge
                key={f.key}
                variant="outline"
                className="cursor-pointer rounded-full gap-1"
                onClick={() => f.onChange("all")}
              >
                {f.label}: {opt?.label ?? f.value}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          {hasActive && onClear && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 rounded-full px-2 text-xs"
              onClick={onClear}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
