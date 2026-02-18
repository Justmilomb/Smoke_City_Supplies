import React from "react";
import { Link, useLocation, useParams } from "wouter";
import { ImagePlus, Sparkles, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import AdminImageUpload from "@/components/admin/AdminImageUpload";
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

const schema = z.object({
  name: z.string().min(3, "Name is too short"),
  vehicle: z.enum(["motorcycle", "scooter"]),
  category: z.string().min(1, "Pick a category"),
  subcategory: z.string().min(1, "Add a subcategory"),
  brand: z.string().min(1, "Pick or add a company"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  deliveryEta: z.string().min(2, "Add a delivery time"),
  stock: z.enum(["in-stock", "low", "out"]),
  compatibility: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().min(10, "Add a short description"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  shippingWeightGrams: z.coerce.number().int().min(1).optional(),
  shippingLengthCm: z.coerce.number().int().min(1).optional(),
  shippingWidthCm: z.coerce.number().int().min(1).optional(),
  shippingHeightCm: z.coerce.number().int().min(1).optional(),
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
  const [preview, setPreview] = React.useState<string>("");
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [addingBrand, setAddingBrand] = React.useState(false);
  const [newBrandName, setNewBrandName] = React.useState("");

  const brandOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => (p.brand || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const formValues = React.useMemo(() => {
    if (!product) return undefined;
    return {
      name: product.name,
      vehicle: (product.vehicle as "motorcycle" | "scooter") ?? "motorcycle",
      category: product.category,
      subcategory: product.subcategory ?? "",
      brand: product.brand ?? "",
      price: product.price,
      deliveryEta: product.deliveryEta,
      stock: (product.stock as "in-stock" | "low" | "out") ?? "in-stock",
      compatibility: product.compatibility?.join(", ") ?? "",
      tags: product.tags?.join(", ") ?? "",
      description: product.description,
      metaTitle: product.metaTitle ?? "",
      metaDescription: product.metaDescription ?? "",
      metaKeywords: product.metaKeywords ?? "",
      shippingWeightGrams: product.shippingWeightGrams ?? 1000,
      shippingLengthCm: product.shippingLengthCm ?? 20,
      shippingWidthCm: product.shippingWidthCm ?? 15,
      shippingHeightCm: product.shippingHeightCm ?? 10,
      barcode: product.barcode ?? "",
      barcodeFormat: product.barcodeFormat ?? "",
    };
  }, [product]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      vehicle: "motorcycle",
      category: cats[0] ?? "Brakes",
      subcategory: "",
      brand: "",
      price: 0,
      deliveryEta: "Next-day delivery",
      stock: "in-stock",
      compatibility: "",
      tags: "",
      description: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      shippingWeightGrams: 1000,
      shippingLengthCm: 20,
      shippingWidthCm: 15,
      shippingHeightCm: 10,
      barcode: "",
      barcodeFormat: "",
    },
    ...(formValues ? { values: formValues } : {}),
  });
  const selectedCategory = form.watch("category");
  const categoryOptions = React.useMemo(
    () => Array.from(new Set([...(cats ?? []), selectedCategory].filter(Boolean))),
    [cats, selectedCategory]
  );

  const [seoPrompt, setSeoPrompt] = React.useState("");
  const [seoLoading, setSeoLoading] = React.useState(false);
  const [fitmentLoading, setFitmentLoading] = React.useState(false);
  const [autoFillLoading, setAutoFillLoading] = React.useState(false);

  const autoFillAll = async () => {
    const name = form.getValues("name");
    const brand = form.getValues("brand");
    const cat = form.getValues("category");
    const vehicle = form.getValues("vehicle");
    const productInfo = [name, brand, cat, vehicle].filter(Boolean).join(" - ");
    if (productInfo.length < 3) {
      toast.error("Enter a product name first");
      return;
    }
    setAutoFillLoading(true);
    try {
      const res = await fetch("/api/generate-product-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productInfo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate content");
      }
      const result = await res.json();
      if (!form.getValues("description") && result.description) form.setValue("description", result.description);
      if (!form.getValues("compatibility") && result.compatibility) form.setValue("compatibility", result.compatibility);
      if (!form.getValues("metaTitle") && result.metaTitle) form.setValue("metaTitle", result.metaTitle);
      if (!form.getValues("metaDescription") && result.metaDescription) form.setValue("metaDescription", result.metaDescription);
      if (!form.getValues("metaKeywords") && result.metaKeywords) form.setValue("metaKeywords", result.metaKeywords);
      toast.success("AI auto-fill complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-fill failed");
    } finally {
      setAutoFillLoading(false);
    }
  };

  const generateFitment = async () => {
    const info = form.getValues("name");
    const brand = form.getValues("brand");
    const cat = form.getValues("category");
    const desc = form.getValues("description");
    const productInfo = [info, brand, cat, desc].filter(Boolean).join(" - ");
    if (productInfo.length < 3) {
      toast.error("Enter product details first");
      return;
    }
    setFitmentLoading(true);
    try {
      const res = await fetch("/api/generate-fitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productInfo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate fitment");
      }
      const result = await res.json();
      form.setValue("compatibility", result.compatibility || "");
      toast.success("Compatibility auto-filled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fitment generation failed");
    } finally {
      setFitmentLoading(false);
    }
  };

  const generateSeo = async () => {
    const info = seoPrompt.trim() || form.getValues("name");
    if (!info || info.length < 3) {
      toast.error("Describe the product or enter a name first");
      return;
    }
    setSeoLoading(true);
    try {
      const res = await fetch("/api/generate-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productInfo: info }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate SEO");
      }
      const seo = await res.json();
      form.setValue("metaTitle", seo.metaTitle || "");
      form.setValue("metaDescription", seo.metaDescription || "");
      form.setValue("metaKeywords", seo.metaKeywords || "");
      toast.success("SEO generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "SEO generation failed");
    } finally {
      setSeoLoading(false);
    }
  };

  React.useEffect(() => {
    if (product) {
      setPreview(product.image || "");
    }
  }, [product]);

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

  const onSubmit = (v: FormValues) => {
    if (!id) return;
    const vehicle = v.vehicle as VehicleType;
    const category = v.category as PartCategory;
    updateProduct.mutate(
      {
        id,
        patch: {
          name: v.name,
          vehicle,
          category,
          subcategory: v.subcategory,
          brand: v.brand,
          price: v.price,
          deliveryEta: v.deliveryEta,
          stock: v.stock,
          compatibility: (v.compatibility ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          tags: (v.tags ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          image: preview || "",
          description: v.description,
          metaTitle: v.metaTitle || undefined,
          metaDescription: v.metaDescription || undefined,
          metaKeywords: v.metaKeywords || undefined,
          shippingWeightGrams: v.shippingWeightGrams || undefined,
          shippingLengthCm: v.shippingLengthCm || undefined,
          shippingWidthCm: v.shippingWidthCm || undefined,
          shippingHeightCm: v.shippingHeightCm || undefined,
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
        <div className="text-muted-foreground">Loading part…</div>
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
                <div className="text-sm font-semibold">Image</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Take a photo on mobile or drag-and-drop on desktop. JPEG, PNG, GIF, WebP up to 10MB.
              </div>
            </div>
            <div className="p-5">
              <AdminImageUpload value={preview} onChange={setPreview} />
            </div>
          </Card>

          <Card className="border-border/50 rounded-lg p-5 lg:col-span-7">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5 rounded-lg"
                    disabled={autoFillLoading}
                    onClick={autoFillAll}
                  >
                    {autoFillLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {autoFillLoading ? "Generating…" : "Auto-fill with AI"}
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10×2.5 tire" {...field} className="h-11 rounded-lg" />
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
                        {createCategory.isPending ? "Adding…" : "Save category"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Brake Pads" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                          form.setValue("brand", name, { shouldValidate: true });
                          setNewBrandName("");
                          setAddingBrand(false);
                          toast.success("Brand set — it will be saved with the product");
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
                    name="shippingWeightGrams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping weight (g)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} step={1} placeholder="1000" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingLengthCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcel length (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} step={1} placeholder="20" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingWidthCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcel width (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} step={1} placeholder="15" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingHeightCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcel height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} step={1} placeholder="10" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-lg">
                              <SelectValue placeholder="Stock" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in-stock">In stock</SelectItem>
                            <SelectItem value="low">Low stock</SelectItem>
                            <SelectItem value="out">Out of stock</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel>Compatibility (comma separated)</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-2 text-xs gap-1.5"
                          disabled={fitmentLoading}
                          onClick={generateFitment}
                        >
                          {fitmentLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {fitmentLoading ? "Generating..." : "Auto-fill"}
                        </Button>
                      </div>
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
                        <Textarea placeholder="Short, clear description…" {...field} className="min-h-[120px] rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* SEO Generation */}
                <div className="rounded-lg border border-border/60 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">SEO for Search Engines</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Describe the product below and click "Generate SEO" to auto-create meta tags for search engines. This appears in page metadata (title/description) and structured data, not as visible body text.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., 10 inch pneumatic tire for electric scooter"
                      value={seoPrompt}
                      onChange={(e) => setSeoPrompt(e.target.value)}
                      className="h-10 rounded-lg flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 rounded-lg gap-1.5 shrink-0"
                      disabled={seoLoading}
                      onClick={generateSeo}
                    >
                      {seoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {seoLoading ? "Generating…" : "Generate SEO"}
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
                    {updateProduct.isPending ? "Saving…" : "Save changes"}
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
