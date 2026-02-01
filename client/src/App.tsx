import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart";
import { withAdminGuard } from "@/components/admin/AdminGuard";
import { ContactModalProvider } from "@/components/site/ContactModal";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import StoreHome from "@/pages/store-home";
import CatalogPage from "@/pages/catalog";
import ProductPage from "@/pages/product";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import CheckoutSuccess from "@/pages/checkout-success";
import ShippingPage from "@/pages/shipping";
import ReturnsPage from "@/pages/returns";
import ContactPage from "@/pages/contact";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin";
import AdminNewPart from "@/pages/admin-new-part";
import AdminParts from "@/pages/admin-parts";
import AdminOrders from "@/pages/admin-orders";
import AdminCategories from "@/pages/admin-categories";
import AdminEditPart from "@/pages/admin-edit-part";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
      <Route path="/store" component={StoreHome} />
      <Route path="/catalog" component={CatalogPage} />
      <Route path="/product/:id" component={ProductPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/shipping" component={ShippingPage} />
      <Route path="/returns" component={ReturnsPage} />
      <Route path="/contact" component={ContactPage} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={withAdminGuard(AdminDashboard)} />
      <Route path="/admin/parts" component={withAdminGuard(AdminParts)} />
      <Route path="/admin/orders" component={withAdminGuard(AdminOrders)} />
      <Route path="/admin/categories" component={withAdminGuard(AdminCategories)} />
      <Route path="/admin/new" component={withAdminGuard(AdminNewPart)} />
      <Route path="/admin/edit/:id" component={withAdminGuard(AdminEditPart)} />

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <ContactModalProvider>
            <Toaster />
            <SonnerToaster position="top-center" richColors />
            <Router />
          </ContactModalProvider>
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
