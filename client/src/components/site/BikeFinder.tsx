import React from "react";
import { Search, Bike, ChevronDown, X, MessageSquare } from "lucide-react";
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
import { getBikeMakes, getBikeModels, getBikeCCs, getBikeYears } from "@shared/bike-data";
import BikeFinderResults from "./BikeFinderResults";

export default function BikeFinder() {
  const [make, setMake] = React.useState("");
  const [model, setModel] = React.useState("");
  const [cc, setCc] = React.useState("");
  const [year, setYear] = React.useState("");
  const [freeText, setFreeText] = React.useState("");
  const [showFreeText, setShowFreeText] = React.useState(false);
  const [result, setResult] = React.useState<BikeFinderResult | null>(null);

  const finder = useBikeFinder();

  const makes = getBikeMakes();
  const models = make ? getBikeModels(make) : [];
  const ccs = make && model ? getBikeCCs(make, model) : [];
  const years = make && model ? getBikeYears(make, model) : [];

  function handleMakeChange(value: string) {
    setMake(value);
    setModel("");
    setCc("");
    setYear("");
  }

  function handleModelChange(value: string) {
    setModel(value);
    setCc("");
    setYear("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: BikeFinderInput = showFreeText
      ? { freeText }
      : { make, model, cc: cc || undefined, year: year || undefined };

    finder.mutate(input, {
      onSuccess: (data) => setResult(data),
    });
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

  const canSubmit = showFreeText
    ? freeText.trim().length >= 3
    : Boolean(make && model);

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
              Enter your bike details to see compatible parts
            </p>
          </div>
        </div>

        {!showFreeText ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setShowFreeText(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Can't find your bike?
              </button>

              <Button type="submit" disabled={!canSubmit || finder.isPending} className="gap-2">
                {finder.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Find Compatible Parts
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="bike-freetext" className="mb-1.5 text-xs font-medium text-muted-foreground">
                Describe your bike
              </Label>
              <Input
                id="bike-freetext"
                placeholder='e.g. "Honda CB500X 2023" or "Yamaha MT07 689cc 2020"'
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setShowFreeText(false)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Use dropdown selectors
              </button>

              <Button type="submit" disabled={!canSubmit || finder.isPending} className="gap-2">
                {finder.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Find Compatible Parts
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {finder.isError && (
          <p className="mt-3 text-sm text-destructive">
            {finder.error?.message || "Something went wrong. Please try again."}
          </p>
        )}
      </form>
    </Card>
  );
}
