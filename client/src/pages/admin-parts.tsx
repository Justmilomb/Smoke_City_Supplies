import React from "react";
import { Link } from "wouter";
import { Edit3, Minus, Plus, ScanLine, Trash2, Search, X, CheckSquare, Image, DollarSign, Package, RefreshCw } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useProducts, useDeleteProduct, useUpdateProductQuantity, useBulkUpdateProducts, useEbaySyncProduct, useEbayBulkSync, useEbayPullStock } from "@/lib/products";
import { getProductImage } from "@/lib/mockData";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const PAGE_SIZE = 25;

function stockTone(stock: string) {
  if (stock === "in-stock") return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  if (stock === "low") return "bg-amber-500/12 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/12 text-rose-700 dark:text-rose-300";
}

export default function AdminParts() {
  usePageMeta({ title: "Products", description: "Manage inventory and catalog.", noindex: true });
  const { data: parts = [], isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const updateQuantity = useUpdateProductQuantity();
  const bulkUpdate = useBulkUpdateProducts();
  const ebaySync = useEbaySyncProduct();
  const ebayBulkSync = useEbayBulkSync();
  const ebayPullStock = useEbayPullStock();
  const isMobile = useIsMobile();

  // Filters
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [stockFilter, setStockFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  // Bulk selection
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = React.useState("");
  const [bulkValue, setBulkValue] = React.useState("");

  // Derive categories from data
  const categories = React.useMemo(
    () => Array.from(new Set(parts.map((p) => p.category).filter(Boolean))).sort(),
    [parts]
  );

  // Filter + search
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...parts];

    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (stockFilter !== "all") list = list.filter((p) => p.stock === stockFilter);
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name} ${p.partNumber ?? ""} ${p.brand ?? ""} ${p.category} ${p.vehicle} ${p.barcode ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return list.sort((a, b) => a.id.localeCompare(b.id));
  }, [parts, search, categoryFilter, stockFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  React.useEffect(() => setPage(1), [search, categoryFilter, stockFilter]);

  // Clear selection when filters change
  React.useEffect(() => setSelected(new Set()), [search, categoryFilter, stockFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((p) => p.id)));
    }
  };

  const handleQuantityChange = (id: string, value: number) => {
    if (value < 0) return;
    updateQuantity.mutate(
      { id, quantity: value },
      {
        onSuccess: () => toast.success("Quantity updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    deleteProduct.mutate(id, {
      onSuccess: () => toast.success("Part removed"),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleBulkApply = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast.error("No products selected"); return; }

    if (bulkAction === "sold-out") {
      bulkUpdate.mutate({ ids, patch: { quantity: 0, stock: "out" } }, {
        onSuccess: (d) => { toast.success(`${d.updated} products marked sold out`); setSelected(new Set()); setBulkAction(""); },
        onError: (err) => toast.error(err.message),
      });
    } else if (bulkAction === "set-quantity") {
      const qty = parseInt(bulkValue, 10);
      if (isNaN(qty) || qty < 0) { toast.error("Enter a valid quantity"); return; }
      bulkUpdate.mutate({ ids, patch: { quantity: qty } }, {
        onSuccess: (d) => { toast.success(`${d.updated} products updated to qty ${qty}`); setSelected(new Set()); setBulkAction(""); setBulkValue(""); },
        onError: (err) => toast.error(err.message),
      });
    } else if (bulkAction === "set-price") {
      const price = parseFloat(bulkValue);
      if (isNaN(price) || price < 0) { toast.error("Enter a valid price"); return; }
      bulkUpdate.mutate({ ids, patch: { price } }, {
        onSuccess: (d) => { toast.success(`${d.updated} products price updated`); setSelected(new Set()); setBulkAction(""); setBulkValue(""); },
        onError: (err) => toast.error(err.message),
      });
    } else if (bulkAction === "set-image") {
      if (!bulkValue.trim()) { toast.error("Enter an image URL"); return; }
      bulkUpdate.mutate({ ids, patch: { image: bulkValue.trim() } }, {
        onSuccess: (d) => { toast.success(`${d.updated} products image updated`); setSelected(new Set()); setBulkAction(""); setBulkValue(""); },
        onError: (err) => toast.error(err.message),
      });
    } else if (bulkAction === "sync-ebay") {
      ebayBulkSync.mutate(ids, {
        onSuccess: (d) => { toast.success(`${d.synced} synced, ${d.failed} failed`); setSelected(new Set()); setBulkAction(""); },
        onError: (err) => toast.error(err.message),
      });
    } else if (bulkAction === "delete") {
      if (!confirm(`Delete ${ids.length} products? This cannot be undone.`)) return;
      Promise.all(ids.map((id) => deleteProduct.mutateAsync(id)))
        .then(() => { toast.success(`${ids.length} products deleted`); setSelected(new Set()); setBulkAction(""); })
        .catch((err) => toast.error(err.message));
    } else {
      toast.error("Select a bulk action first");
    }
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Loading parts…</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Products
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {parts.length} total — {filtered.length} shown
              </p>
            </div>
            <BackButton fallback="/admin" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              disabled={ebayBulkSync.isPending}
              onClick={() => {
                ebayBulkSync.mutate(undefined, {
                  onSuccess: (d) => toast.success(`eBay: ${d.synced} synced, ${d.failed} failed`),
                  onError: (err) => toast.error(err.message),
                });
              }}
            >
              <RefreshCw className={`h-5 w-5 ${ebayBulkSync.isPending ? "animate-spin" : ""}`} />
              Sync All eBay
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              disabled={ebayPullStock.isPending}
              onClick={() => {
                ebayPullStock.mutate(undefined, {
                  onSuccess: () => toast.success("eBay stock pulled"),
                  onError: (err) => toast.error(err.message),
                });
              }}
            >
              <Package className={`h-5 w-5 ${ebayPullStock.isPending ? "animate-spin" : ""}`} />
              Pull eBay Stock
            </Button>
            <Link href="/admin/inventory">
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a>
                  <ScanLine className="h-5 w-5" />
                  Scan Barcode
                </a>
              </Button>
            </Link>
            <Link href="/admin/new">
              <Button size="lg" className="gap-2" asChild>
                <a data-testid="link-admin-add">
                  <Plus className="h-5 w-5" />
                  Add Product
                </a>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="All stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Sold Out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center">
            <span className="text-sm font-medium">
              <CheckSquare className="mr-1.5 inline h-4 w-4" />
              {selected.size} selected
            </span>
            <Select value={bulkAction} onValueChange={(v) => { setBulkAction(v); setBulkValue(""); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Bulk action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sold-out">Mark Sold Out</SelectItem>
                <SelectItem value="set-quantity">Set Quantity</SelectItem>
                <SelectItem value="set-price">Set Price</SelectItem>
                <SelectItem value="set-image">Set Image URL</SelectItem>
                <SelectItem value="sync-ebay">Sync to eBay</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
            {(bulkAction === "set-quantity" || bulkAction === "set-price" || bulkAction === "set-image") && (
              <Input
                placeholder={bulkAction === "set-quantity" ? "Quantity" : bulkAction === "set-price" ? "Price (£)" : "Image URL"}
                type={bulkAction === "set-image" ? "text" : "number"}
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="w-full sm:w-36"
              />
            )}
            <Button
              size="sm"
              onClick={handleBulkApply}
              disabled={!bulkAction || bulkUpdate.isPending}
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setSelected(new Set()); setBulkAction(""); setBulkValue(""); }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Products table/list */}
        <Card className="border-border/50 overflow-hidden">
          {isMobile ? (
            <div className="divide-y divide-border/60">
              {paginated.map((p) => (
                <div
                  key={p.id}
                  data-testid={`row-admin-part-${p.id}`}
                  className="flex flex-col gap-4 p-5"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
                      className="mt-1"
                    />
                    <img
                      data-testid={`img-admin-part-${p.id}`}
                      src={getProductImage(p)}
                      alt={p.name}
                      className="h-14 w-14 shrink-0 rounded-xl bg-[hsl(var(--muted))] object-contain p-2"
                    />
                    <div className="min-w-0 flex-1">
                      <div data-testid={`text-admin-part-name-${p.id}`} className="font-semibold">
                        {p.name}
                      </div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{p.deliveryEta}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-md text-xs">
                          {p.vehicle}
                        </Badge>
                        <Badge variant="outline" className="rounded-md text-xs">
                          {p.category}
                        </Badge>
                        <Badge data-testid={`badge-admin-stock-${p.id}`} variant="outline" className={`rounded-md text-xs ${stockTone(p.stock)}`}>
                          {p.stock}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm font-medium tabular-nums">£{p.price.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 min-h-[44px] w-11 min-w-[44px] rounded-lg touch-manipulation"
                        onClick={() => handleQuantityChange(p.id, Math.max(0, (p.quantity ?? 0) - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums">
                        {p.quantity ?? 0}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 min-h-[44px] w-11 min-w-[44px] rounded-lg touch-manipulation"
                        onClick={() => handleQuantityChange(p.id, (p.quantity ?? 0) + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/edit/${p.id}`}>
                        <a>
                          <Button
                            data-testid={`button-admin-edit-${p.id}`}
                            variant="outline"
                            size="sm"
                            className="h-11 min-h-[44px] rounded-lg gap-2 touch-manipulation"
                          >
                            <Edit3 className="h-4 w-4" />
                            <span className="hidden md:inline">Edit</span>
                          </Button>
                        </a>
                      </Link>
                      <Button
                        data-testid={`button-admin-delete-${p.id}`}
                        variant="destructive"
                        size="sm"
                        className="h-11 min-h-[44px] rounded-lg gap-2 touch-manipulation"
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={deleteProduct.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden md:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={paginated.length > 0 && selected.size === paginated.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>eBay</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((p) => (
                  <TableRow key={p.id} data-testid={`row-admin-part-${p.id}`} className={selected.has(p.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          data-testid={`img-admin-part-${p.id}`}
                          src={getProductImage(p)}
                          alt={p.name}
                          className="h-10 w-10 rounded-xl bg-[hsl(var(--muted))] object-contain p-2"
                        />
                        <div>
                          <div data-testid={`text-admin-part-name-${p.id}`} className="text-sm font-semibold">
                            {p.name}
                          </div>
                          <div className="text-xs text-muted-foreground">{p.deliveryEta}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.vehicle}</TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-sm tabular-nums">£{p.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge data-testid={`badge-admin-stock-${p.id}`} variant="outline" className={`rounded-md ${stockTone(p.stock)}`}>
                        {p.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleQuantityChange(p.id, Math.max(0, (p.quantity ?? 0) - 1))}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">
                          {p.quantity ?? 0}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleQuantityChange(p.id, (p.quantity ?? 0) + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.barcode ? (
                        <span className="font-mono">{p.barcode}</span>
                      ) : (
                        <span className="text-muted-foreground">Unlinked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.ebaySyncStatus === "synced" && (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" title="Synced to eBay" />
                      )}
                      {p.ebaySyncStatus === "pending" && (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" title="Pending" />
                      )}
                      {p.ebaySyncStatus === "error" && (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" title="eBay sync error" />
                      )}
                      {!p.ebaySyncStatus && (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" title="Not listed on eBay" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/edit/${p.id}`}>
                          <a>
                            <Button
                              data-testid={`button-admin-edit-${p.id}`}
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-lg gap-2"
                            >
                              <Edit3 className="h-4 w-4" />
                              Edit
                            </Button>
                          </a>
                        </Link>
                        <Button
                          data-testid={`button-admin-delete-${p.id}`}
                          variant="destructive"
                          size="sm"
                          className="h-9 rounded-lg gap-2"
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deleteProduct.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filtered.length === 0 && (
            <div className="px-8 py-12 text-center text-muted-foreground">
              No products match your filters.
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
