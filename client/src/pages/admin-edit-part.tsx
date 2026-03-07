import React from "react";
import { Link, useLocation, useParams } from "wouter";
import { ImagePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import AdminMultiImageUpload from "@/components/admin/AdminMultiImageUpload";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useCategories } from "@/lib/store";
import { useProduct, useProducts, useUpdateProduct } from "@/lib/products";
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

export default function AdminEditPart() {
  const params = useParams();
  const id = params?.id;
  const [, setLoc] = useLocation();
  const { data: product, isLoading } = useProduct(id);
  const { data: products = [] } = useProducts();
  const updateProduct = useUpdateProduct();
  const createCategory = useCreateCategory();
  const cats = useCategories();
  usePageMeta({ title: product ? `Edit ${product.name}` : "Edit Product", description: "Edit part details and image.", noindex: true });
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
            (product?.brand || "").trim(),
            ...extraBrands,
          ].filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products, product?.brand, extraBrands]
  );

  const productValues = React.useMemo<FormValues | undefined>(() => {
    if (!product) return undefined;
    return {
      name: product.name,
      vehicle: (product.vehicle as "motorcycle" | "scooter") ?? "motorcycle",
      category: product.category,
      brand: product.brand ?? "",
      price: product.price,
      deliveryEta: product.deliveryEta,
      quantity: product.quantity ?? 0,
      compatibility: product.compatibility?.join(", ") ?? "",
      tags: product.tags?.join(", ") ?? "",
      description: product.description,
      metaTitle: product.metaTitle ?? "",
      metaDescription: product.metaDescription ?? "",
      metaKeywords: product.metaKeywords ?? "",
      barcode: product.barcode ?? "",
      barcodeFormat: product.barcodeFormat ?? "",
    };
  }, [product]);

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
    values: productValues,
    resetOptions: { keepDirtyValues: true },
  });
  const selectedCategory = form.watch("category");
  const categoryOptions = React.useMemo(
    () => Array.from(new Set([...(cats ?? []), product?.category, selectedCategory].filter((v): v is string => Boolean(v)))),
    [cats, product?.category, selectedCategory]
  );

  React.useEffect(() => {
    if (product) {
      setPreview(product.images ?? (product.image ? [product.image] : []));
    }
  }, [product]);

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
      if (data.metaTitle) form.setValue("metaTitle", data.metaTitle, { shouldDirty: true });
      if (data.metaDescription) form.setValue("metaDescription", data.metaDescription, { shouldDirty: true });
      if (data.metaKeywords) form.setValue("metaKeywords", data.metaKeywords, { shouldDirty: true });
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
      form.setValue("category", created.name, { shouldValidate: true, shouldDirty: true });
      setNewCategoryName("");
      setAddingCategory(false);
      toast.success("Category added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add category");
    }
  };

  const watchedQuantity = form.watch("quantity");

  const onSubmit = (v: FormValues) => {
    if (!id) return;
    const vehicle = v.vehicle as VehicleType;
    const category = v.category as PartCategory;
    const stock = stockFromQuantity(v.quantity);
    updateProduct.mutate(
      {
        id,
        patch: {
          name: v.name,
          vehicle,
          category,
          brand: v.brand,
          price: v.price,
          deliveryEta: v.deliveryEta,
          stock,
          quantity: v.quantity,
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
          metaTitle: v.metaTitle || undefined,
          metaDescription: v.metaDescription || undefined,
          metaKeywords: v.metaKeywords || undefined,
          barcode: v.barcode || undefined,
          barcodeFormat: v.barcodeFormat || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Part updated");
          setLoc("/admin/parts");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (!id) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Missing product ID</div>
      </SiteLayout>
    );
  }

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Loading part...</div>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Part not found</div>
        <Link href="/admin/parts">
          <a className="text-primary hover:underline">Back to parts</a>
        </Link>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Edit Product
            </h1>
            <p className="mt-2 text-muted-foreground">
              Update product details and image
            </p>
          </div>
          <BackButton fallback="/admin/parts" />
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10x2.5 tire" {...field} className="h-11 rounded-lg" />
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
                            <SelectTrigger className="h-11 rounded-lg">
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="motorcycle">Motorcycle</SelectItem>
                            <SelectItem value="scooter">Scooter</SelectItem>
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
                            <SelectTrigger className="h-11 rounded-lg">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((c) => (
                              <SelectItem key={c} value={c}>
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
                          form.setValue("brand", name, { shouldValidate: true, shouldDirty: true });
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
                          <Input placeholder="Scan or type barcode" {...field} className="h-11 rounded-lg" />
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
                          <Input placeholder="e.g. ean_13, code_128" {...field} className="h-11 rounded-lg" />
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
                          <Input type="number" step="0.01" placeholder="19.99" {...field} className="h-11 rounded-lg" />
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
                          <Input type="number" min={0} step={1} placeholder="1" {...field} className="h-11 rounded-lg" />
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
                        <Input placeholder="Next-day delivery" {...field} className="h-11 rounded-lg" />
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
                        <Input placeholder="e.g., Honda CBR600RR (2007-2024), Yamaha R6 (2006-2020)" {...field} className="h-11 rounded-lg" />
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
                        <Input placeholder="e.g., Popular, Fast shipping" {...field} className="h-11 rounded-lg" />
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
                        <Textarea placeholder="Short, clear description..." {...field} className="min-h-[120px] rounded-lg" />
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
                    type="submit"
                    className="h-11 rounded-lg"
                    disabled={updateProduct.isPending}
                  >
                    {updateProduct.isPending ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-lg"
                    onClick={() => setLoc("/admin/parts")}
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
