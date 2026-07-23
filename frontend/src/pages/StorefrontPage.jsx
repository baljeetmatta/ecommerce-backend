import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
  Trash2,
  UserRound,
  Video,
  WalletCards,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, customerAuthStore } from "../services/api.js";
import ForgotPasswordForm from "../components/ForgotPasswordForm.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import { clearPayuReturn, openPayuModal, readPayuReturn } from "../utils/payuCheckout.js";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
const cartUnitPrice = (item) => Number(item.variant?.price ?? item.product.offerPrice ?? item.product.price);

const currentStorefrontRoute = () => {
  if (window.location.hash) return window.location.hash;
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  return pathname === "/" ? "#/" : `#${pathname}${window.location.search}`;
};

const productImage = (product) =>
  product.mainImage ||
  product.media?.find((item) => item.type === "image")?.url ||
  templateProductImages[Math.abs(String(product._id || product.sku || product.name || "1").length) % templateProductImages.length];

const productReelUrl = (product) => product.videoUrl || product.media?.find((item) => item.type === "video")?.url || "";

const templateProductImages = [
  "/images/e-commerce/home/product1.png",
  "/images/e-commerce/home/product2.png",
  "/images/e-commerce/home/product3.png",
  "/images/e-commerce/home/product4.png",
  "/images/e-commerce/home/product5.png",
  "/images/e-commerce/home/product6.png"
];

const typoScore = (source, query) => {
  if (!query) return true;
  const text = source.toLowerCase();
  const search = query.toLowerCase();
  if (text.includes(search)) return true;
  let index = 0;
  for (const char of text) {
    if (char === search[index]) index += 1;
    if (index >= Math.max(2, search.length - 1)) return true;
  }
  return false;
};

const getProductBrand = (product) => {
  return product.manufacturerBrand || product.seller?.companyName || "Unbranded";
};

const getShippingCost = (total, checkout) => {
  if (total >= 75) return 0;
  const pincode = checkout.sameAsBilling ? checkout.billingPostalCode : checkout.postalCode;
  if (String(pincode || "").trim().length >= 5) return 6.5;
  return 8;
};

const getConfiguredShipping = (rules, total, cart) => {
  if (!cart.length || total <= 0) return { amount: 0, ruleId: "", label: "" };
  const rule = rules?.[0];
  if (!rule) return { amount: 0, ruleId: "", label: "No shipping charge" };
  if (rule.freeShippingAbove && total >= rule.freeShippingAbove) return { amount: 0, ruleId: rule._id, label: `${rule.name} · free` };
  if (rule.type === "weight_based") {
    const weight = cart.reduce((sum, item) => sum + item.quantity * 0.5, 0);
    const band = rule.weightBands?.find((item) => weight >= item.minWeight && weight <= item.maxWeight);
    return { amount: band?.rate ?? rule.flatRate ?? 0, ruleId: rule._id, label: `${rule.name} · ${weight.toFixed(1)} ${rule.weightUnit || "kg"}` };
  }
  return { amount: rule.flatRate || 0, ruleId: rule._id, label: rule.name };
};

const getDeliveryEstimate = (checkout) => {
  const pincode = checkout.sameAsBilling ? checkout.billingPostalCode : checkout.postalCode;
  if (String(pincode || "").trim().length >= 5) return "Estimated delivery in 2-4 business days";
  return "Enter ZIP/postal code for delivery estimate";
};

const getFirstOrderDiscount = (promotion, subtotal) => {
  if (!promotion || subtotal < Number(promotion.minimumOrderValue || 0)) return 0;
  const rawDiscount =
    promotion.type === "percentage"
      ? subtotal * (Number(promotion.value || 0) / 100)
      : promotion.type === "fixed"
        ? Number(promotion.value || 0)
        : 0;
  const capped = Number(promotion.maxDiscountAmount || 0) > 0 ? Math.min(rawDiscount, Number(promotion.maxDiscountAmount)) : rawDiscount;
  return Math.min(subtotal, Math.max(0, capped));
};

const loadRazorpayCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = resolve;
  script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
  document.head.appendChild(script);
});

