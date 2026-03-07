import React from "react";
import { Link, useLocation } from "wouter";
import { ImagePlus, ScanLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import AdminMultiImageUpload from "@/components/admin/AdminMultiImageUpload";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useCategories } from "@/lib/store";
import { useCreateProduct, useProducts } from "@/lib/products";
import { useCreateCategory } from "@/lib/categories";
import type { PartCategory, VehicleType } from "@/lib/mockData";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function stockFromQuantity(qty: number): "in-stock" | "low" | "out" {
  if (qty <= 0) return "out";
  if (qty <= 5) return "low";
  return "in-stock";
}

const schema = z.object({
  name: z.string().min(3, "Name is too short"),
  vehicle: z.enum(["motorcycle", "scooter"]),
  category: z.string().min(1, "Pick a category"),
  brand: z.string().min(1, "Pick or add a company"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  deliveryEta: z.string().min(2, "Add a delivery time"),
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or more"),
  compatibility: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().min(10, "Add a short description"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  barcode: z.string().optional(),
  barcodeFormat: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminNewPart() {
  usePageMeta({ title: "Add Product", description: "Add a new product to the catalog.", noindex: true });
  const cats = useCategories();
  const { data: products = [] } = useProducts();
  const createProduct = useCreateProduct();
  const createCategory = useCreateCategory();
  const [, setLoc] = useLocation();

  const [created, setCreated] = React.useState(false);
  const [preview, setPreview] = React.useState<string[]>([]);
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [addingBrand, setAddingBrand] = React.useState(false);
  const [newBrandName, setNewBrandName] = React.useState("");
  const [extraBrands, setExtraBrands] = React.useState<string[]>([]);
  const [seoGenerating, setSeoGenerating] = React.useState(false);

  const brandOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...products.map((p) => (p.brand || "").trim()),
            ...extraBrands,
          ].filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products, extraBrands]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      vehicle: "motorcycle",
      category: "",
      brand: "",
      price: 0,
      deliveryEta: "Next-day delivery",
      quantity: 1,
      compatibility: "",
      tags: "",
      description: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      barcode: "",
      barcodeFormat: "",
    },
  });
  const selectedCategory = form.watch("category");
  const categoryOptions = React.useMemo(
    () => Array.from(new Set([...(cats ?? []), selectedCategory].filter(Boolean))),
    [cats, selectedCategory]
  );

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const barcode = params.get("barcode");
    if (barcode) {
      form.setValue("barcode", barcode);
      form.setValue("barcodeFormat", params.get("format") || "unknown");
    }
  }, [form]);

  const handleGenerateSeo = async () => {
    const v = form.getValues();
    const parts = [
      v.name && `Product: ${v.name}`,
      v.brand && `Brand: ${v.brand}`,
      v.category && `Category: ${v.category}`,
      v.description && `Description: ${v.description}`,
      v.compatibility && `Compatibility: ${v.compatibility}`,
      v.tags && `Tags: ${v.tags}`,
    ].filter(Boolean);
    const productInfo = parts.join(". ");
    if (!productInfo || productInfo.length < 10) {
      toast.error("Fill in at least a product name and description first");
      return;
    }
    setSeoGenerating(true);
    try {
      const res = await fetch("/api/generate-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productInfo }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "SEO generation failed");
      if (data.metaTitle) form.setValue("metaTitle", data.metaTitle);
      if (data.metaDescription) form.setValue("metaDescription", data.metaDescription);
      if (data.metaKeywords) form.setValue("metaKeywords", data.metaKeywords);
      toast.success("SEO fields generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "SEO generation failed");
    } finally {
      setSeoGenerating(false);
    }
  };

  const addCategoryInline = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Enter a category name");
      return;
    }
    const vehicle = form.getValues("vehicle");
    const vehicleType = vehicle === "scooter" ? "scooter" : vehicle === "motorcycle" ? "motorcycle" : "all";
    try {
      const created = await createCategory.mutateAsync({
        name,
        slug: slugify(name),
        vehicleType,
      });
      form.setValue("category", created.name, { shouldValidate: true });
      setNewCategoryName("");
      setAddingCategory(false);
      toast.success("Category added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add category");
    }
  };

  const watchedQuantity = form.watch("quantity");

  const onSubmit = (v: FormValues) => {
    const vehicle = v.vehicle as VehicleType;
    const category = v.category as PartCategory;
    const stock = stockFromQuantity(v.quantity);

    createProduct.mutate(
      {
        name: v.name,
        vehicle,
        category,
        brand: v.brand,
        price: v.price,
        rating: 4.6,
        reviewCount: 0,
        stock,
        quantity: v.quantity,
        deliveryEta: v.deliveryEta,
        compatibility: (v.compatibility ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tags: (v.tags ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        image: preview[0] || "",
        images: preview,
        description: v.description,
        specs: [
          { label: "Vehicle", value: vehicle },
          { label: "Category", value: category },
          { label: "Brand", value: v.brand },
        ],
        metaTitle: v.metaTitle || undefined,
        metaDescription: v.metaDescription || undefined,
        metaKeywords: v.metaKeywords || undefined,
        barcode: v.barcode || undefined,
        barcodeFormat: v.barcodeFormat || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Part added");
          setCreated(true);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (created) {
    return (
      <SiteLayout>
        <div className="flex flex-col gap-6 max-w-md mx-auto py-12">
          <div className="text-center">
            <div className="text-4xl mb-4">&#10003;</div>
            <h1 className="text-2xl font-bold tracking-tight">Product Created!</h1>
            <p className="mt-2 text-muted-foreground">What would you like to do next?</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="h-14 gap-3 text-base"
              onClick={() => setLoc("/admin/inventory")}
            >
              <ScanLine className="h-5 w-5" />
              Scan Another Barcode
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 text-base"
              onClick={() => setLoc("/admin/parts")}
            >
              Go Back to Products
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Add Product
            </h1>
            <p className="mt-2 text-muted-foreground">
              Upload an image and fill in product details
            </p>
          </div>
          <BackButton fallback="/admin" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="border-border/50 overflow-hidden rounded-lg lg:col-span-5">
            <div className="border-b border-border/60 p-5">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">Images</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Upload multiple images. Drag to reorder — first image is the main photo.
              </div>
            </div>
            <div className="p-5">
              <AdminMultiImageUpload value={preview} onChange={setPreview} />
            </div>
          </Card>

          <Card className="border-border/50 rounded-lg p-5 lg:col-span-7">
            <Form {...form}>
              <form data-testid="form-admin-new" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-part-name" placeholder="e.g., 10x2.5 tire, 160mm rotor" {...field} className="h-11 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="vehicle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-part-vehicle" className="h-11 rounded-lg">
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem data-testid="option-part-vehicle-motorcycle" value="motorcycle">Motorcycle</SelectItem>
                            <SelectItem data-testid="option-part-vehicle-scooter" value="scooter">Scooter</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>Category</FormLabel>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => setAddingCategory((v) => !v)}
                          >
                            {addingCategory ? "Close" : "Add category"}
                          </Button>
                        </div>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-part-category" className="h-11 rounded-lg">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((c) => (
                              <SelectItem data-testid={`option-part-category-${c}`} key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {addingCategory && (
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        placeholder="New category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="h-10 rounded-lg"
                      />
                      <Button
                        type="button"
                        className="h-10 rounded-lg"
                        disabled={createCategory.isPending}
                        onClick={addCategoryInline}
                      >
                        {createCategory.isPending ? "Adding..." : "Save category"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>Company / Brand</FormLabel>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => setAddingBrand((v) => !v)}
                          >
                            {addingBrand ? "Close" : "Add brand"}
                          </Button>
                        </div>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-lg">
                              <SelectValue placeholder="Select brand" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brandOptions.map((brand) => (
                              <SelectItem key={brand} value={brand}>
                                {brand}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {addingBrand && (
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        placeholder="New brand name"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        className="h-10 rounded-lg"
                      />
                      <Button
                        type="button"
                        className="h-10 rounded-lg"
                        onClick={() => {
                          const name = newBrandName.trim();
                          if (!name) { toast.error("Enter a brand name"); return; }
                          setExtraBrands((prev) => [...prev, name]);
                          form.setValue("brand", name, { shouldValidate: true });
                          setNewBrandName("");
                          setAddingBrand(false);
                          toast.success("Brand added");
                        }}
                      >
                        Save brand
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input data-testid="input-part-barcode" placeholder="Scan or type barcode" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcodeFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode format (optional)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-part-barcode-format" placeholder="e.g. ean_13, code_128" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (GBP)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-part-price" type="number" step="0.01" placeholder="19.99" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Stock quantity
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({stockFromQuantity(watchedQuantity) === "in-stock"
                              ? "In stock"
                              : stockFromQuantity(watchedQuantity) === "low"
                                ? "Low stock"
                                : "Out of stock"})
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input data-testid="input-part-quantity" type="number" min={0} step={1} placeholder="1" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deliveryEta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery promise</FormLabel>
                      <FormControl>
                        <Input data-testid="input-part-delivery" placeholder="Next-day delivery" {...field} className="h-11 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compatibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compatibility (comma separated)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-part-compat" placeholder="e.g., Honda CBR600RR (2007-2024), Yamaha R6 (2006-2020)" {...field} className="h-11 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (comma separated)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-part-tags" placeholder="e.g., Popular, Fast shipping" {...field} className="h-11 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea data-testid="textarea-part-description" placeholder="Short, clear description..." {...field} className="min-h-[120px] rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* SEO */}
                <div className="rounded-lg border border-border/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">SEO for Search Engines</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateSeo}
                      disabled={seoGenerating}
                      className="h-8 text-xs"
                    >
                      {seoGenerating ? "Generating..." : "Complete SEO"}
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Meta Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO page title (max 60 chars)" {...field} className="h-9 rounded-lg text-sm" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Meta Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="SEO description (max 160 chars)" {...field} className="min-h-[60px] rounded-lg text-sm" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="metaKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Meta Keywords</FormLabel>
                        <FormControl>
                          <Input placeholder="keyword1, keyword2, keyword3" {...field} className="h-9 rounded-lg text-sm" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    data-testid="button-admin-save"
                    type="submit"
                    className="h-11 rounded-lg"
                    disabled={createProduct.isPending}
                  >
                    {createProduct.isPending ? "Saving..." : "Save part"}
                  </Button>
                  <Button
                    data-testid="button-admin-cancel"
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-lg"
                    onClick={() => setLoc("/admin")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
