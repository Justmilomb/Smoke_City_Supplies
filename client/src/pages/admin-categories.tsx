import React from "react";
import { Link } from "wouter";
import { FolderTree, Plus, Pencil, Trash2 } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  useCategoriesQuery,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
} from "@/lib/categories";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminCategories() {
  usePageMeta({ title: "Categories", description: "Organize product categories." });
  const { data: categories, isLoading } = useCategoriesQuery();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [vehicleType, setVehicleType] = React.useState<"bike" | "scooter" | "all">("all");

  const resetForm = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setVehicleType("all");
    setDialogOpen(false);
  };

  const handleNameChange = (v: string) => {
    setName(v);
    if (!editing) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a category name");
      return;
    }
    const s = slug.trim() || slugify(name);
    try {
      if (editing) {
        await updateCategory.mutateAsync({
          id: editing.id,
          data: { name: name.trim(), slug: s, vehicleType },
        });
        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync({
          name: name.trim(),
          slug: s,
          vehicleType,
        });
        toast.success("Category added");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Products using it will keep the category name.")) return;
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setVehicleType((c.vehicleType as "bike" | "scooter" | "all") || "all");
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-muted-foreground">Loading categories…</p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Categories
              </h1>
              <p className="mt-2 text-muted-foreground">
                Organize your products with custom categories
              </p>
            </div>
            <BackButton fallback="/admin" />
          </div>
          <Button
            data-testid="button-add-category"
            size="lg"
            className="gap-2"
              onClick={() => {
                setEditing(null);
                setName("");
                setSlug("");
                setVehicleType("all");
                setDialogOpen(true);
              }}
            >
            <Plus className="mr-2 h-4 w-4" /> Add category
          </Button>
        </div>

        <Card className="border-border/50 p-6">
          {!categories?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <FolderTree className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No categories yet</p>
              <p className="text-sm">Add a category to organize your parts.</p>
              <Button
                className="mt-4 rounded-lg"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Add category
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/50 bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="outline" className="rounded-md text-xs">
                      {c.vehicleType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{c.slug}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg text-destructive hover:text-destructive"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Brakes"
                className="h-11 rounded-lg"
                disabled={createCategory.isPending || updateCategory.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="brakes"
                className="h-11 rounded-lg font-mono text-sm"
                disabled={createCategory.isPending || updateCategory.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle type</Label>
              <Select
                value={vehicleType}
                onValueChange={(v) => setVehicleType(v as "bike" | "scooter" | "all")}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={createCategory.isPending || updateCategory.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCategory.isPending || updateCategory.isPending}
                className="rounded-2xl"
              >
                {editing ? "Update" : "Add"} category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