export default function StorefrontPage({ products, featuredProducts, categories, banner, heroItems = [], contentSections = [], productBanners = [], productBannerColumns = 2, firstOrderDiscount = null, blogPosts = [], settings = {}, paymentMethods = [], shippingRules = [], storefrontLoading = false, storefrontError = "", onReloadStorefront, onAdminLogin }) {
  const [route, setRoute] = useState(currentStorefrontRoute);
  const [componentLoading, setComponentLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [authPopupOpen, setAuthPopupOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [activeTab, setActiveTab] = useState("description");
  const [activeHero, setActiveHero] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartSyncReady, setCartSyncReady] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [cartMessage, setCartMessage] = useState("");
  const [customer, setCustomer] = useState(customerAuthStore.customer);
  const [checkoutStep, setCheckoutStep] = useState(() => new URL(window.location.href).searchParams.has("payu_txnid") ? "payment" : "account");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [orderId, setOrderId] = useState("");
  const [filters, setFilters] = useState({
    brands: [],
    availability: [],
    ratings: [],
    priceMin: "",
    priceMax: "",
    sort: "featured"
  });
  const [checkout, setCheckout] = useState({
    email: "",
    card: "",
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingPostalCode: "",
    shippingAddress: "",
    sameAsBilling: true,
    accountMode: "login",
    password: "",
    confirmPassword: "",
    gender: "",
    phone: "",
    paymentMethod: "card"
  });
  const featuredOnly = new URLSearchParams(route.split("?")[1] || "").get("featured") === "true";

  useEffect(() => {
    const syncRoute = () => {
      setRoute(currentStorefrontRoute());
      setComponentLoading(true);
    };
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => { window.removeEventListener("hashchange", syncRoute); window.removeEventListener("popstate", syncRoute); };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setComponentLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, [route, products, featuredProducts, categories]);

  useEffect(() => {
    if (storefrontLoading) return;
    const availableProductIds = new Set(products.map((product) => String(product._id)));
    setCart((current) => current.filter((item) => availableProductIds.has(String(item.product?._id))));
  }, [products, storefrontLoading]);

  useEffect(() => {
    const verifyCustomer = async () => {
      if (!customerAuthStore.token) return;

      try {
        const data = await api.customerMe();
        customerAuthStore.customer = data.customer;
        setCustomer(data.customer);
      } catch (_error) {
        customerAuthStore.clear();
        setCustomer(null);
      }
    };

    verifyCustomer();
  }, []);

  useEffect(() => {
    let current = true;
    if (!customerAuthStore.token || !customer) { setCartSyncReady(false); return undefined; }
    setCartSyncReady(false);
    api.customerCart().then((data) => {
      if (!current) return;
      setCart((localItems) => {
        const merged = new Map();
        (data.items || []).forEach((item) => { const key = `${item.product._id}:${item.variant?.sku || "base"}`; merged.set(key, { key, product: item.product, variant: item.variant || {}, quantity: item.quantity }); });
        localItems.forEach((item) => {
          const remote = merged.get(item.key);
          merged.set(item.key, remote ? { ...remote, product: item.product, quantity: Math.max(remote.quantity, item.quantity) } : item);
        });
        return [...merged.values()];
      });
      setCartSyncReady(true);
    }).catch((error) => { if (current) { setCartMessage(error.message); setCartSyncReady(true); } });
    return () => { current = false; };
  }, [customer?.id]);

  useEffect(() => {
    if (!customer || !cartSyncReady) return undefined;
    const timer = window.setTimeout(() => {
      api.saveCustomerCart(cart.map((item) => ({ productId: item.product._id, variantSku: item.variant?.sku, quantity: item.quantity }))).catch((error) => setCartMessage(error.message));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [cart, customer?.id, cartSyncReady]);

  useEffect(() => {
    if (!cartMessage) return undefined;
    const timer = window.setTimeout(() => setCartMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [cartMessage]);

  useEffect(() => {
    if (!cart.length || checkoutStep !== "confirmation") return;
    setCheckoutStep(customer ? "address" : "account");
    setOrderId("");
    setPaymentStatus("");
  }, [cart.length, checkoutStep, customer]);

  const heroSlides = useMemo(() => {
    const slides = heroItems?.length ? heroItems : [banner];
    return slides.filter(Boolean).filter((item) => item.isActive !== false);
  }, [heroItems, banner]);

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    const timer = window.setInterval(() => setActiveHero((index) => (index + 1) % heroSlides.length), 4500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const suggestions = useMemo(() => {
    if (!query) return [];
    return products
      .filter((product) => typoScore([product.name, product.shortDescription, product.category?.name].join(" "), query))
      .slice(0, 5);
  }, [products, query]);

  const categoryScopeProducts = useMemo(() => products.filter((product) => {
    const categoryId = String(product.category?._id || product.category || "");
    const parentId = String(product.category?.parent?._id || product.category?.parent || "");
    return (selectedCategory === "all" || categoryId === String(selectedCategory) || parentId === String(selectedCategory)) && (!featuredOnly || featuredProducts.some((featured) => String(featured._id) === String(product._id)));
  }), [products, featuredProducts, featuredOnly, selectedCategory]);
  const catalogPrices = categoryScopeProducts.map((product) => Number(product.offerPrice || product.price)).filter(Number.isFinite);
  const catalogPriceMin = catalogPrices.length ? Math.floor(Math.min(...catalogPrices)) : 0;
  const catalogPriceMax = catalogPrices.length ? Math.ceil(Math.max(...catalogPrices)) : 0;
  const selectedPriceMin = filters.priceMin === "" ? catalogPriceMin : Number(filters.priceMin);
  const selectedPriceMax = filters.priceMax === "" ? catalogPriceMax : Number(filters.priceMax);
  const availableBrands = [...new Set(categoryScopeProducts.map(getProductBrand).filter(Boolean))].sort();
  const availableCategories = categories.filter((category) => products.some((product) => String(product.category?._id || product.category || "") === String(category._id) || String(product.category?.parent?._id || product.category?.parent || "") === String(category._id)));
  const availabilityItems = [["in-stock", `In stock (${categoryScopeProducts.filter((product) => !product.isStockManageable || product.stock > 0 || product.variants?.some((variant) => variant.stock > 0)).length})`], ["low-stock", `Low stock (${categoryScopeProducts.filter((product) => product.isStockManageable && product.stock > 0 && product.stock <= 10).length})`]].filter((item) => !item[1].endsWith("(0)"));
  const ratingItems = [4, 3, 2, 1].map((rating) => [String(rating), `${rating}★ & up (${categoryScopeProducts.filter((product) => product.reviewCount > 0 && product.averageRating >= rating).length})`]).filter((item) => !item[1].endsWith("(0)"));
  useEffect(() => { setFilters((current) => ({ ...current, brands: [], availability: [], ratings: [], priceMin: "", priceMax: "" })); }, [selectedCategory, featuredOnly]);

  const filteredProducts = useMemo(() => {
    const search = query.toLowerCase();
    const filtered = products.filter((product) => {
      if (featuredOnly && !featuredProducts.some((featured) => String(featured._id) === String(product._id))) return false;
      const categoryId = typeof product.category === "string" ? product.category : product.category?._id;
      const parentCategoryId = typeof product.category === "string" ? "" : product.category?.parent?._id || product.category?.parent;
      const brand = getProductBrand(product);
      const categoryMatch = selectedCategory === "all" || String(categoryId) === String(selectedCategory) || String(parentCategoryId || "") === String(selectedCategory);
      const textMatch = typoScore([product.name, product.shortDescription, product.category?.name, product.tags?.join(" ")].join(" "), search);
      const price = Number(product.offerPrice || product.price);
      const priceMatch = price >= selectedPriceMin && price <= selectedPriceMax;
      const hasStock = !product.isStockManageable || product.stock > 0 || product.variants?.some((variant) => variant.stock > 0);
      const isLowStock = product.isStockManageable && ((product.stock > 0 && product.stock <= 10) || product.variants?.some((variant) => variant.stock > 0 && variant.stock <= 10));
      const stockMatch =
        filters.availability.length === 0 ||
        (filters.availability.includes("in-stock") && hasStock) ||
        (filters.availability.includes("low-stock") && isLowStock);
      const ratingMatch = filters.ratings.length === 0 || filters.ratings.some((rating) => product.reviewCount > 0 && product.averageRating >= Number(rating));
      const brandMatch = filters.brands.length === 0 || filters.brands.includes(brand);

      return categoryMatch && textMatch && priceMatch && stockMatch && ratingMatch && brandMatch;
    });

    return [...filtered].sort((a, b) => {
      if (filters.sort === "price-low") return Number(a.offerPrice || a.price) - Number(b.offerPrice || b.price);
      if (filters.sort === "price-high") return Number(b.offerPrice || b.price) - Number(a.offerPrice || a.price);
      if (filters.sort === "newest") return String(b.createdAt || b._id).localeCompare(String(a.createdAt || a._id));
      return 0;
    });
  }, [products, featuredProducts, featuredOnly, query, selectedCategory, filters, selectedPriceMin, selectedPriceMax]);

  const heroProducts = (featuredProducts.length ? featuredProducts : products).slice(0, 4);
  const heroProduct = heroProducts[0];
  const productCategoryIds = new Set(products.flatMap((product) => [String(product.category?._id || product.category || ""), String(product.category?.parent?._id || product.category?.parent || "")]).filter(Boolean));
  const visibleShopCategories = categories.filter((category) => productCategoryIds.has(String(category._id)));
  const heroSlide = heroSlides[activeHero] || banner || {};
  const sectionsFor = (location) => contentSections.filter((section) => section.locations?.includes(location));
  const defaultHomeSections = [
    { type: "shipping_info", sortOrder: 1, isActive: true },
    { type: "browse_collections", sortOrder: 2, isActive: true },
    { type: "seasonal_banner", sortOrder: 3, isActive: true },
    { type: "new_arrivals", sortOrder: 4, isActive: true },
    { type: "promo_banner", sortOrder: 5, isActive: true },
    { type: "blog", sortOrder: 6, isActive: true }
  ];
  const homeSections = (settings.homeSections?.length ? settings.homeSections : defaultHomeSections)
    .filter((section) => section.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const productId = route.startsWith("#/product/") ? decodeURIComponent(route.replace("#/product/", "")) : "";
  const routedProduct = products.find((product) => String(product._id) === productId || product.sku === productId);
  const isProductsRoute = route.startsWith("#/products");
  const isProductRoute = Boolean(productId);
  const isCheckoutRoute = route === "#/checkout";
  const isCartRoute = route === "#/cart";
  const isAccountRoute = route === "#/account";
  const isReelsRoute = route.startsWith("#/reels");
  const isContactRoute = route === "#/contact";
  const pageSlug = route.startsWith("#/page/") ? decodeURIComponent(route.replace("#/page/", "")) : "";
  const customPage = settings.pages?.find((page) => page.isActive && page.slug === pageSlug);
  const isCustomPageRoute = Boolean(pageSlug);
  const reelSeedId = new URLSearchParams(route.split("?")[1] || "").get("product") || "";
  const reelCandidates = products.filter((product) => product.displayType === "Reel");
  const reelSeed = reelCandidates.find((product) => String(product._id) === reelSeedId);
  const categoryId = (product) => String(product?.category?._id || product?.category || "");
  const categoryRoot = (product) => String(product?.category?.parent?._id || product?.category?.parent || categoryId(product));
  const newestReels = [...reelCandidates].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const reelAnchor = reelSeed || newestReels[0];
  const reelProducts = (() => {
    if (!reelAnchor) return [];
    const sameSubcategory = newestReels.filter((item) => categoryId(item) === categoryId(reelAnchor));
    const siblingSubcategories = newestReels.filter((item) => categoryRoot(item) === categoryRoot(reelAnchor) && categoryId(item) !== categoryId(reelAnchor));
    const siblingOrder = [...new Set(siblingSubcategories.map(categoryId))];
    const sameCategory = siblingOrder.flatMap((subcategory) => siblingSubcategories.filter((item) => categoryId(item) === subcategory));
    const otherCategories = newestReels.filter((item) => categoryRoot(item) !== categoryRoot(reelAnchor));
    return reelSeed ? [reelSeed, ...sameSubcategory.filter((item) => String(item._id) !== String(reelSeed._id)), ...sameCategory, ...otherCategories] : [...sameSubcategory, ...sameCategory, ...otherCategories];
  })();
  const sellerId = route.startsWith("#/sellers/") ? decodeURIComponent(route.replace("#/sellers/", "")) : "";
  const isSellerRoute = Boolean(sellerId);
  const sellerProducts = products.filter((product) => String(product.seller?._id || product.seller || "") === sellerId);
  const routedSeller = sellerProducts[0]?.seller;
  const cartTotal = cart.reduce((sum, item) => sum + cartUnitPrice(item) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shippingCost = getShippingCost(cartTotal, checkout);
  const configuredShipping = getConfiguredShipping(shippingRules, cartTotal, cart);
  const displayShippingCost = cart.length ? (shippingRules.length ? configuredShipping.amount : shippingCost) : 0;
  const deliveryEstimate = getDeliveryEstimate(checkout);
  const emailInvalid = checkout.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.email);

  const navigate = (nextRoute) => {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
    setMobileMenuOpen(false);
    setMegaOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAllProducts = () => {
    setSelectedCategory("all");
    setQuery("");
    setFilters({ brands: [], availability: [], ratings: [], priceMin: "", priceMax: "", sort: "featured" });
    navigate("#/products");
  };

  const goToLink = (linkUrl = "#/products") => {
    if (linkUrl.startsWith("#/")) navigate(linkUrl);
    else window.location.href = linkUrl;
  };

  const renderHomeSection = (section, index) => {
    if (section.type === "shipping_info") return <TemplateInfoBlock key={section._id || section.type} items={settings.benefitItems} />;
    if (section.type === "browse_collections") return <CategoryImageShowcase key={section._id || section.type} categories={categories} products={products} onNavigate={navigate} setSelectedCategory={setSelectedCategory} />;
    if (section.type === "seasonal_banner") {
      const seasonalSections = sectionsFor("home_before_new_arrivals").filter((item) => (item.items || []).some((bannerItem) => bannerItem.imageUrl));
      return seasonalSections.length ? <ContentSections key={section._id || section.type} sections={seasonalSections} /> : null;
    }
    if (section.type === "new_arrivals") {
      const newArrivalColumns = Math.max(1, Number(section.columns || settings.productGridSize || 3));
      return (
        <div className="homeProductSections" key={section._id || section.type}><section className="shopSection" id="new-arrivals">
          <div className="shopSectionHeader templateSectionHeader">
            <div>
              <span className="eyebrow">Fresh collection</span>
              <h2>{section.title || "New Arrivals"}</h2>
              <p>{section.subtitle || "Template-inspired product cards with clean imagery, visible price, and direct cart actions."}</p>
            </div>
            <button className="shopLinkButton" type="button" onClick={() => navigate("#/products")}>View all</button>
          </div>
          <div className="productGrid" style={{ "--product-grid-size": newArrivalColumns }}>
            {products.slice(0, Math.max(6, newArrivalColumns * 2)).map((product) => (
              <ProductCard product={product} key={product._id} featured onView={(item) => navigate(`#/product/${encodeURIComponent(item._id)}`)} onAdd={addToCart} />
            ))}
          </div>
        </section><FeaturedProductsCarousel products={featuredProducts} onView={(item) => navigate(`#/product/${encodeURIComponent(item._id)}`)} onAdd={addToCart} onViewAll={() => navigate("#/products?featured=true")} /></div>
      );
    }
    if (section.type === "promo_banner") return <PromoBanner key={section._id || section.type} banner={settings.promoBanner} onOpen={goToLink} />;
    if (section.type === "blog") return <TemplateEditorialSection key={section._id || section.type} posts={blogPosts} title={section.title} subtitle={section.subtitle} />;
    if (section.type === "instagram") return <TemplateInstagram key={section._id || section.type} />;
    if (section.type === "category_products") {
      const categoryId = String(section.category?._id || section.category || "");
      const sectionProducts = products.filter((product) => String(product.category?._id || product.category || "") === categoryId).slice(0, 4);
      if (!sectionProducts.length) return null;
      return (
        <section className="shopSection" key={section._id || `${section.type}-${index}`}>
          <div className="shopSectionHeader templateSectionHeader">
            <div>
              <span className="eyebrow">Category picks</span>
              <h2>{section.title || section.category?.name || "Selected Products"}</h2>
              {section.subtitle && <p>{section.subtitle}</p>}
            </div>
            <button className="shopLinkButton" type="button" onClick={() => { setSelectedCategory(categoryId); navigate("#/products"); }}>View all</button>
          </div>
          <div className="featuredGrid">
            {sectionProducts.map((product) => (
              <ProductCard product={product} key={product._id} featured onView={(item) => navigate(`#/product/${encodeURIComponent(item._id)}`)} onAdd={addToCart} />
            ))}
          </div>
        </section>
      );
    }
    if (section.type === "custom_content") {
      return <ContentSections key={section._id || `${section.type}-${index}`} sections={[{ ...section, columns: section.columns || 2 }]} />;
    }
    if (section.type === "custom_banner") return <PromoBanner key={section._id || `${section.type}-${index}`} banner={section.banner} onOpen={goToLink} />;
    return null;
  };

  const toggleFilter = (group, value) => {
    setFilters((current) => ({
      ...current,
      [group]: current[group].includes(value) ? current[group].filter((item) => item !== value) : [...current[group], value]
    }));
  };

  const addToCart = (product, variant = {}, quantity = 1) => {
    const nextQuantity = Math.max(1, Number(quantity) || 1);
    setCart((current) => {
      const key = `${product._id || product.sku || product.name}:${variant.sku || "base"}`;
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + nextQuantity } : item));
      }
      return [...current, { key, product, variant, quantity: nextQuantity }];
    });
    setCartMessage(`${nextQuantity} ${product.name}${nextQuantity > 1 ? " items" : ""} added to cart.`);
  };

  const updateCart = (key, quantity) => {
    setCart((current) => current.map((item) => (item.key === key ? { ...item, quantity } : item)).filter((item) => item.quantity > 0));
  };

  const toggleSavedItem = (product) => {
    setSavedItems((current) =>
      current.some((item) => item._id === product._id)
        ? current.filter((item) => item._id !== product._id)
        : [...current, product]
    );
    setCartMessage(
      savedItems.some((item) => item._id === product._id)
        ? `${product.name} removed from wishlist.`
        : `${product.name} saved for later.`
    );
  };

  const logoutCustomer = () => {
    customerAuthStore.clear();
    setCustomer(null);
    setCart([]);
    setAuthPopupOpen(false);
    setCartMessage("Logged out successfully. Your cart is saved to your account.");
    navigate("#/");
  };

  if (storefrontLoading) {
    return <main className="storefrontLoadingScreen" role="status" aria-live="polite"><BrandLogo settings={settings} loading className="storefrontLoadingBrand" showText={false} /><div className="storefrontLoadingSpinner" aria-hidden="true" /></main>;
  }

  if (storefrontError && !products.length && !Object.keys(settings).length) {
    return <main className="storefrontLoadingScreen storefrontLoadError"><div className="storefrontLoadingBrand"><span>HR</span><strong>HRSBasket</strong></div><h1>We couldn’t load the store</h1><p>{storefrontError}</p><button className="heroPrimary" type="button" onClick={onReloadStorefront}>Try Again</button></main>;
  }

  return (
    <div className="storefront">
      <header className="shopHeader">
        <button className="iconButton shopMenuButton" type="button" aria-label="Open menu" onClick={() => setMobileMenuOpen((open) => !open)}>
          <Menu size={20} />
        </button>
        <button className="shopLogo" type="button" onClick={() => navigate("#/")} aria-label={`${settings.shopName || "HRSBasket"} home`}>
          <BrandLogo settings={settings} />
        </button>
        <nav className={mobileMenuOpen ? "shopNav open" : "shopNav"} aria-label="Primary navigation">
          <button type="button" onClick={() => navigate("#/")}>Home</button>
          <button type="button" className="navMegaTrigger" onClick={() => setMegaOpen((open) => !open)}>
            Shop <ChevronRight size={15} />
          </button>
          <button type="button" onClick={openAllProducts}>All Products</button>
          <button type="button" onClick={() => navigate("#/reels")}>Reels</button>
          <button type="button" onClick={() => { setSelectedCategory("all"); setMobileMenuOpen(false); navigate("#/products?featured=true"); }}>Featured</button>
          <button type="button" onClick={() => navigate("#/contact")}>Contact Us</button>
        </nav>
        <div className="shopActions">
          <button className="shopTextButton customerLoginButton" type="button" onClick={() => customer ? navigate("#/account") : setAuthPopupOpen(true)}>
            <UserRound size={18} /> <span>{customer ? customer.name.split(" ")[0] : "Login"}</span>
          </button>
          <button className="iconButton" type="button" aria-label="Wishlist">
            <Heart size={18} />
            {savedItems.length > 0 && <span className="iconCount">{savedItems.length}</span>}
          </button>
          <button className="cartButton" type="button" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={18} /> Cart {cartCount > 0 && <span>{cartCount}</span>}
          </button>
        </div>
        {megaOpen && (
          <div className="megaMenu">
            <div>
              <span>Categories</span>
              {visibleShopCategories.map((category) => (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category._id);
                    setMegaOpen(false);
                    navigate("#/products");
                  }}
                >
                  {category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name}
                </button>
              ))}
            </div>
            <div>
              <span>Popular</span>
              <a href="#featured">Best sellers</a>
              <button type="button" onClick={() => navigate("#/products")}>New arrivals</button>
              <button type="button" onClick={() => navigate("#/products")}>Low stock picks</button>
            </div>
            <div className="megaFeature">
              <strong>Fast, focused shopping</strong>
              <p>Search, filter, compare, and checkout without leaving the page.</p>
            </div>
          </div>
        )}
      </header>

      <main className="shopMain">
        {componentLoading && <ComponentLoader label="Loading section" />}
        {!componentLoading && !isProductsRoute && !isProductRoute && !isCheckoutRoute && !isCartRoute && !isSellerRoute && !isAccountRoute && !isReelsRoute && !isContactRoute && !isCustomPageRoute && (
          <>
        <section className="shopHero">
          <div className="heroCopy">
            <span className="eyebrow">Modern collection</span>
            <h1>{heroSlide?.title || "Fresh arrivals for everyday living"}</h1>
            <p>{heroSlide?.subtitle || "Shop thoughtfully selected products with clear stock status, trusted checkout, and mobile-first navigation."}</p>
            <div className="heroActions">
              <button className="heroPrimary" type="button" onClick={openAllProducts}>Shop Products</button>
              <a className="heroSecondary" href="#featured">View Featured</a>
            </div>
            <div className="heroTrust" aria-label="Store trust benefits">
              <span><ShieldCheck size={16} /> Secure payment</span>
              <span><PackageCheck size={16} /> 30-day returns</span>
              <span><Truck size={16} /> Fast delivery</span>
            </div>
            <div className="heroSliderDots" aria-label="Hero slider position">
              {heroSlides.map((item, index) => (
                <button key={item._id || index} className={activeHero === index ? "active" : ""} type="button" aria-label={`Show hero ${index + 1}`} onClick={() => setActiveHero(index)} />
              ))}
            </div>
          </div>
          <div className="heroMedia">
            <img loading="eager" src={heroSlide?.imageUrl || (heroProduct ? productImage(heroProduct) : "/images/e-commerce/home/bg.png")} alt={heroSlide?.title || heroProduct?.name || "Featured products"} />
            {heroProducts.length > 0 && <div className="heroProductRail" aria-label="Featured products">{heroProducts.map((product) => <button className="heroProduct" key={product._id} type="button" onClick={() => navigate(`#/product/${encodeURIComponent(product._id)}`)}><img src={productImage(product)} alt="" /><span>Featured</span><strong>{product.name}</strong><small>{money(product.offerPrice || product.price)}</small></button>)}</div>}
          </div>
        </section>

        {productBanners.length > 0 && <section className="productBannerGrid" style={{ "--banner-columns": productBannerColumns === 1 ? 1 : 2 }}>{productBanners.map((item) => <button key={item._id} type="button" onClick={() => navigate(`#/product/${encodeURIComponent(item.product?._id || item.product)}`)}><img src={item.imageUrl} alt={item.title || item.product?.name || "Product banner"} />{item.title && <span>{item.title}</span>}</button>)}</section>}

        {homeSections.map(renderHomeSection)}
          </>
        )}

        {!componentLoading && isProductsRoute && (
        <section className="shopSection productBrowser" id="products">
          <aside className="filterPanel" aria-label="Product filters">
            <div className="breadcrumb">Home <ChevronRight size={14} /> Store <ChevronRight size={14} /> Products</div>
            <fieldset className="filterGroup categoryFilter"><legend>Category</legend><label><input type="radio" name="catalog-category" checked={selectedCategory === "all"} onChange={() => setSelectedCategory("all")} /><span>All categories ({products.length})</span></label>{availableCategories.map((category) => { const count = products.filter((product) => String(product.category?._id || product.category || "") === String(category._id) || String(product.category?.parent?._id || product.category?.parent || "") === String(category._id)).length; return <label key={category._id}><input type="radio" name="catalog-category" checked={String(selectedCategory) === String(category._id)} onChange={() => setSelectedCategory(category._id)} /><span>{category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name} ({count})</span></label>; })}</fieldset>
            {availableBrands.length > 0 && <FilterGroup title="Brand" items={availableBrands.map((brand) => [brand, `${brand} (${categoryScopeProducts.filter((product) => getProductBrand(product) === brand).length})`])} selected={filters.brands} onToggle={(value) => toggleFilter("brands", value)} />}
            {availabilityItems.length > 0 && <FilterGroup title="Availability" items={availabilityItems} selected={filters.availability} onToggle={(value) => toggleFilter("availability", value)} />}
            {ratingItems.length > 0 && <FilterGroup title="Ratings" items={ratingItems} selected={filters.ratings} onToggle={(value) => toggleFilter("ratings", value)} />}
            <fieldset className="filterGroup priceRangeFilter"><legend>Price range</legend><div className="priceRangeValues"><span>{money(selectedPriceMin)}</span><span>{money(selectedPriceMax)}</span></div><label><span>Minimum</span><input type="range" min={catalogPriceMin} max={catalogPriceMax || 1} value={selectedPriceMin} onChange={(event) => setFilters((current) => ({ ...current, priceMin: Math.min(Number(event.target.value), selectedPriceMax) }))} /></label><label><span>Maximum</span><input type="range" min={catalogPriceMin} max={catalogPriceMax || 1} value={selectedPriceMax} onChange={(event) => setFilters((current) => ({ ...current, priceMax: Math.max(Number(event.target.value), selectedPriceMin) }))} /></label><div className="priceNumberFields"><input aria-label="Minimum price" type="number" min={catalogPriceMin} max={selectedPriceMax} value={selectedPriceMin} onChange={(event) => setFilters((current) => ({ ...current, priceMin: event.target.value }))} /><input aria-label="Maximum price" type="number" min={selectedPriceMin} max={catalogPriceMax} value={selectedPriceMax} onChange={(event) => setFilters((current) => ({ ...current, priceMax: event.target.value }))} /></div></fieldset>
            <button className="shopLinkButton" type="button" onClick={() => { setSelectedCategory("all"); setFilters({ brands: [], availability: [], ratings: [], priceMin: "", priceMax: "", sort: "featured" }); }}>Clear all filters</button>
          </aside>
          <div>
            <div className="shopSectionHeader productHeader">
              <div>
                <span className="eyebrow">Catalog</span>
                <h2>{featuredOnly ? "Featured Products" : "All Products"}</h2>
              </div>
              <div className="resultTools">
                <ContentSections sections={sectionsFor("products_top_right")} compact />
                <span className="resultCount">{filteredProducts.length} results</span>
                <label className="sortSelect">
                  <span>Sort</span>
                  <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}>
                    <option value="featured">Featured</option>
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="productGrid" style={{ "--product-grid-size": settings.productGridSize || 3 }}>
              {filteredProducts.map((product) => (
                <ProductCard
                  product={product}
                  key={product._id}
                  onView={(item) => navigate(`#/product/${encodeURIComponent(item._id)}`)}
                  onAdd={addToCart}
                  onSave={toggleSavedItem}
                  saved={savedItems.some((item) => item._id === product._id)}
                />
              ))}
              {products.length > 0 && filteredProducts.length === 0 && <div className="catalogEmptyState"><ShoppingBag size={34} /><h3>No products match the selected filters.</h3><p>Clear the current category, search, and price filters to see all available products.</p><button className="heroPrimary" type="button" onClick={openAllProducts}>Show All Products</button></div>}
              {products.length === 0 && <div className="catalogEmptyState"><ShoppingBag size={34} /><h3>No products are currently available.</h3><p>Products will appear here after they are added and activated by the store administrator.</p></div>}
            </div>
          </div>
        </section>
        )}

        {!componentLoading && isCartRoute && (
          <CartPage
            cart={cart}
            total={cartTotal}
            shippingCost={displayShippingCost}
            firstOrderDiscount={firstOrderDiscount}
            deliveryEstimate={deliveryEstimate}
            onUpdate={updateCart}
            onRemove={(key) => setCart((current) => current.filter((item) => item.key !== key))}
            onViewProduct={(product) => navigate(`#/product/${encodeURIComponent(product._id)}`)}
            onCheckout={() => navigate("#/checkout")}
            onBack={() => navigate("#/products")}
          />
        )}

        {!componentLoading && isReelsRoute && <ReelsViewer products={reelProducts} loading={storefrontLoading} error={storefrontError} onRetry={onReloadStorefront} customer={customer} onRequireLogin={() => setAuthPopupOpen(true)} onProduct={(product) => navigate(`#/product/${encodeURIComponent(product._id)}`)} onSeller={(seller) => navigate(`#/sellers/${encodeURIComponent(seller._id || seller)}`)} onBuy={(product) => { if (product.variationOptions?.length) navigate(`#/product/${encodeURIComponent(product._id)}`); else { addToCart(product); navigate("#/checkout"); } }} onBack={() => navigate("#/products")} />}
        {!componentLoading && isContactRoute && <ContactPage details={{ address: settings.contactDetails?.address || settings.address, state: settings.contactDetails?.state, city: settings.contactDetails?.city, pincode: settings.contactDetails?.pincode, email: settings.contactDetails?.email || settings.email, mobile: settings.contactDetails?.mobile, phone: settings.contactDetails?.phone || settings.phone, googleMapUrl: settings.contactDetails?.googleMapUrl }} customer={customer} />}
        {!componentLoading && isCustomPageRoute && <section className="shopSection customPage"><button className="shopLinkButton backButton" type="button" onClick={() => navigate("#/")}>Back to home</button>{customPage ? <><span className="eyebrow">Information</span><h1>{customPage.title}</h1><div className="customPageContent" dangerouslySetInnerHTML={{ __html: customPage.content }} /></> : <><h1>Page not found</h1><p>This page is unavailable.</p></>}</section>}

        {!componentLoading && isCheckoutRoute && (
          <CheckoutPage
            cart={cart}
            setCart={setCart}
            total={cartTotal}
            checkout={checkout}
            setCheckout={setCheckout}
            checkoutStep={checkoutStep}
            setCheckoutStep={setCheckoutStep}
            shippingCost={displayShippingCost}
            firstOrderDiscount={firstOrderDiscount}
            shippingRuleId={configuredShipping.ruleId}
            shippingLabel={configuredShipping.label}
            paymentMethods={paymentMethods}
            customer={customer}
            setCustomer={setCustomer}
            deliveryEstimate={deliveryEstimate}
            emailInvalid={emailInvalid}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            orderId={orderId}
            setOrderId={setOrderId}
            onBack={() => navigate("#/products")}
          />
        )}

        {!componentLoading && isProductRoute && routedProduct && (
          <ProductDetailPage
            product={routedProduct}
            products={products}
            customer={customer}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onAdd={addToCart}
            onBuy={(product, variant, quantity) => {
              addToCart(product, variant, quantity);
              navigate("#/checkout");
            }}
            onSave={toggleSavedItem}
            saved={savedItems.some((item) => item._id === routedProduct._id)}
            onBack={() => navigate("#/products")}
            contentSections={sectionsFor("product_detail_below_details")}
            assurances={settings.productAssurances}
            onWatchReel={routedProduct.videoUrl ? () => navigate(`#/reels?product=${encodeURIComponent(routedProduct._id)}`) : undefined}
            onHome={() => navigate("#/")}
            onCategory={(category) => { setSelectedCategory(String(category?._id || category)); navigate("#/products"); }}
          />
        )}

        {!componentLoading && isProductRoute && !routedProduct && (
          <section className="shopSection emptyRoute">
            <h2>Product not found</h2>
            <p>The product may have moved or is no longer available.</p>
            <button className="heroPrimary" type="button" onClick={() => navigate("#/products")}>Back to Products</button>
          </section>
        )}

        {!componentLoading && isSellerRoute && <section className="shopSection sellerStorefront"><button className="shopLinkButton backButton" type="button" onClick={() => navigate("#/products")}>Back to Products</button><div className="sellerStorefrontHeader"><Store size={38} /><div><span className="eyebrow">Seller storefront</span><h2>{routedSeller?.companyName || "Seller products"}</h2><p>{[routedSeller?.city, routedSeller?.state].filter(Boolean).join(", ") || "Verified marketplace seller"}</p>{routedSeller?.createdAt && <small>Registered with us since {new Date(routedSeller.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</small>}</div><strong>{sellerProducts.length} approved product{sellerProducts.length === 1 ? "" : "s"}</strong></div><div className="productGrid" style={{ "--product-grid-size": settings.productGridSize || 3 }}>{sellerProducts.map((product) => <ProductCard product={product} key={product._id} onView={(item) => navigate(`#/product/${encodeURIComponent(item._id)}`)} onAdd={addToCart} onSave={toggleSavedItem} saved={savedItems.some((item) => item._id === product._id)} />)}{!sellerProducts.length && <p>No active products are available from this seller.</p>}</div></section>}

        {!componentLoading && isAccountRoute && customer && <CustomerDashboard customer={customer} setCustomer={setCustomer} onLogout={logoutCustomer} pageMode onClose={() => navigate("#/")} />}
        {!componentLoading && isAccountRoute && !customer && <section className="shopSection accountLoginRequired"><UserRound size={40} /><h2>Sign in to view your account</h2><p>Access your orders, profile, and saved addresses.</p><button className="heroPrimary" type="button" onClick={() => setAuthPopupOpen(true)}>Login or Create Account</button></section>}

      </main>

      <ShopFooter settings={settings} onAdminLogin={onAdminLogin} />

      {cartMessage && <div className="cartToast" role="status">{cartMessage}</div>}

      {authPopupOpen && (
        <CustomerAuthModal
          authMode={authMode}
          setAuthMode={setAuthMode}
          customer={customer}
          setCustomer={setCustomer}
          onSuccess={(signedInCustomer, mode) => {
            setCartMessage(mode === "signup" ? `Account created. Signed in successfully as ${signedInCustomer.name}.` : `Signed in successfully as ${signedInCustomer.name}.`);
            setAuthPopupOpen(false);
          }}
          onLogout={logoutCustomer}
          onClose={() => setAuthPopupOpen(false)}
        />
      )}

      <CartDrawer
        open={cartOpen}
        cart={cart}
        total={cartTotal}
        onClose={() => setCartOpen(false)}
        onUpdate={updateCart}
        onRemove={(key) => setCart((current) => current.filter((item) => item.key !== key))}
        onViewProduct={(product) => { setCartOpen(false); navigate(`#/product/${encodeURIComponent(product._id)}`); }}
        shippingCost={displayShippingCost}
        firstOrderDiscount={firstOrderDiscount}
        deliveryEstimate={deliveryEstimate}
        onCheckout={() => {
          setCartOpen(false);
          navigate("#/checkout");
        }}
        onViewCart={() => {
          setCartOpen(false);
          navigate("#/cart");
        }}
      />
    </div>
  );
}

function FilterGroup({ title, items, selected, onToggle, swatches = false }) {
  return (
    <fieldset className="filterGroup">
      <legend>{title}</legend>
      {items.map((item) => {
        const value = Array.isArray(item) ? item[0] : item;
        const label = Array.isArray(item) ? item[1] : item;
        return (
          <label key={value} className={swatches ? "swatchFilter" : ""}>
            <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
            {swatches && <span className={`swatch swatch${label}`} />}
            <span>{label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function TemplateInfoBlock({ items: configuredItems = [] }) {
  const fallbackItems = [
    { icon: "/images/e-commerce/home/car.svg", title: "Free Shipping", text: "Free delivery for orders above your store threshold." },
    { icon: "/images/e-commerce/home/headphones.svg", title: "24/7 Support", text: "Fast help for product, delivery, and return questions." },
    { icon: "/images/e-commerce/home/Sync.svg", title: "Easy Returns", text: "Simple exchanges and refunds with clear tracking." }
  ];
  const items = configuredItems?.length ? configuredItems : fallbackItems;

  return (
    <section className="shopSection templateInfoBlock" aria-label="Store benefits">
      {items.map((item) => (
        <div key={item.title}>
          <img src={item.icon} alt="" />
          <span>
            <strong>{item.title}</strong>
            <small>{item.text}</small>
          </span>
        </div>
      ))}
    </section>
  );
}

function TemplateCategoryShowcase({ onNavigate }) {
  return (
    <section className="shopSection templateShowcase" aria-label="Featured category tiles">
      <button className="templateTile templateTileLarge" type="button" onClick={() => onNavigate("#/products")}>
        <span>Living Room</span>
        <strong>Designer chairs</strong>
        <i />
      </button>
      <div className="templateTileStack">
        <button className="templateTile templateTileTop2" type="button" onClick={() => onNavigate("#/products")}>
          <span>Decor</span>
          <strong>Warm textures</strong>
        </button>
        <button className="templateTile templateTileTop3" type="button" onClick={() => onNavigate("#/products")}>
          <span>Kitchen</span>
          <strong>Daily essentials</strong>
        </button>
      </div>
      <div className="templateTileStack">
        <button className="templateTile templateTileTop4" type="button" onClick={() => onNavigate("#/products")}>
          <span>Bedroom</span>
          <strong>Soft layers</strong>
        </button>
        <button className="templateTile templateTileTop5" type="button" onClick={() => onNavigate("#/products")}>
          <span>New season</span>
          <strong>Explore the edit</strong>
        </button>
      </div>
    </section>
  );
}

function CategoryImageShowcase({ categories, products, onNavigate, setSelectedCategory }) {
  const productCategoryIds = new Set(products.map((product) => String(product.category?._id || product.category || "")));
  const visibleCategories = categories
    .filter((category) => category.isActive !== false && String(category.imageUrl || "").trim() && productCategoryIds.has(String(category._id)))
    .slice(0, 6);
  if (visibleCategories.length === 0) return null;

  return (
    <section className="shopSection categoryImageShowcase" id="categories">
      <div className="templateSectionIntro">
        <span className="eyebrow">Shop by category</span>
        <h2>Browse Collections</h2>
      </div>
      <div className="categoryImageGrid">
        {visibleCategories.map((category) => (
          <button
            key={category._id}
            type="button"
            onClick={() => {
              setSelectedCategory(category._id);
              onNavigate("#/products");
            }}
          >
            <img loading="lazy" src={category.imageUrl} alt={category.name} />
            <span>{category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ContentSections({ sections = [], compact = false }) {
  if (!sections.length) return null;

  return (
    <div className={compact ? "contentSections compact" : "shopSection contentSections"}>
      {sections.map((section) => (
        <section className="customContentSection" key={section._id || section.title} style={{ "--section-columns": section.columns || 2 }}>
          {!compact && (
            <div className="templateSectionIntro">
              <span className="eyebrow">Featured</span>
              <h2>{section.title}</h2>
              {section.subtitle && <p>{section.subtitle}</p>}
            </div>
          )}
          <div className="customContentGrid">
            {(section.items || []).map((item, index) => {
              const body = (
                <>
                  {item.type !== "text" && item.imageUrl && <img loading="lazy" src={item.imageUrl} alt={item.title || section.title} />}
                  {item.type !== "image" && (
                    <span>
                      {item.title && <strong>{item.title}</strong>}
                      {item.text && <small>{item.text}</small>}
                      {item.linkLabel && <b>{item.linkLabel}</b>}
                    </span>
                  )}
                </>
              );
              return item.linkUrl ? (
                <a className="customContentItem" href={item.linkUrl} key={item._id || index}>{body}</a>
              ) : (
                <div className="customContentItem" key={item._id || index}>{body}</div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function PromoBanner({ banner = {}, onOpen }) {
  return (
    <section
      className="promoBanner"
      style={{ "--promo-image": `url("${banner?.imageUrl || "/images/e-commerce/home/promo.png"}")` }}
    >
      <div>
        <span className="eyebrow">{banner?.title || "Spring sale"}</span>
        <h2>{banner?.line1 || "Premium comfort, template-polished storefront"}</h2>
        {banner?.line2 && <p>{banner.line2}</p>}
      </div>
      <button className="heroPrimary" type="button" onClick={() => onOpen(banner?.linkUrl || "#/products")}>
        {banner?.buttonText || "Explore Now"}
      </button>
    </section>
  );
}

function TemplateEditorialSection({ posts = [], title = "Stories, guides, and style notes", subtitle = "" }) {
  if (!posts.length) return null;

  return (
    <section className="shopSection templateEditorial">
      <div className="templateSectionIntro">
        <span className="eyebrow">From our blog</span>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="templateEditorialGrid">
        {posts.map((post, index) => (
          <article key={post._id || post.slug || index}>
            <img loading="lazy" src={post.imageUrl || `/images/e-commerce/home/article${(index % 3) + 1}.jpg`} alt={post.title} />
            <span>{post.category?.name || post.authorName || "Store notes"}</span>
            <h3>{post.title}</h3>
            {post.excerpt && <p>{post.excerpt}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function TemplateInstagram() {
  return (
    <section className="shopSection templateInstagram" aria-label="Follow on Instagram">
      <div className="templateSectionIntro">
        <span className="eyebrow">Follow on Instagram</span>
        <h2>@commerceops.store</h2>
      </div>
      <div className="instagramGrid">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <a key={item} href="#support" aria-label={`Instagram post ${item}`}>
            <img loading="lazy" src={`/images/e-commerce/home/insta${item}.jpg`} alt="" />
          </a>
        ))}
      </div>
    </section>
  );
}

function FeaturedProductsCarousel({ products, onView, onAdd, onViewAll }) {
  const trackRef = useRef(null);
  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(".productCard");
    track.scrollBy({ left: direction * ((card?.getBoundingClientRect().width || 280) + 18), behavior: "smooth" });
  };
  useEffect(() => {
    if (products.length < 2) return undefined;
    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (atEnd) track.scrollTo({ left: 0, behavior: "smooth" });
      else scroll(1);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [products.length]);
  if (!products.length) return null;
  return <section className="shopSection featuredCarouselSection" id="featured"><div className="shopSectionHeader templateSectionHeader"><div><span className="eyebrow">Handpicked for you</span><h2>Featured Products</h2><p>Explore products selected by our store team.</p></div><button className="shopLinkButton" type="button" onClick={onViewAll}>View all</button></div><div className="featuredCarouselViewport"><button className="carouselArrow carouselArrowLeft" type="button" aria-label="Previous featured products" onClick={() => scroll(-1)}>‹</button><div className="featuredCarouselTrack" ref={trackRef}>{products.map((product) => <ProductCard product={product} key={product._id} featured onView={onView} onAdd={onAdd} />)}</div><button className="carouselArrow carouselArrowRight" type="button" aria-label="Next featured products" onClick={() => scroll(1)}>›</button></div></section>;
}

function ReelsViewer({ products, loading, error, onRetry, customer, onRequireLogin, onProduct, onSeller, onBuy, onBack }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [engagement, setEngagement] = useState({ likeCount: 0, liked: false, comments: [] });
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  useEffect(() => { setActiveIndex(0); }, [products.map((product) => product._id).join("|")]);
  const activeProduct = products[Math.min(activeIndex, Math.max(products.length - 1, 0))];
  useEffect(() => { setCommentsOpen(false); setComment(""); if (!customer || !activeProduct?._id) { setEngagement({ likeCount: 0, liked: false, comments: [] }); return; } api.reelEngagement(activeProduct._id).then(setEngagement).catch(() => setEngagement({ likeCount: 0, liked: false, comments: [] })); }, [activeProduct?._id, customer?._id]);
  if (loading) return <section className="shopSection emptyRoute"><h2>Loading reels…</h2><p>Fetching the latest product videos.</p></section>;
  if (error) return <section className="shopSection emptyRoute"><h2>Could not load reels</h2><p>{error}</p><button className="heroPrimary" type="button" onClick={onRetry}>Try again</button></section>;
  if (!products.length) return <section className="shopSection emptyRoute"><h2>No product reels yet</h2><p>Reels uploaded by the store will appear here.</p><button className="heroPrimary" type="button" onClick={onBack}>Browse products</button></section>;
  const product = activeProduct;
  const requireCustomer = (action) => { if (!customer) { onRequireLogin(); return; } action(); };
  const share = async () => { const url = `${window.location.origin}${window.location.pathname}#/reels?product=${encodeURIComponent(product._id)}`; try { if (navigator.share) await navigator.share({ title: product.name, text: product.shortDescription, url }); else { await navigator.clipboard.writeText(url); setShareMessage("Link copied"); window.setTimeout(() => setShareMessage(""), 2000); } } catch (_error) { /* Sharing was cancelled. */ } };
  return <section className="reelsPage">
    <div className="reelViewport" onTouchStart={(event) => setTouchStart(event.touches[0].clientY)} onTouchEnd={(event) => { if (touchStart == null) return; const distance = touchStart - event.changedTouches[0].clientY; if (Math.abs(distance) > 45) setActiveIndex((index) => distance > 0 ? Math.min(products.length - 1, index + 1) : Math.max(0, index - 1)); setTouchStart(null); }}>
      {productReelUrl(product) ? <video key={product._id} src={productReelUrl(product)} poster={productImage(product)} autoPlay muted loop playsInline controls /> : <img className="reelMediaFallback" key={product._id} src={productImage(product)} alt={product.name} />}
      <button className="reelBack" type="button" onClick={onBack}>← Products</button>
      <div className="reelProductCard"><button className="reelProductLink" type="button" onClick={() => onProduct(product)}>
        <img src={productImage(product)} alt="" />
        <span><strong>{product.name}</strong><small>{money(product.offerPrice || product.price)} · View product</small></span>
      </button><button className="reelBuyNow" type="button" onClick={() => onBuy(product)}><ShoppingBag size={16} /> Buy Now</button></div>
      <aside className="reelActions" aria-label="Reel actions">
        <button className={engagement.liked ? "active" : ""} type="button" onClick={() => requireCustomer(async () => setEngagement(await api.toggleReelLike(product._id)))}><Heart size={23} fill={engagement.liked ? "currentColor" : "none"} /><span>{engagement.likeCount || "Like"}</span></button>
        <button type="button" onClick={() => requireCustomer(() => setCommentsOpen((open) => !open))}><MessageCircle size={23} /><span>{engagement.comments.length || "Comment"}</span></button>
        <button type="button" onClick={share}><Share2 size={23} /><span>{shareMessage || "Share"}</span></button>
        {product.seller && <button type="button" onClick={() => onSeller(product.seller)}><Store size={23} /><span>Seller</span></button>}
      </aside>
      {commentsOpen && <section className="reelComments"><header><strong>Comments</strong><button type="button" onClick={() => setCommentsOpen(false)}><X size={18} /></button></header><div>{engagement.comments.map((item) => <article key={item._id}><strong>{item.customer?.name || "Customer"}</strong><p>{item.text}</p></article>)}{!engagement.comments.length && <p>No comments yet. Start the conversation.</p>}</div><form onSubmit={async (event) => { event.preventDefault(); if (!comment.trim()) return; setEngagement(await api.createReelComment(product._id, comment)); setComment(""); }}><input maxLength="1000" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment…" /><button type="submit" aria-label="Post comment"><Send size={18} /></button></form></section>}
      <div className="reelCounter">{activeIndex + 1} / {products.length}</div>
      <div className="reelControls"><button type="button" aria-label="Previous reel" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}>↑</button><button type="button" aria-label="Next reel" disabled={activeIndex === products.length - 1} onClick={() => setActiveIndex((index) => Math.min(products.length - 1, index + 1))}>↓</button></div>
    </div>
  </section>;
}

function ProductCard({ product, featured = false, onView, onAdd, onSave, saved = false }) {
  const onSale = Number(product.offerPrice || product.price) < Number(product.price);
  const lowStock = product.isStockManageable && product.stock > 0 && product.stock <= 10;

  return (
    <article className={featured ? "productCard featured" : "productCard"}>
      <button className="productImage" type="button" onClick={() => onView(product)} aria-label={`View ${product.name}`}>
        <img loading="lazy" src={productImage(product)} alt={product.name} />
        {product.displayType === "Reel" && <span className="imageBadge">Reel</span>}
        {lowStock && <span className="stockBadge">Only {product.stock} left</span>}
      </button>
      <div className="productInfo">
        <span>{getProductBrand(product)} / {product.category?.name || "Product"}</span>
        {product.seller ? <a className="sellerLink" href={`#/sellers/${encodeURIComponent(product.seller._id || product.seller)}`}>Sold by {product.seller.companyName || "Seller"}</a> : <span className="sellerLink adminSellerLabel">Sold by HRSBasket</span>}
        <button className="productTitleButton" type="button" onClick={() => onView(product)}><h3>{product.name}</h3></button>
        {product.reviewCount > 0 && <div className="ratingRow" aria-label={`Rated ${product.averageRating || 0} out of 5`}>
          <Star size={15} fill="currentColor" />
          <strong>{product.averageRating}</strong>
          <small>{product.reviewCount} reviews</small>
        </div>}
        <div className="priceRow">
          <strong>{money(product.offerPrice || product.price)}</strong>
          {onSale && <span>{money(product.price)}</span>}
        </div>
        <div className="cardActions">
          <button className="cartButton wide" type="button" onClick={() => onAdd(product)}>
            <ShoppingBag size={17} /> Add to Cart
          </button>
          <button className={saved ? "iconButton saved" : "iconButton"} type="button" aria-label="Save for later" onClick={() => onSave?.(product)}>
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </article>
  );
}

function FormattedProductDescription({ text }) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  return <div className="formattedProductDescription">{lines.map((source, index) => { const line = source.trim(); if (!line) return <div className="descriptionSpacer" key={index} aria-hidden="true" />; if (/^[-*•]\s+/.test(line)) return <div className="descriptionBullet" key={index}><CheckCircle2 size={16} /><span>{line.replace(/^[-*•]\s+/, "")}</span></div>; if (/^#{1,3}\s+/.test(line) || (line.endsWith(":") && line.length < 80)) return <h3 key={index}>{line.replace(/^#{1,3}\s+/, "")}</h3>; return <p key={index}>{line}</p>; })}</div>;
}

function ReadMoreProductDescription({ text }) {
  const [expanded, setExpanded] = useState(false);
  const description = String(text || "").trim();
  const shouldCollapse = description.length > 520;
  const visibleText = !expanded && shouldCollapse ? `${description.slice(0, 520).trimEnd()}…` : description;
  return <div className="readMoreDescription"><FormattedProductDescription text={visibleText} />{shouldCollapse && <button className="shopLinkButton" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? "Read less" : "Read more"}</button>}</div>;
}

function ProductDetailPage({ product, products, customer, onBack, onHome, onCategory, onAdd, onBuy, onSave, saved, contentSections = [], assurances = {}, onWatchReel }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState(() => Object.fromEntries((product.variationOptions || []).map((option) => [option.name, option.values?.[0] || ""])));
  const media = product.media?.filter((item) => item.type === "image") || [];
  const templateDetailImages = [
    productImage(product),
    "/images/e-commerce/details/1-right.png",
    "/images/e-commerce/details/1-center.png",
    "/images/e-commerce/details/1-left.png"
  ];
  const gallery = media.length
    ? media.map((item) => ({ url: item.url, alt: item.alt || product.name }))
    : templateDetailImages.map((url) => ({ url, alt: product.name }));
  const [activeImage, setActiveImage] = useState(gallery[0]?.url || productImage(product));
  const [showVideo, setShowVideo] = useState(false);
  const lowStock = product.isStockManageable && product.stock > 0 && product.stock <= 10;
  const variant = (product.variants || []).find((item) => Object.entries(selectedOptions).every(([name, value]) => item.attributes?.[name] === value)) || {};
  const variantUnavailable = (product.variationOptions || []).length > 0 && (!variant.sku || (Number(variant.stock) <= 0 && !variant.backOrderAllowed));
  const unitPrice = Number(variant.price ?? product.offerPrice ?? product.price);
  const subtotal = unitPrice * quantity;
  const categoryId = String(product.category?._id || product.category || "");
  const parentCategoryId = String(product.category?.parent?._id || product.category?.parent || categoryId);
  const sameSubcategory = products.filter((item) => item._id !== product._id && String(item.category?._id || item.category || "") === categoryId);
  const sameCategory = products.filter((item) => item._id !== product._id && String(item.category?._id || item.category || "") !== categoryId && String(item.category?.parent?._id || item.category?.parent || item.category?._id || item.category || "") === parentCategoryId);
  const selectedRelatedIds = (product.relatedProducts || []).map((item) => String(item?._id || item));
  const selectedRelated = selectedRelatedIds.map((id) => products.find((item) => String(item._id) === id)).filter(Boolean);
  const automaticRelated = [...sameSubcategory, ...sameCategory.filter((item) => !sameSubcategory.some((related) => related._id === item._id))];
  const relatedProducts = [...selectedRelated, ...automaticRelated.filter((item) => !selectedRelatedIds.includes(String(item._id)))];

  return (
    <section className="shopSection productDetailPage flatProductDetail">
      <div className="productDetailNav"><button className="shopLinkButton backButton" type="button" onClick={onBack}>Back to Products</button><nav className="breadcrumb productDetailBreadcrumb" aria-label="Breadcrumb"><button type="button" onClick={onHome}>Home</button><ChevronRight size={14} />{product.category?.parent?.name && <><button type="button" onClick={() => onCategory(product.category.parent)}>{product.category.parent.name}</button><ChevronRight size={14} /></>}<button type="button" onClick={() => onCategory(product.category)}>{product.category?.name || "Product"}</button><ChevronRight size={14} /><span>{product.name}</span></nav></div>
      <div className="flatProductTop">
        <div className="flatGallery">
          <div className="flatMainImage zoomFrame">
            {showVideo && product.videoUrl ? <video className="productMainVideo" src={product.videoUrl} poster={productImage(product)} controls autoPlay playsInline /> : <><img src={activeImage} alt={product.name} /><span>Hover to zoom</span></>}
          </div>
          <div className="flatThumbRail">
            {gallery.slice(0, 4).map((item) => (
              <button className={!showVideo && activeImage === item.url ? "active" : ""} key={item.url} type="button" onClick={() => { setActiveImage(item.url); setShowVideo(false); }}>
                <img src={item.url} alt={item.alt || product.name} />
              </button>
            ))}
            {product.videoUrl && (
              <button type="button" className={showVideo ? "videoThumb active" : "videoThumb"} onClick={() => setShowVideo(true)}>
                Video
              </button>
            )}
          </div>
        </div>
        <div className="flatProductInfo">
          <span className="brandLine">{product.category?.name || "Product"}</span>
          {product.seller ? <a className="sellerLink" href={`#/sellers/${encodeURIComponent(product.seller._id || product.seller)}`}>Sold by {product.seller.companyName || "Seller"}</a> : <span className="sellerLink adminSellerLabel">Sold by HRSBasket</span>}
          <h1>{product.name}</h1>
          {product.reviewCount > 0 && <div className="ratingRow">
            {[1, 2, 3, 4, 5].map((item) => (
              <Star key={item} size={17} fill={item <= Math.round(product.averageRating || 0) ? "currentColor" : "none"} />
            ))}
            <a href="#product-reviews">{product.reviewCount || 0} reviews</a>
          </div>}
          <p>{product.shortDescription}</p>
          {(product.variationOptions || []).length > 0 && <div className="productVariationSelectors">{product.variationOptions.map((option) => <fieldset key={option.name}><legend>{option.name}</legend><div className="variationValueList">{(option.values || []).map((value) => <button className={selectedOptions[option.name] === value ? "variationValue active" : "variationValue"} type="button" key={value} aria-pressed={selectedOptions[option.name] === value} onClick={() => setSelectedOptions({ ...selectedOptions, [option.name]: value })}>{value}</button>)}</div></fieldset>)}{variant.sku && <small>Variant SKU: {variant.sku} · {variant.stock} in stock</small>}</div>}
          <div className={lowStock ? "stockStatus urgent" : "stockStatus"}>
            <CheckCircle2 size={17} />
            {lowStock ? `Only ${product.stock} left in stock.` : "In stock and ready to ship."}
          </div>
          <div className="flatPurchaseRow">
            <div>
              <h6>Quantity</h6>
              <div className="quantityStepper detailQuantity">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={14} /></button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => value + 1)}><Plus size={14} /></button>
              </div>
            </div>
            <div>
              <h6>Price</h6>
              <strong>{money(subtotal)}</strong>
              {unitPrice < Number(product.price) && <small>{money(Number(product.price) * quantity)}</small>}
            </div>
          </div>
          <div className="flatActionRow">
            <button className="heroSecondary detailAdd" type="button" disabled={variantUnavailable} onClick={() => onAdd(product, variant, quantity)}>
              <ShoppingBag size={18} /> Add to Cart
            </button>
            <button className="heroPrimary detailAdd" type="button" disabled={variantUnavailable} onClick={() => onBuy(product, variant, quantity)}>
              Buy Now
            </button>
          </div>
          <button className={saved ? "shopLinkButton savedAction" : "shopLinkButton"} type="button" onClick={() => onSave(product)}>
            <Heart size={18} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved for Later" : "Add to Wishlist"}
          </button>
          {onWatchReel && <button className="shopLinkButton savedAction" type="button" onClick={onWatchReel}><Video size={18} /> Watch product reel</button>}
          <div className="flatDetailMeta">
            <span><ShieldCheck size={16} /> {assurances.securePayment || "Secure payment"}</span>
            <span><PackageCheck size={16} /> {assurances.returns || "30-day returns"}</span>
            <span><Truck size={16} /> {assurances.shipping || "Ships in 24 hours"}</span>
          </div>
        </div>
      </div>
      <section className="panel productDescriptionPanel">
        <header><span className="eyebrow">Everything you need to know</span><h2>About this product</h2><p>{product.shortDescription}</p></header>
        <div className="productDescriptionLayout"><ReadMoreProductDescription text={product.detailedDescription || product.shortDescription} />
        <dl className="productSpecificationList">
          {product.manufacturerBrand && <><dt>Manufacturer / Brand</dt><dd>{product.manufacturerBrand}</dd></>}
          {product.hsnCode && <><dt>HSN Code</dt><dd>{product.hsnCode}</dd></>}
          {product.volumetricWeight != null && <><dt>Volumetric weight</dt><dd>{product.volumetricWeight}</dd></>}
          {product.length != null && <><dt>Length</dt><dd>{product.length}</dd></>}
          {product.height != null && <><dt>Height</dt><dd>{product.height}</dd></>}
          {product.warranty && <><dt>Warranty</dt><dd>{product.warranty}</dd></>}
        </dl></div>
      </section>
      <ContentSections sections={contentSections} />
      {product.reviewCount > 0 && <FlatReviews product={product} customer={customer} />}
      {relatedProducts.length > 0 && <section className="flatAlsoLike">
        <div className="relatedHeading"><span className="eyebrow">Continue exploring</span><h2>{selectedRelated.length ? "Related products" : `More from this ${product.category?.parent ? "subcategory and category" : "category"}`}</h2></div>
        <div className="relatedGrid">
          {relatedProducts.map((item) => (
            <article key={item._id}>
              <a href={`#/product/${encodeURIComponent(item._id)}`}><img src={productImage(item)} alt={item.name} /></a>
              <span>{item.name}</span>
              <strong>{money(item.offerPrice || item.price)}</strong>
            </article>
          ))}
        </div>
      </section>}
    </section>
  );
}

function FlatReviews({ product, customer }) {
  const [reviews, setReviews] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [status, setStatus] = useState("");
  useEffect(() => { api.productReviews(product._id).then(setReviews).catch((error) => setStatus(error.message)); }, [product._id]);
  const submit = async (event) => { event.preventDefault(); setStatus(""); try { const review = await api.createProductReview(product._id, form); setReviews((current) => [review, ...current]); setFormOpen(false); setForm({ rating: 5, comment: "" }); } catch (error) { setStatus(error.message); } };

  return (
    <section className="flatReviews" id="product-reviews">
      <div className="flatReviewHeader">
        <h2>Reviews:</h2>
        <button type="button" className="shopLinkButton" onClick={() => { if (!customer) setStatus("Sign in, buy this product, and then write a review."); else setFormOpen(true); }}>+ Leave Feedback</button>
      </div>
      {formOpen && <form className="reviewForm" onSubmit={submit}><label>Rating<select value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label><label>Review<textarea required value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label><button className="heroPrimary">Submit review</button></form>}
      {status && <p className="authStatus">{status}</p>}
      {!reviews.length && <p>Buy this product and write the first review.</p>}
      {reviews.map((review) => (
        <article key={review._id}>
          <div className="reviewAvatar">{review.name?.charAt(0)?.toUpperCase()}</div>
          <div>
            <header>
              <strong>{review.name}</strong>
              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
            </header>
            <div className="ratingRow">
              {[1, 2, 3, 4, 5].map((item) => (
                <Star key={item} size={16} fill={item <= review.rating ? "currentColor" : "none"} />
              ))}
            </div>
            <p>{review.comment}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function CustomerAuthModal({ authMode, setAuthMode, customer, setCustomer, onSuccess, onLogout, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", gender: "" });
  const [status, setStatus] = useState(customer ? `Signed in as ${customer.name}.` : "");
  const [loading, setLoading] = useState(false);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submitAuth = async (event) => {
    event.preventDefault();
    setStatus("");

    if (authMode === "signup" && form.password !== form.confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const payload =
        authMode === "signup"
          ? { name: form.name, email: form.email, password: form.password, confirmPassword: form.confirmPassword, gender: form.gender }
          : { email: form.email, password: form.password };
      const data = authMode === "signup" ? await api.customerRegister(payload) : await api.customerLogin(payload);
      customerAuthStore.token = data.token;
      customerAuthStore.customer = data.customer;
      setCustomer(data.customer);
      onSuccess(data.customer, authMode);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Customer account">
      <section className="customerAuthModal">
        <button className="modalClose" type="button" onClick={onClose} aria-label="Close login popup">
          <X size={20} />
        </button>
        <div>
          <span className="eyebrow">Customer account</span>
          <h2>{authMode === "signup" ? "Create Account" : authMode === "forgot" ? "Reset Your Password" : "Login to Your Account"}</h2>
          <p>Use your customer account for faster checkout.</p>
        </div>
        {customer && (
          <div className="customerSignedIn">
            <strong>{customer.name}</strong>
            <span>{customer.email}</span>
            <button className="shopLinkButton" type="button" onClick={onLogout}>Sign Out</button>
          </div>
        )}
        <div className="authSwitch">
          <button className={authMode === "login" ? "selected" : ""} type="button" onClick={() => setAuthMode("login")}>
            Login
          </button>
          <button className={authMode === "signup" ? "selected" : ""} type="button" onClick={() => setAuthMode("signup")}>
            Sign Up
          </button>
        </div>
        {authMode === "forgot" ? <ForgotPasswordForm identifierLabel="Email address" identifierType="email" initialIdentifier={form.email} onRequest={(email) => api.customerForgotPassword({ email })} onReset={({ identifier, ...payload }) => api.customerResetPassword({ email: identifier, ...payload })} onBack={() => setAuthMode("login")} /> : <form className="customerAuthForm" onSubmit={submitAuth}>
          {authMode === "signup" && (
            <select value={form.gender} onChange={(event) => updateForm("gender", event.target.value)} required aria-label="Gender"><option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select>
          )}
          {authMode === "signup" && (
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Full name"
              aria-label="Full name"
              required
            />
          )}
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateForm("email", event.target.value)}
            placeholder="Email address"
            aria-label="Customer email"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateForm("password", event.target.value)}
            placeholder="Password"
            aria-label="Customer password"
            minLength={8}
            required
          />
          {authMode === "signup" && (
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => updateForm("confirmPassword", event.target.value)}
              placeholder="Confirm password"
              aria-label="Confirm password"
              minLength={8}
              required
            />
          )}
          {status && <p className="authStatus" role="status">{status}</p>}
          <button className="heroPrimary" type="submit" disabled={loading}>
            {loading ? "Please wait..." : authMode === "signup" ? "Create Account" : "Login"}
          </button>
          {authMode === "login" && <button className="shopLinkButton" type="button" onClick={() => setAuthMode("forgot")}>Forgot password?</button>}
        </form>}
      </section>
    </div>
  );
}

function CustomerDashboard({ customer, setCustomer, onLogout, onClose, pageMode = false }) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState({ name: customer.name || "", email: customer.email || "", phone: customer.phone || "", gender: customer.gender || "prefer_not_to_say" });
  const [addresses, setAddresses] = useState(customer.addresses || []);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.customerAccount(), api.customerOrders()])
      .then(([account, orderData]) => {
        const next = account.customer;
        customerAuthStore.customer = next;
        setCustomer(next);
        setProfile({ name: next.name || "", email: next.email || "", phone: next.phone || "", gender: next.gender || "prefer_not_to_say" });
        setAddresses(next.addresses || []);
        setOrders(orderData || []);
      })
      .catch((error) => setStatus(error.message))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault(); setStatus("");
    try { const data = await api.updateCustomerProfile(profile); customerAuthStore.customer = data.customer; setCustomer(data.customer); setStatus("Profile updated successfully."); }
    catch (error) { setStatus(error.message); }
  };
  const addAddress = () => setAddresses((current) => [...current, { label: "Home", line1: "", city: "", state: "", postalCode: "", country: "India", isDefault: current.length === 0 }]);
  const updateAddress = (index, field, value) => setAddresses((current) => current.map((address, itemIndex) => itemIndex === index ? { ...address, [field]: value } : address));
  const setDefaultAddress = (index) => setAddresses((current) => current.map((address, itemIndex) => ({ ...address, isDefault: itemIndex === index })));
  const saveAddresses = async () => {
    setStatus("");
    try { const data = await api.saveCustomerAddresses(addresses); customerAuthStore.customer = data.customer; setCustomer(data.customer); setAddresses(data.customer.addresses || []); setStatus("Addresses saved successfully."); }
    catch (error) { setStatus(error.message); }
  };

  return <div className={pageMode ? "shopSection customerAccountPage" : "modalOverlay customerDashboardOverlay"} role={pageMode ? undefined : "dialog"} aria-modal={pageMode ? undefined : "true"} aria-label="Customer dashboard">
    <section className="customerDashboard">
      <button className={pageMode ? "shopLinkButton accountBack" : "modalClose"} type="button" onClick={onClose} aria-label={pageMode ? "Back to storefront" : "Close customer dashboard"}>{pageMode ? "← Back to Store" : <X size={20} />}</button>
      <aside className="customerDashboardNav">
        <div className="customerIdentity"><div>{customer.name?.charAt(0)?.toUpperCase()}</div><strong>{customer.name}</strong><span>{customer.email}</span></div>
        {[['orders','Order History'],['profile','Profile Update'],['addresses','Manage Addresses']].map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} type="button" onClick={() => { setTab(id); setStatus(""); }}>{label}</button>)}
        <button className="logoutDashboard" type="button" onClick={onLogout}>Logout</button>
      </aside>
      <div className="customerDashboardContent">
        {status && <div className="accountNotice" role="status">{status}</div>}
        {loading && <p>Loading your account…</p>}
        {!loading && tab === "orders" && <><span className="eyebrow">Your purchases</span><h2>Order History</h2>{!orders.length && <div className="accountEmpty"><PackageCheck size={34} /><h3>No orders yet</h3><p>Your completed orders will appear here.</p></div>}<div className="customerOrderList">{orders.map((order) => <article key={order._id}><header><div><strong>{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div><span className={`orderStatus ${String(order.status).toLowerCase()}`}>{order.status}</span></header><div className="customerOrderItems">{order.items.map((item, index) => <div key={`${item.product?._id || item.sku}-${index}`}><img src={item.product ? productImage(item.product) : "/images/e-commerce/home/product4.png"} alt="" /><div><strong>{item.name}</strong><span>{item.sku} · Qty {item.quantity}</span><small>Item status: {item.sellerStatus || order.status}</small></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div><footer><span>Payment: {order.payment?.methodName || order.paymentStatus}</span><strong>Total {money(order.grandTotal)}</strong></footer></article>)}</div></>}
        {!loading && tab === "profile" && <><span className="eyebrow">Personal details</span><h2>Profile Update</h2><form className="accountForm" onSubmit={saveProfile}><label>Name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>Email<input value={profile.email} disabled /></label><label>Phone<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label><label>Gender<select value={profile.gender} onChange={(event) => setProfile({ ...profile, gender: event.target.value })}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label><button className="heroPrimary">Save Profile</button></form></>}
        {!loading && tab === "addresses" && <><div className="accountTitleRow"><div><span className="eyebrow">Saved delivery details</span><h2>Manage Addresses</h2></div><button className="heroSecondary" type="button" onClick={addAddress}><Plus size={16} /> Add Address</button></div><div className="addressEditorList">{addresses.map((address, index) => <article key={address._id || index}><label className="toggleRow"><input type="radio" name="defaultAddress" checked={Boolean(address.isDefault)} onChange={() => setDefaultAddress(index)} /><span>Use as default shopping address</span></label>{['label','line1','city','state','postalCode','country'].map((field) => <label key={field}>{field === 'line1' ? 'Address line' : field === 'postalCode' ? 'Postal code' : field}<input required value={address[field] || ""} onChange={(event) => updateAddress(index, field, event.target.value)} /></label>)}<button className="shopLinkButton" type="button" onClick={() => setAddresses((current) => current.filter((_item, itemIndex) => itemIndex !== index))}>Remove</button></article>)}</div>{addresses.length > 0 && <button className="heroPrimary" type="button" onClick={saveAddresses}>Save Addresses</button>}{!addresses.length && <div className="accountEmpty"><h3>No saved addresses</h3><p>Add an address for faster checkout.</p></div>}</>}
      </div>
    </section>
  </div>;
}

function CheckoutPage({
  cart,
  setCart,
  total,
  checkout,
  setCheckout,
  checkoutStep,
  setCheckoutStep,
  shippingCost,
  firstOrderDiscount,
  deliveryEstimate,
  emailInvalid,
  paymentStatus,
  setPaymentStatus,
  orderId,
  setOrderId,
  shippingRuleId,
  shippingLabel,
  paymentMethods,
  customer,
  setCustomer,
  onBack
}) {
  const discountTotal = getFirstOrderDiscount(firstOrderDiscount, total);
  const finalTotal = total + shippingCost - discountTotal;
  const [activePaymentMethods, setActivePaymentMethods] = useState(paymentMethods || []);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const selectedPayment = activePaymentMethods.find((method) => method.code === checkout.paymentMethod) || activePaymentMethods[0];
  const [validationMessage, setValidationMessage] = useState("");
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const savedAddresses = customer?.addresses || [];
  const defaultAddress = savedAddresses.find((address) => address.isDefault);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState(defaultAddress?._id ? String(defaultAddress._id) : "");
  const steps = customer ? ["address", "payment", "confirmation"] : ["account", "address", "payment", "confirmation"];
  const stepIndex = steps.indexOf(checkoutStep);
  const billingComplete = checkout.billingAddress.trim() && checkout.billingCity.trim() && checkout.billingState.trim() && checkout.billingPostalCode.trim();
  const shippingComplete = checkout.sameAsBilling || (checkout.shippingAddress.trim() && checkout.city.trim() && checkout.state.trim() && checkout.postalCode.trim());
  const addressComplete = checkout.name.trim() && checkout.phone.trim() && billingComplete && shippingComplete;
  const canPay = cart.length > 0 && customer && addressComplete && checkout.email && !emailInvalid;

  useEffect(() => {
    if (!customer || checkoutStep !== "account") return;
    const preferredAddress = customer.addresses?.find((address) => address.isDefault);
    setCheckout((current) => ({
      ...current,
      name: current.name || customer.name || "",
      email: customer.email || current.email,
      phone: current.phone || customer.phone || "",
      gender: current.gender || customer.gender || "",
      ...(preferredAddress && !current.billingAddress ? {
        billingAddress: preferredAddress.line1 || "",
        billingCity: preferredAddress.city || "",
        billingState: preferredAddress.state || "",
        billingPostalCode: preferredAddress.postalCode || "",
        shippingAddress: preferredAddress.line1 || "",
        city: preferredAddress.city || "",
        state: preferredAddress.state || "",
        postalCode: preferredAddress.postalCode || "",
        sameAsBilling: true
      } : {})
    }));
    if (preferredAddress?._id) setSelectedSavedAddress(String(preferredAddress._id));
    setValidationMessage("");
    setCheckoutStep("address");
  }, [customer, checkoutStep, setCheckout, setCheckoutStep]);

  useEffect(() => {
    let current = true;
    setPaymentMethodsLoading(true);
    api.storefrontPaymentMethods()
      .then((methods) => { if (current) setActivePaymentMethods(methods || []); })
      .catch(() => { if (current) setActivePaymentMethods(paymentMethods || []); })
      .finally(() => { if (current) setPaymentMethodsLoading(false); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (activePaymentMethods.length && !activePaymentMethods.some((method) => method.code === checkout.paymentMethod)) {
      setCheckout((current) => ({ ...current, paymentMethod: activePaymentMethods[0].code }));
    }
  }, [activePaymentMethods, setCheckout]);

  const placeOrder = async (challengeId = otpChallengeId, razorpayPayment = {}) => {
    const data = await api.createStorefrontOrder({
      items: cart.map((item) => ({ productId: item.product._id, variantSku: item.variant?.sku, quantity: item.quantity })),
      checkout: {
        ...checkout,
        shippingAddress: checkout.sameAsBilling ? checkout.billingAddress : checkout.shippingAddress
      },
      paymentMethodCode: selectedPayment.code,
      shippingRuleId,
      ...razorpayPayment,
      otpChallengeId: challengeId
    });
    setCompletedOrder({ ...data.order, items: [...cart], subtotal: total, shipping: shippingCost, discount: discountTotal, total: finalTotal });
    setOrderId(data.order.orderNumber);
    setPaymentStatus(`${selectedPayment.name} accepted. Order ${data.order.orderNumber} issued.`);
    setCart([]);
    setCheckoutStep("confirmation");
  };

  useEffect(() => {
    const returned = readPayuReturn();
    if (!returned || returned.kind !== "storefront") return;
    setCheckoutStep("payment");
    if (returned.status !== "success" || !returned.orderPayload) { setPaymentStatus("PayU payment was not successful."); clearPayuReturn(); setCheckoutStep("payment"); return; }
    setSubmitting(true); setPaymentStatus("Verifying PayU payment and placing your order...");
    api.createStorefrontOrder({ ...returned.orderPayload, payuTxnId: returned.txnid })
      .then((data) => { setCompletedOrder(data.order); setOrderId(data.order.orderNumber); setPaymentStatus(`Payment accepted. Order ${data.order.orderNumber} issued.`); setCart([]); setCheckoutStep("confirmation"); })
      .catch((error) => { setPaymentStatus(error.message); setCheckoutStep("payment"); })
      .finally(() => { clearPayuReturn(); setSubmitting(false); });
  }, []);

  const confirmPayment = async () => {
    if (!canPay || submitting) return;
    setSubmitting(true);
    try {
      if (selectedPayment.type === "cod" && !otpChallengeId) {
        setPaymentStatus("Sending a confirmation OTP to your account email...");
        const data = await api.requestOrderOtp({});
        setOtpChallengeId(data.challengeId);
        setOtpVerified(false);
        setPaymentStatus(`${data.message}. Enter it below to confirm your order.`);
        return;
      }
      if (selectedPayment.type === "cod" && !otpVerified) {
        if (otp.length !== 6) {
          setPaymentStatus("Enter the 6-digit OTP sent to your email.");
          return;
        }
        setPaymentStatus("Verifying OTP and placing your order...");
        await api.requestOrderOtp({ challengeId: otpChallengeId, otp });
        setOtpVerified(true);
        await placeOrder(otpChallengeId);
        return;
      }
      if (selectedPayment.type === "razorpay") {
        setPaymentStatus("Opening secure Razorpay checkout...");
        const items = cart.map((item) => ({ productId: item.product._id, variantSku: item.variant?.sku, quantity: item.quantity }));
        const razorpayOrder = await api.createRazorpayCheckoutOrder({ items, shippingRuleId, paymentMethodCode: selectedPayment.code });
        await loadRazorpayCheckout();
        const payment = await new Promise((resolve, reject) => {
          const instance = new window.Razorpay({
            key: razorpayOrder.keyId,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            name: razorpayOrder.merchantName || "HRSBasket",
            description: "Store order payment",
            order_id: razorpayOrder.orderId,
            prefill: { name: checkout.name, email: checkout.email, contact: checkout.phone },
            handler: resolve,
            modal: { ondismiss: () => reject(new Error("Payment was cancelled.")) },
            theme: { color: "#883c26" }
          });
          instance.on("payment.failed", (response) => reject(new Error(response.error?.description || "Razorpay payment failed")));
          instance.open();
        });
        setPaymentStatus("Verifying payment and placing your order...");
        await placeOrder("", { razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature });
        return;
      }
      if (selectedPayment.type === "payu") {
        setPaymentStatus("Opening secure PayU checkout...");
        const items = cart.map((item) => ({ productId: item.product._id, variantSku: item.variant?.sku, quantity: item.quantity }));
        const orderPayload = { items, checkout: { ...checkout, shippingAddress: checkout.sameAsBilling ? checkout.billingAddress : checkout.shippingAddress }, paymentMethodCode: selectedPayment.code, shippingRuleId };
        const payuCheckout = await api.createPayuCheckout({ items, shippingRuleId, paymentMethodCode: selectedPayment.code, firstname: checkout.name, phone: checkout.phone, returnUrl: window.location.href });
        await openPayuModal(payuCheckout, { kind: "storefront", orderPayload });
        return;
      }
      setPaymentStatus("Placing order...");
      await placeOrder();
    } catch (error) {
      setPaymentStatus(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const completeAccount = async () => {
    setValidationMessage("");
    if (!checkout.email || emailInvalid || !checkout.password) return setValidationMessage("Enter a valid email and password.");
    if (checkout.accountMode === "create" && (!checkout.name.trim() || !checkout.confirmPassword || !checkout.gender)) return setValidationMessage("Name, email, password, confirm password, and gender are compulsory.");
    if (checkout.accountMode === "create" && checkout.password !== checkout.confirmPassword) return setValidationMessage("Passwords do not match.");
    try {
      const payload = checkout.accountMode === "create" ? { name: checkout.name, email: checkout.email, password: checkout.password, confirmPassword: checkout.confirmPassword, gender: checkout.gender } : { email: checkout.email, password: checkout.password };
      const data = checkout.accountMode === "create" ? await api.customerRegister(payload) : await api.customerLogin(payload);
      customerAuthStore.token = data.token;
      customerAuthStore.customer = data.customer;
      setCustomer(data.customer);
      setCheckout({ ...checkout, name: checkout.name || data.customer.name, email: data.customer.email, phone: checkout.phone || data.customer.phone || "" });
      setCheckoutStep("address");
    } catch (error) { setValidationMessage(error.message); }
  };

  const continueToPayment = () => {
    if (!addressComplete) return setValidationMessage("Name, phone, address, city, state, and pincode are compulsory.");
    setValidationMessage("");
    setCheckout({
      ...checkout,
      shippingAddress: checkout.sameAsBilling ? checkout.billingAddress : checkout.shippingAddress,
      city: checkout.sameAsBilling ? checkout.billingCity : checkout.city,
      state: checkout.sameAsBilling ? checkout.billingState : checkout.state,
      postalCode: checkout.sameAsBilling ? checkout.billingPostalCode : checkout.postalCode
    });
    setCheckoutStep("payment");
  };

  const chooseSavedAddress = (value) => {
    setSelectedSavedAddress(value);
    const address = savedAddresses.find((item, index) => String(item._id || index) === value);
    if (!address) return;
    setCheckout((current) => ({
      ...current,
      billingAddress: address.line1 || "",
      billingCity: address.city || "",
      billingState: address.state || "",
      billingPostalCode: address.postalCode || "",
      shippingAddress: address.line1 || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || "",
      sameAsBilling: true
    }));
  };

  if (!cart.length && checkoutStep !== "confirmation") {
    return <section className="shopSection checkoutPage"><div className="cartPageEmpty"><ShoppingBag size={38} /><h2>Your cart is empty.</h2><p>Add products before starting checkout.</p><button className="heroPrimary" type="button" onClick={onBack}>Continue Shopping</button></div></section>;
  }

  return (
    <section className="shopSection checkoutPage">
      <button className="shopLinkButton backButton" type="button" onClick={onBack}>Back to Products</button>
      <div className={`checkoutLayout ${checkoutStep === "confirmation" ? "checkoutCompleteLayout" : ""}`}>
        <div className="checkoutMain">
          <div className="checkoutSteps" aria-label="Checkout steps">
            {steps.map((step) => (
              <button
                className={`${checkoutStep === step ? "active" : ""} ${steps.indexOf(step) < stepIndex ? "complete" : ""}`}
                key={step}
                type="button"
                disabled={steps.indexOf(step) >= stepIndex || step === "confirmation"}
                onClick={() => setCheckoutStep(step)}
              >
                {step}
              </button>
            ))}
          </div>

          {checkoutStep === "account" && (
            <div className="checkoutPanel">
              <span className="eyebrow">Account</span>
              <h2>Login or Create Account</h2>
              <div className="fulfillmentToggle">
                <button className={checkout.accountMode === "login" ? "selected" : ""} type="button" onClick={() => setCheckout({ ...checkout, accountMode: "login" })}>
                  <UserRound size={16} /> Login
                </button>
                <button className={checkout.accountMode === "create" ? "selected" : ""} type="button" onClick={() => setCheckout({ ...checkout, accountMode: "create" })}>
                  <Plus size={16} /> Create Account
                </button>
              </div>
              <label>
                <span>Email</span>
                <input value={checkout.email} onChange={(event) => setCheckout({ ...checkout, email: event.target.value })} placeholder="you@example.com" />
                {emailInvalid && <small>Email format looks incorrect.</small>}
              </label>
              <label>
                <span>Password</span>
                <input type="password" minLength="8" required value={checkout.password} onChange={(event) => setCheckout({ ...checkout, password: event.target.value })} placeholder="Password" />
              </label>
              {checkout.accountMode === "create" && <>
                <label><span>Name</span><input required value={checkout.name} onChange={(event) => setCheckout({ ...checkout, name: event.target.value })} placeholder="Full name" /></label>
                <label><span>Confirm password</span><input type="password" minLength="8" required value={checkout.confirmPassword} onChange={(event) => setCheckout({ ...checkout, confirmPassword: event.target.value })} /></label>
                <label><span>Gender</span><select required value={checkout.gender} onChange={(event) => setCheckout({ ...checkout, gender: event.target.value })}><option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
              </>}
              {validationMessage && <p className="authStatus">{validationMessage}</p>}
              <button className="heroPrimary" type="button" onClick={completeAccount}>
                Continue
              </button>
            </div>
          )}

          {checkoutStep === "address" && (
            <div className="checkoutPanel">
              <span className="eyebrow">Billing & Shipping</span>
              <h2>Where should we send it?</h2>
              {savedAddresses.length > 0 && <label><span>Choose a saved address</span><select value={selectedSavedAddress} onChange={(event) => chooseSavedAddress(event.target.value)}><option value="">Enter a different address</option>{savedAddresses.map((address, index) => <option key={address._id || index} value={String(address._id || index)}>{address.label || `Address ${index + 1}`}{address.isDefault ? " (Default)" : ""} — {address.line1}, {address.city}</option>)}</select></label>}
              <label>
                <span>Name</span>
                <input value={checkout.name} onChange={(event) => setCheckout({ ...checkout, name: event.target.value })} placeholder="Full name" />
              </label>
              <label><span>Phone</span><input required value={checkout.phone} onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })} placeholder="Phone number" /></label>
              <label>
                <span>Billing address</span>
                <input required value={checkout.billingAddress} onChange={(event) => setCheckout({ ...checkout, billingAddress: event.target.value })} placeholder="Street, building, area" />
              </label>
              <label><span>Billing city</span><input required value={checkout.billingCity} onChange={(event) => setCheckout({ ...checkout, billingCity: event.target.value })} placeholder="City" /></label>
              <label><span>Billing state</span><input required value={checkout.billingState} onChange={(event) => setCheckout({ ...checkout, billingState: event.target.value })} placeholder="State" /></label>
              <label><span>Billing pincode</span><input required inputMode="numeric" value={checkout.billingPostalCode} onChange={(event) => setCheckout({ ...checkout, billingPostalCode: event.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="110001" />{checkout.sameAsBilling && <small>{deliveryEstimate} · Shipping {shippingCost === 0 ? "free" : money(shippingCost)}</small>}</label>
              <label className="toggleRow">
                <input
                  type="checkbox"
                  checked={checkout.sameAsBilling}
                  onChange={(event) =>
                    setCheckout({
                      ...checkout,
                      sameAsBilling: event.target.checked,
                      shippingAddress: event.target.checked ? checkout.billingAddress : checkout.shippingAddress,
                      city: event.target.checked ? checkout.billingCity : checkout.city,
                      state: event.target.checked ? checkout.billingState : checkout.state,
                      postalCode: event.target.checked ? checkout.billingPostalCode : checkout.postalCode
                    })
                  }
                />
                <span>Shipping same as billing</span>
              </label>
              {!checkout.sameAsBilling && <div className="shippingAddressFields"><label>
                <span>Shipping address</span>
                <input
                  required
                  value={checkout.shippingAddress}
                  onChange={(event) => setCheckout({ ...checkout, shippingAddress: event.target.value, sameAsBilling: false })}
                  placeholder="Street, building, area"
                />
              </label>
              <label>
                <span>City</span>
                <input required value={checkout.city} onChange={(event) => setCheckout({ ...checkout, city: event.target.value })} placeholder="City" />
              </label>
              <label>
                <span>State</span>
                <input required value={checkout.state} onChange={(event) => setCheckout({ ...checkout, state: event.target.value })} placeholder="State" />
              </label>
              <label>
                <span>Pincode</span>
                <input required inputMode="numeric" value={checkout.postalCode} onChange={(event) => setCheckout({ ...checkout, postalCode: event.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="110001" />
                <small>{deliveryEstimate} · Shipping {shippingCost === 0 ? "free" : money(shippingCost)}</small>
              </label>
              </div>}
              <button
                className="heroPrimary"
                type="button"
                onClick={continueToPayment}
              >
                Continue to Payment
              </button>
              {validationMessage && <p className="authStatus">{validationMessage}</p>}
            </div>
          )}

          {checkoutStep === "payment" && (
            <div className="checkoutPanel">
              <span className="eyebrow">Payment</span>
              <h2>Select Payment Method</h2>
              <div className="paymentMethods">
                {activePaymentMethods.map((method) => {
                  const Icon = method.type === "razorpay" ? WalletCards : CreditCard;
                  return (
                  <button
                    className={checkout.paymentMethod === method.code ? "selected" : ""}
                    key={method.code}
                    type="button"
                    onClick={() => {
                      setCheckout({ ...checkout, paymentMethod: method.code });
                      setOtpChallengeId("");
                      setOtp("");
                      setOtpVerified(false);
                      setPaymentStatus("");
                    }}
                  >
                    <span className="paymentMethodIcon"><Icon size={21} /></span><span><strong>{method.name}</strong><small>{method.instructions || (method.type === "cod" ? "Pay after your order arrives" : "Complete payment securely online")}</small></span><span className="paymentMethodCheck" aria-hidden="true">{checkout.paymentMethod === method.code ? "✓" : ""}</span>
                  </button>
                  );
                })}
                {paymentMethodsLoading && <p>Loading active payment methods…</p>}
                {!paymentMethodsLoading && !activePaymentMethods.length && <p>No active payment methods are currently available.</p>}
              </div>
              {selectedPayment?.type === "razorpay" && <p className="paymentStatus">{selectedPayment.instructions || "Pay securely in the Razorpay checkout window."}</p>}
              {selectedPayment?.type === "payu" && <p className="paymentStatus">{selectedPayment.instructions || "Pay securely using PayU Hosted Checkout."}</p>}
              {selectedPayment?.type === "cod" && <p className="paymentStatus">{selectedPayment.instructions || "Pay when your order is delivered."}</p>}
              {selectedPayment?.type === "cod" && otpChallengeId && !otpVerified && <div className="otpConfirmation"><label><span>Email confirmation OTP</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" /></label></div>}
              {paymentStatus && <p className="paymentStatus">{paymentStatus}</p>}
              <button className="heroPrimary" type="button" disabled={!canPay || submitting} onClick={confirmPayment}>
                {selectedPayment?.type === "cod" && otpChallengeId && !otpVerified ? `Confirm OTP & place order for ${money(finalTotal)}` : selectedPayment?.type === "cod" ? `Place order for ${money(finalTotal)}` : `Pay ${money(finalTotal)} with ${selectedPayment?.name}`}
              </button>
            </div>
          )}

          {checkoutStep === "confirmation" && (
            <div className="checkoutPanel confirmationPanel">
              <CheckCircle2 size={42} />
              <h2>Order Confirmed</h2>
              <p>{paymentStatus || "Payment confirmed."}</p>
              <strong>{orderId}</strong>
              <button className="heroPrimary" type="button" onClick={onBack}>Continue Shopping</button>
            </div>
          )}
        </div>

        {checkoutStep !== "confirmation" && <aside className="checkoutSummary">
          <h2>Order Summary</h2>
          {cart.length === 0 && !completedOrder ? (
            <p>Your cart is empty.</p>
          ) : (
            (cart.length ? cart : completedOrder?.items || []).map((item) => (
              <div className="summaryLine" key={item.key}>
                <img src={productImage(item.product)} alt={item.product.name} />
                <div>
                  <strong>{item.product.name}</strong>
                  <span>Qty {item.quantity}</span>
                </div>
                <strong>{money(cartUnitPrice(item) * item.quantity)}</strong>
              </div>
            ))
          )}
          <div className="cartSummary inlineSummary">
            <div><span>Subtotal</span><strong>{money(completedOrder?.subtotal ?? total)}</strong></div>
            {(completedOrder?.discount ?? discountTotal) > 0 && <div><span>First order discount</span><strong>-{money(completedOrder?.discount ?? discountTotal)}</strong></div>}
            <div><span>Shipping</span><strong>{(completedOrder?.shipping ?? shippingCost) === 0 ? "Free" : money(completedOrder?.shipping ?? shippingCost)}</strong></div>
            <div><span>Total</span><strong>{money(completedOrder?.total ?? finalTotal)}</strong></div>
          </div>
        </aside>}
      </div>
    </section>
  );
}

function ReviewWidget() {
  return (
    <div className="reviewWidget">
      <div className="reviewPhotos">
        <img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b" alt="Customer review" />
        <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f" alt="Customer review" />
      </div>
      <p><strong>Really well made.</strong> The product matched the photos, shipped quickly, and felt premium out of the box.</p>
    </div>
  );
}

function ComponentLoader({ label }) {
  return (
    <section className="componentLoader" aria-live="polite" aria-label={label}>
      <span />
      <strong>{label}</strong>
    </section>
  );
}

function CartPage({ cart, total, shippingCost, firstOrderDiscount, onUpdate, onRemove, onViewProduct, onCheckout, onBack }) {
  const discountTotal = getFirstOrderDiscount(firstOrderDiscount, total);
  return (
    <section className="shopSection cartPage">
      <button className="shopLinkButton backButton" type="button" onClick={onBack}>Back to Products</button>
      <div className="cartPageHeader">
        <span className="eyebrow">Shopping cart</span>
        <h1>Your Cart</h1>
      </div>
      {cart.length === 0 ? (
        <div className="cartPageEmpty">
          <ShoppingBag size={38} />
          <h2>Your cart is empty.</h2>
          <button className="heroPrimary" type="button" onClick={onBack}>Shop Products</button>
        </div>
      ) : (
        <div className="cartPageLayout">
          <div className="cartPageItems">
            {cart.map((item) => (
              <div className="cartPageLine" key={item.key}>
                <button className="cartProductImage" type="button" onClick={() => onViewProduct(item.product)}><img src={productImage(item.product)} alt={item.product.name} /></button>
                <div className="cartProductDetails" role="button" tabIndex="0" onClick={() => onViewProduct(item.product)} onKeyDown={(event) => { if (event.key === "Enter") onViewProduct(item.product); }}>
                  <strong>{item.product.name}</strong>
                  <small>{money(cartUnitPrice(item))}{item.variant?.sku ? ` · ${Object.values(item.variant.attributes || {}).join(" / ")}` : ""}</small>
                </div>
                <div className="quantityStepper">
                  <button type="button" disabled={item.quantity <= 1} onClick={() => onUpdate(item.key, Math.max(1, item.quantity - 1))}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => onUpdate(item.key, item.quantity + 1)}><Plus size={14} /></button>
                </div>
                <strong>{money(cartUnitPrice(item) * item.quantity)}</strong>
                <button className="removeCartItem" type="button" onClick={() => onRemove(item.key)} aria-label={`Remove ${item.product.name}`}><Trash2 size={17} /> Remove</button>
              </div>
            ))}
          </div>
          <aside className="cartPageSummary">
            <h2>Summary</h2>
            <div className="cartSummary">
              <div><span>Subtotal</span><strong>{money(total)}</strong></div>
              {discountTotal > 0 && <div><span>First order discount</span><strong>-{money(discountTotal)}</strong></div>}
              <div><span>Shipping</span><strong>{shippingCost === 0 ? "Free" : money(shippingCost)}</strong></div>
              <div><span>Total</span><strong>{money(total + shippingCost - discountTotal)}</strong></div>
            </div>
            <button className="heroPrimary" type="button" onClick={onCheckout}>Checkout</button>
          </aside>
        </div>
      )}
    </section>
  );
}

function CartDrawer({
  open,
  cart,
  total,
  onClose,
  onUpdate,
  onRemove,
  onViewProduct,
  shippingCost,
  firstOrderDiscount,
  deliveryEstimate,
  onCheckout,
  onViewCart
}) {
  if (!open) return null;
  const discountTotal = getFirstOrderDiscount(firstOrderDiscount, total);

  return (
    <aside className="cartDrawer" aria-label="Shopping cart">
      <div className="cartHeader">
        <h2>Your Cart</h2>
        <button className="iconButton" type="button" onClick={onClose} aria-label="Close cart">
          <X size={18} />
        </button>
      </div>
          <div className="cartItems">
            {cart.length === 0 ? (
              <p className="mutedText">Your cart is empty.</p>
            ) : (
              cart.map((item) => (
                <div className="cartLine" key={item.key}>
                  <button className="cartProductImage" type="button" onClick={() => onViewProduct(item.product)}><img src={productImage(item.product)} alt={item.product.name} /></button>
                  <div className="cartProductDetails" role="button" tabIndex="0" onClick={() => onViewProduct(item.product)} onKeyDown={(event) => { if (event.key === "Enter") onViewProduct(item.product); }}>
                    <strong>{item.product.name}</strong>
                    <small>{money(cartUnitPrice(item))}{item.variant?.sku ? ` · ${Object.values(item.variant.attributes || {}).join(" / ")}` : ""}</small>
                  </div>
                  <div className="quantityStepper">
                    <button type="button" disabled={item.quantity <= 1} onClick={() => onUpdate(item.key, Math.max(1, item.quantity - 1))}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onUpdate(item.key, item.quantity + 1)}><Plus size={14} /></button>
                  </div>
                  <button className="removeCartItem iconOnly" type="button" onClick={() => onRemove(item.key)} aria-label={`Remove ${item.product.name}`}><Trash2 size={17} /></button>
                </div>
              ))
            )}
          </div>
          {cart.length === 0 ? <div className="cartSummary"><div><span>Subtotal</span><strong>{money(0)}</strong></div><div><span>Shipping</span><strong>{money(0)}</strong></div><div><span>Total</span><strong>{money(0)}</strong></div><button className="heroPrimary" type="button" onClick={onClose}>Continue Shopping</button></div> : <div className="cartSummary">
            <div><span>Subtotal</span><strong>{money(total)}</strong></div>
            {discountTotal > 0 && <div><span>First order discount</span><strong>-{money(discountTotal)}</strong></div>}
            <div><span>Shipping</span><strong>{shippingCost === 0 ? "Free" : money(shippingCost)}</strong></div>
            <div><span>Total</span><strong>{money(total + shippingCost - discountTotal)}</strong></div>
            <div className="checkoutTrust">
              <span><ShieldCheck size={15} /> Encrypted checkout</span>
              <span><WalletCards size={15} /> Razorpay supported</span>
            </div>
            <button className="heroPrimary" type="button" onClick={onCheckout}>
              Checkout
            </button>
            <button className="heroSecondary" type="button" onClick={onViewCart}>
              View Cart
            </button>
          </div>}
    </aside>
  );
}

function ContactPage({ details, customer }) {
  const [form, setForm] = useState({ name: customer?.name || "", email: customer?.email || "", mobile: customer?.phone || "", subject: "", message: "" });
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSubmitting(true); setStatus(""); try { const result = await api.submitContactMessage(form); setStatus(result.message); setForm((current) => ({ ...current, subject: "", message: "" })); } catch (error) { setStatus(error.message); } finally { setSubmitting(false); } };
  const address = [details.address, details.city, details.state, details.pincode].filter(Boolean).join(", ");
  return <section className="contactPage shopSection">
    <header className="contactHero"><span className="eyebrow">We’re here to help</span><h1>Contact Us</h1><p>Questions about a product, an order, or shopping with us? Send a message and our team will get back to you.</p></header>
    <div className="contactLayout">
      <aside className="contactDetailsCard">
        <span className="eyebrow">Store details</span><h2>Let’s start a conversation</h2>
        {address && <div className="contactDetail"><MapPin size={21} /><span><strong>Visit us</strong><small>{address}</small></span></div>}
        {details.email && <a className="contactDetail" href={`mailto:${details.email}`}><Mail size={21} /><span><strong>Email</strong><small>{details.email}</small></span></a>}
        {(details.mobile || details.phone) && <a className="contactDetail" href={`tel:${details.mobile || details.phone}`}><Phone size={21} /><span><strong>Call us</strong><small>{[details.mobile, details.phone].filter(Boolean).join(" / ")}</small></span></a>}
        {details.googleMapUrl && <a className="heroSecondary contactMapLink" href={details.googleMapUrl} target="_blank" rel="noreferrer"><MapPin size={17} /> Open in Google Maps</a>}
      </aside>
      <form className="contactForm" onSubmit={submit}><div><span className="eyebrow">Send a message</span><h2>How can we help?</h2></div><div className="formGrid"><label><span>Name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span>Email</span><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span>Mobile</span><input value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} /></label><label><span>Subject</span><input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label></div><label><span>Message</span><textarea rows="7" required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us how we can help..." /></label>{status && <p className="authStatus" role="status">{status}</p>}<button className="heroPrimary" disabled={submitting}><Send size={17} /> {submitting ? "Sending…" : "Send Message"}</button></form>
    </div>
    {details.googleMapUrl && <div className="contactMapPanel"><div><span className="eyebrow">Find us</span><h2>Our location</h2><p>{address}</p></div><a href={details.googleMapUrl} target="_blank" rel="noreferrer">View location on Google Maps <ChevronRight size={16} /></a></div>}
  </section>;
}

function ShopFooter({ settings = {}, onAdminLogin }) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const subscribe = async (event) => {
    event.preventDefault();
    setNewsletterSubmitting(true);
    setNewsletterStatus("");
    try {
      const result = await api.subscribeNewsletter(newsletterEmail);
      setNewsletterStatus(result.message);
      setNewsletterEmail("");
    } catch (error) { setNewsletterStatus(error.message); }
    finally { setNewsletterSubmitting(false); }
  };
  const footerPages = settings.pages?.filter((page) => page.isActive && ["footer", "both"].includes(page.menu)) || [];
  const footerColumns = settings.footerColumns?.length ? [...settings.footerColumns].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) : [
    { title: "Company", type: "pages", pageIds: footerPages.map((page) => String(page._id || page.slug)) },
    { title: "My Account", type: "links", links: [{ label: "Orders", url: "#support" }, { label: "Wishlist", url: "#support" }, { label: "Sign In", url: "#support" }] },
    { title: "Customer Service", type: "links", links: [{ label: "Shipping Policy", url: "#support" }, { label: "Returns", url: "#support" }, { label: "Secure Payment", url: "#support" }] }
  ];
  const programLinks = [{ label: "Partner Program", url: "#/partner" }, { label: "Seller Program", url: "#/seller" }];

  return (
    <footer className="shopFooter" id="support">
      <div className="footerNewsletter">
        <span>
          <strong>Subscribe to our newsletter</strong>
          <small>Get new arrivals, offers, and style notes in your inbox.</small>
        </span>
        <div className="newsletterWrap"><form className="newsletter" onSubmit={subscribe}>
          <input type="email" required value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="Email address" aria-label="Newsletter email" />
          <button disabled={newsletterSubmitting}>{newsletterSubmitting ? "Joining…" : "Join"}</button>
        </form>{newsletterStatus && <small role="status">{newsletterStatus}</small>}</div>
      </div>
      <div className="footerMain">
        <div className="footerBrand">
          <strong className="footerLogoText">{settings.shopName || "HRSBasket"}</strong>
          <p>{settings.address || "Modern ecommerce storefront connected to the same product catalog your admin team manages."}</p>
          <p>{[settings.email, settings.phone].filter(Boolean).join(" / ")}</p>
          <div className="footerSocials" aria-label="Social links">
            <a href="#support">Fb</a>
            <a href="#support">Tw</a>
            <a href="#support">In</a>
            <a href="#support">Be</a>
          </div>
        </div>
        {footerColumns.map((column, index) => <div key={column._id || index}><span>{column.title || "Menu"}</span>{column.type === "text" && <div dangerouslySetInnerHTML={{ __html: column.text }} />}{column.type === "links" && (column.links || []).map((link, linkIndex) => <a key={linkIndex} href={link.url || "#"}>{link.label}</a>)}{column.type === "pages" && (column.pageIds || []).map((id) => footerPages.find((page) => String(page._id || page.slug) === String(id))).filter(Boolean).map((page) => <a key={page._id || page.slug} href={`#/page/${page.slug}`}>{page.title}</a>)}</div>)}
        <div><span>Programs</span>{programLinks.map((link) => <a key={link.url} href={link.url}>{link.label}</a>)}<button className="footerLinkButton" type="button" onClick={onAdminLogin}>Admin</button></div>
      </div>
      <div className="footerBottom">
        <small>{settings.copyrightText || "Copyright 2026 HRSBasket. All rights reserved."}</small>
        <small>Privacy Policy / Terms & Conditions</small>
      </div>
    </footer>
  );
}
