import React from "react";
import { Search, Bike, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBikeFinder, type BikeFinderInput, type BikeFinderResult } from "@/lib/bike-finder";
import { BIKE_DATA, getBikeMakes, getBikeModels, getBikeCCs, getBikeYears } from "@shared/bike-data";
import BikeFinderResults from "./BikeFinderResults";

/** Build a flat list of all bike names for typeahead */
function getAllBikeNames(): string[] {
  const names: string[] = [];
  for (const make of BIKE_DATA) {
    for (const model of make.models) {
      names.push(`${make.make} ${model.model}`);
    }
  }
  return names;
}

const ALL_BIKE_NAMES = getAllBikeNames();

/** Fuzzy match bike names against user input */
function fuzzyMatchBikes(query: string, limit = 8): string[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().replace(/[-\s.]/g, "");
  return ALL_BIKE_NAMES
    .filter((name) => {
      const n = name.toLowerCase().replace(/[-\s.]/g, "");
      return n.includes(q) || q.split("").every((ch) => n.includes(ch));
    })
    .slice(0, limit);
}

const PROGRESS_STEPS = [
  "Identifying your bike...",
  "Checking compatibility...",
  "Loading results...",
];

export default function BikeFinder() {
  const [make, setMake] = React.useState("");
  const [model, setModel] = React.useState("");
  const [cc, setCc] = React.useState("");
  const [year, setYear] = React.useState("");
  const [freeText, setFreeText] = React.useState("");
  const [showDropdowns, setShowDropdowns] = React.useState(false);
  const [result, setResult] = React.useState<BikeFinderResult | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [progressStep, setProgressStep] = React.useState(0);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const finder = useBikeFinder();

  const makes = getBikeMakes();
  const models = make ? getBikeModels(make) : [];
  const ccs = make && model ? getBikeCCs(make, model) : [];
  const years = make && model ? getBikeYears(make, model) : [];

  // Progress step animation during loading
  React.useEffect(() => {
    if (!finder.isPending) {
      setProgressStep(0);
      return;
    }
    setProgressStep(0);
    const t1 = setTimeout(() => setProgressStep(1), 2000);
    const t2 = setTimeout(() => setProgressStep(2), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [finder.isPending]);

  // Close suggestions on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleFreeTextChange(value: string) {
    setFreeText(value);
    const matches = fuzzyMatchBikes(value);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }

  function handleSuggestionClick(name: string) {
    setFreeText(name);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleMakeChange(value: string) {
    setMake(value);
    setModel("");
    setCc("");
    setYear("");
    // Auto-fill text field
    setFreeText(value + " ");
  }

  function handleModelChange(value: string) {
    setModel(value);
    setCc("");
    setYear("");
    setFreeText(`${make} ${value}`);
  }

  function doSearch(input: BikeFinderInput) {
    finder.mutate(input, {
      onSuccess: (data) => setResult(data),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);

    // If dropdowns are filled, use structured input
    if (showDropdowns && make && model) {
      doSearch({ make, model, cc: cc || undefined, year: year || undefined });
    } else if (freeText.trim().length >= 3) {
      doSearch({ freeText: freeText.trim() });
    }
  }

  function handleClear() {
    setResult(null);
    setMake("");
    setModel("");
    setCc("");
    setYear("");
    setFreeText("");
    finder.reset();
  }

  const canSubmit = freeText.trim().length >= 3 || (showDropdowns && Boolean(make && model));

  if (result) {
    return <BikeFinderResults result={result} onClear={handleClear} />;
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <form onSubmit={handleSubmit} className="p-5 md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bike className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Find Parts for Your Bike</h2>
            <p className="text-sm text-muted-foreground">
              Type your bike or use the dropdowns below
            </p>
          </div>
        </div>

        {/* Primary: Free text input with typeahead */}
        <div className="relative" ref={suggestionsRef}>
          <Label htmlFor="bike-search" className="mb-1.5 text-xs font-medium text-muted-foreground">
            Your bike
          </Label>
          <Input
            ref={inputRef}
            id="bike-search"
            placeholder='e.g. "BMW R850C" or "Honda CB500X 2023"'
            value={freeText}
            onChange={(e) => handleFreeTextChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-accent"
                  onClick={() => handleSuggestionClick(name)}
                >
                  <Bike className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {name}
                </button>
              ))}
              {freeText.trim().length >= 3 && (
                <button
                  type="button"
                  className="flex w-full items-center border-t border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                  onClick={() => { setShowSuggestions(false); }}
                >
                  <Search className="mr-2 h-3.5 w-3.5" />
                  Search for "{freeText.trim()}"
                </button>
              )}
            </div>
          )}
        </div>

        {/* Toggle for dropdown refiners */}
        <button
          type="button"
          onClick={() => setShowDropdowns(!showDropdowns)}
          className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {showDropdowns ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showDropdowns ? "Hide dropdown selectors" : "Or use dropdown selectors"}
        </button>

        {/* Optional: Dropdown refiners */}
        {showDropdowns && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="bike-make" className="mb-1.5 text-xs font-medium text-muted-foreground">
                Make
              </Label>
              <Select value={make} onValueChange={handleMakeChange}>
                <SelectTrigger id="bike-make">
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  {makes.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bike-model" className="mb-1.5 text-xs font-medium text-muted-foreground">
                Model
              </Label>
              <Select value={model} onValueChange={handleModelChange} disabled={!make}>
                <SelectTrigger id="bike-model">
                  <SelectValue placeholder={make ? "Select model" : "Pick make first"} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.model} value={m.model}>{m.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bike-cc" className="mb-1.5 text-xs font-medium text-muted-foreground">
                CC
              </Label>
              <Select value={cc} onValueChange={setCc} disabled={!model || ccs.length <= 1}>
                <SelectTrigger id="bike-cc">
                  <SelectValue placeholder={ccs.length === 1 ? `${ccs[0]}cc` : "Select CC"} />
                </SelectTrigger>
                <SelectContent>
                  {ccs.map((c) => (
                    <SelectItem key={c} value={c}>{c}cc</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bike-year" className="mb-1.5 text-xs font-medium text-muted-foreground">
                Year
              </Label>
              <Select value={year} onValueChange={setYear} disabled={!model}>
                <SelectTrigger id="bike-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={!canSubmit || finder.isPending} className="gap-2">
            {finder.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {PROGRESS_STEPS[progressStep]}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find Compatible Parts
              </>
            )}
          </Button>
        </div>

        {finder.isError && (
          <p className="mt-3 text-sm text-destructive">
            {finder.error?.message || "Something went wrong. Please try again."}
          </p>
        )}
      </form>
    </Card>
  );
}
