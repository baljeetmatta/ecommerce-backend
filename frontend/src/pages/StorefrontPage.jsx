import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Heart,
  LockKeyhole,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, customerAuthStore } from "../services/api.js";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const productImage = (product) =>
  product.mainImage ||
  product.media?.find((item) => item.type === "image")?.url ||
  templateProductImages[Math.abs(String(product._id || product.sku || product.name || "1").length) % templateProductImages.length];

const brands = ["CommerceOps", "Northline", "Casa Roastry", "TrailForge"];
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
  const seed = product.sku || product.name || "";
  if (seed.includes("TEE")) return "CommerceOps";
  if (seed.includes("HOME")) return "Casa Roastry";
  if (seed.includes("BAG")) return "TrailForge";
  return "Northline";
};

const getShippingCost = (total, checkout) => {
  if (checkout.fulfillment === "pickup") return 0;
  if (total >= 75) return 0;
  if (checkout.postalCode.trim().length >= 5) return 6.5;
  return 8;
};

const getConfiguredShipping = (rules, total, cart) => {
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
  if (checkout.fulfillment === "pickup") return "Ready for Click & Collect tomorrow";
  if (checkout.postalCode.trim().length >= 5) return "Estimated delivery in 2-4 business days";
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

export default function StorefrontPage({ products, featuredProducts, categories, banner, heroItems = [], contentSections = [], firstOrderDiscount = null, blogPosts = [], settings = {}, paymentMethods = [], shippingRules = [], onAdminLogin }) {
  const [route, setRoute] = useState(() => window.location.hash || "#/");
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
  const [savedItems, setSavedItems] = useState([]);
  const [cartMessage, setCartMessage] = useState("");
  const [customer, setCustomer] = useState(customerAuthStore.customer);
  const [checkoutStep, setCheckoutStep] = useState("account");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [orderId, setOrderId] = useState("");
  const [filters, setFilters] = useState({
    brands: [],
    availability: [],
    ratings: [],
    price: "all",
    sort: "featured"
  });
  const [checkout, setCheckout] = useState({
    email: "",
    card: "",
    name: "",
    address: "",
    postalCode: "",
    billingAddress: "",
    shippingAddress: "",
    sameAsBilling: true,
    accountMode: "login",
    password: "",
    fulfillment: "ship",
    paymentMethod: "card"
  });

  useEffect(() => {
    const syncRoute = () => {
      setRoute(window.location.hash || "#/");
      setComponentLoading(true);
    };
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setComponentLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, [route, products, featuredProducts, categories]);

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
    if (!cartMessage) return undefined;
    const timer = window.setTimeout(() => setCartMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [cartMessage]);

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

  const filteredProducts = useMemo(() => {
    const search = query.toLowerCase();
    const filtered = products.filter((product) => {
      const categoryId = typeof product.category === "string" ? product.category : product.category?._id;
      const brand = getProductBrand(product);
      const categoryMatch = selectedCategory === "all" || categoryId === selectedCategory;
      const textMatch = typoScore([product.name, product.shortDescription, product.category?.name, product.tags?.join(" ")].join(" "), search);
      const price = Number(product.offerPrice || product.price);
      const priceMatch =
        filters.price === "all" ||
        (filters.price === "under50" && price < 50) ||
        (filters.price === "50to100" && price >= 50 && price <= 100) ||
        (filters.price === "over100" && price > 100);
      const stockMatch =
        filters.availability.length === 0 ||
        (filters.availability.includes("in-stock") && (!product.isStockManageable || product.stock > 0)) ||
        (filters.availability.includes("low-stock") && product.isStockManageable && product.stock > 0 && product.stock <= 10);
      const ratingMatch = filters.ratings.length === 0 || filters.ratings.includes("4");
      const brandMatch = filters.brands.length === 0 || filters.brands.includes(brand);

      return categoryMatch && textMatch && priceMatch && stockMatch && ratingMatch && brandMatch;
    });

    return [...filtered].sort((a, b) => {
      if (filters.sort === "price-low") return Number(a.offerPrice || a.price) - Number(b.offerPrice || b.price);
      if (filters.sort === "price-high") return Number(b.offerPrice || b.price) - Number(a.offerPrice || a.price);
      if (filters.sort === "newest") return String(b.createdAt || b._id).localeCompare(String(a.createdAt || a._id));
      return 0;
    });
  }, [products, query, selectedCategory, filters]);

  const heroProduct = featuredProducts[0] || products[0];
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
  const isProductsRoute = route === "#/products";
  const isProductRoute = Boolean(productId);
  const isCheckoutRoute = route === "#/checkout";
  const isCartRoute = route === "#/cart";
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.offerPrice || item.product.price) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shippingCost = getShippingCost(cartTotal, checkout);
  const configuredShipping = getConfiguredShipping(shippingRules, cartTotal, cart);
  const displayShippingCost = shippingRules.length ? configuredShipping.amount : shippingCost;
  const deliveryEstimate = getDeliveryEstimate(checkout);
  const emailInvalid = checkout.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.email);
  const cardInvalid = checkout.card.length > 0 && checkout.card.replace(/\s/g, "").length < 12;

  const navigate = (nextRoute) => {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
    setMobileMenuOpen(false);
    setMegaOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToLink = (linkUrl = "#/products") => {
    if (linkUrl.startsWith("#/")) navigate(linkUrl);
    else window.location.href = linkUrl;
  };

  const renderHomeSection = (section, index) => {
    if (section.type === "shipping_info") return <TemplateInfoBlock key={section._id || section.type} items={settings.benefitItems} />;
    if (section.type === "browse_collections") return <CategoryImageShowcase key={section._id || section.type} categories={categories} onNavigate={navigate} setSelectedCategory={setSelectedCategory} />;
    if (section.type === "seasonal_banner") return <ContentSections key={section._id || section.type} sections={sectionsFor("home_before_new_arrivals")} />;
    if (section.type === "new_arrivals") {
      return (
        <section className="shopSection" id="featured" key={section._id || section.type}>
          <div className="shopSectionHeader templateSectionHeader">
            <div>
              <span className="eyebrow">Fresh collection</span>
              <h2>{section.title || "New Arrivals"}</h2>
              <p>{section.subtitle || "Template-inspired product cards with clean imagery, visible price, and direct cart actions."}</p>
            </div>
            <button className="shopLinkButton" type="button" onClick={() => navigate("#/products")}>View all</button>
          </div>
          <div className="featuredGrid">
            {featuredProducts.slice(0, 3).map((product) => (
              <ProductCard product={product} key={product._id} featured onView={(item) => navigate(`#/product/${encodeURIComponent(item._id)}`)} onAdd={addToCart} />
            ))}
          </div>
        </section>
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
      const key = `${product._id || product.sku || product.name}`;
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

  return (
    <div className="storefront">
      <header className="shopHeader">
        <button className="iconButton shopMenuButton" type="button" aria-label="Open menu" onClick={() => setMobileMenuOpen((open) => !open)}>
          <Menu size={20} />
        </button>
        <button className="shopLogo" type="button" onClick={() => navigate("#/")} aria-label="HS Cart home">
          {settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <span>{(settings.shopName || "HS").slice(0, 2)}</span>}
          <strong>{settings.shopName || "Cart"}</strong>
        </button>
        <nav className={mobileMenuOpen ? "shopNav open" : "shopNav"} aria-label="Primary navigation">
          <button type="button" onClick={() => navigate("#/")}>Home</button>
          <button type="button" className="navMegaTrigger" onClick={() => setMegaOpen((open) => !open)}>
            Shop <ChevronRight size={15} />
          </button>
          <button type="button" onClick={() => navigate("#/products")}>All Products</button>
          <a href="#featured">Featured</a>
          <a href="#support">Support</a>
        </nav>
        <div className="shopActions">
          <button className="shopTextButton customerLoginButton" type="button" onClick={() => setAuthPopupOpen(true)}>
            <UserRound size={18} /> <span>{customer ? customer.name.split(" ")[0] : "Login"}</span>
          </button>
          <button className="shopTextButton adminLoginButton" type="button" onClick={onAdminLogin}>
            <LockKeyhole size={18} /> <span>Admin</span>
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
              {categories.map((category) => (
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
        {!componentLoading && !isProductsRoute && !isProductRoute && !isCheckoutRoute && !isCartRoute && (
          <>
        <section className="shopHero">
          <div className="heroCopy">
            <span className="eyebrow">Modern collection</span>
            <h1>{heroSlide?.title || "Fresh arrivals for everyday living"}</h1>
            <p>{heroSlide?.subtitle || "Shop thoughtfully selected products with clear stock status, trusted checkout, and mobile-first navigation."}</p>
            <div className="heroActions">
              <button className="heroPrimary" type="button" onClick={() => navigate("#/products")}>Shop Products</button>
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
            <img loading="eager" src={heroSlide?.imageUrl || "/images/e-commerce/home/bg.png"} alt={heroSlide?.title || heroProduct?.name || "Featured products"} />
            {heroProduct && (
              <div className="heroProduct">
                <span>Featured</span>
                <strong>{heroProduct.name}</strong>
                <small>{money(heroProduct.offerPrice || heroProduct.price)}</small>
              </div>
            )}
          </div>
        </section>

        {homeSections.map(renderHomeSection)}
          </>
        )}

        {!componentLoading && isProductsRoute && (
        <section className="shopSection productBrowser" id="products">
          <aside className="filterPanel" aria-label="Product filters">
            <div className="breadcrumb">Home <ChevronRight size={14} /> Store <ChevronRight size={14} /> Products</div>
            <FilterGroup title="Brand" items={brands} selected={filters.brands} onToggle={(value) => toggleFilter("brands", value)} />
            <FilterGroup
              title="Availability"
              items={[
                ["in-stock", "In stock"],
                ["low-stock", "Low stock"]
              ]}
              selected={filters.availability}
              onToggle={(value) => toggleFilter("availability", value)}
            />
            <FilterGroup title="Ratings" items={[["4", "4 stars and up"]]} selected={filters.ratings} onToggle={(value) => toggleFilter("ratings", value)} />
            <label className="filterSelect">
              <span>Price</span>
              <select value={filters.price} onChange={(event) => setFilters((current) => ({ ...current, price: event.target.value }))}>
                <option value="all">All prices</option>
                <option value="under50">Under $50</option>
                <option value="50to100">$50 to $100</option>
                <option value="over100">Over $100</option>
              </select>
            </label>
          </aside>
          <div>
            <div className="shopSectionHeader productHeader">
              <div>
                <span className="eyebrow">Catalog</span>
                <h2>All Products</h2>
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
            onCheckout={() => navigate("#/checkout")}
            onBack={() => navigate("#/products")}
          />
        )}

        {!componentLoading && isCheckoutRoute && (
          <CheckoutPage
            cart={cart}
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
            deliveryEstimate={deliveryEstimate}
            emailInvalid={emailInvalid}
            cardInvalid={cardInvalid}
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
          />
        )}

        {!componentLoading && isProductRoute && !routedProduct && (
          <section className="shopSection emptyRoute">
            <h2>Product not found</h2>
            <p>The product may have moved or is no longer available.</p>
            <button className="heroPrimary" type="button" onClick={() => navigate("#/products")}>Back to Products</button>
          </section>
        )}

      </main>

      <ShopFooter settings={settings} />

      {cartMessage && <div className="cartToast" role="status">{cartMessage}</div>}

      {authPopupOpen && (
        <CustomerAuthModal
          authMode={authMode}
          setAuthMode={setAuthMode}
          customer={customer}
          setCustomer={setCustomer}
          onClose={() => setAuthPopupOpen(false)}
        />
      )}

      <CartDrawer
        open={cartOpen}
        cart={cart}
        total={cartTotal}
        onClose={() => setCartOpen(false)}
        onUpdate={updateCart}
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

function CategoryImageShowcase({ categories, onNavigate, setSelectedCategory }) {
  const visibleCategories = categories.filter((category) => category.isActive !== false).slice(0, 6);
  if (visibleCategories.length === 0) return <TemplateCategoryShowcase onNavigate={onNavigate} />;

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
            <img loading="lazy" src={category.imageUrl || "/images/e-commerce/home/product4.png"} alt={category.name} />
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
        <h3>{product.name}</h3>
        <p>{product.shortDescription}</p>
        <div className="ratingRow" aria-label="Rated 4.8 out of 5">
          <Star size={15} fill="currentColor" />
          <strong>4.8</strong>
          <small>128 reviews</small>
        </div>
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

function ProductDetailPage({ product, onBack, onAdd, onBuy, onSave, saved, contentSections = [] }) {
  const [quantity, setQuantity] = useState(1);
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
  const lowStock = product.isStockManageable && product.stock > 0 && product.stock <= 10;
  const variant = {};
  const unitPrice = Number(product.offerPrice || product.price);
  const subtotal = unitPrice * quantity;

  return (
    <section className="shopSection productDetailPage flatProductDetail">
      <button className="shopLinkButton backButton" type="button" onClick={onBack}>
        Back to Products
      </button>
      <div className="flatProductTop">
        <div className="flatGallery">
          <div className="flatMainImage zoomFrame">
            <img src={activeImage} alt={product.name} />
            <span>Hover to zoom</span>
          </div>
          <div className="flatThumbRail">
            {gallery.slice(0, 4).map((item) => (
              <button className={activeImage === item.url ? "active" : ""} key={item.url} type="button" onClick={() => setActiveImage(item.url)}>
                <img src={item.url} alt={item.alt || product.name} />
              </button>
            ))}
            {product.videoUrl && (
              <button type="button" className="videoThumb">
                Video
              </button>
            )}
          </div>
        </div>
        <div className="flatProductInfo">
          <div className="breadcrumb">Home <ChevronRight size={14} /> {product.category?.name || "Product"} <ChevronRight size={14} /> {product.name}</div>
          <span className="brandLine">{product.category?.name || "Product"}</span>
          <h1>{product.name}</h1>
          <div className="ratingRow">
            {[1, 2, 3, 4, 5].map((item) => (
              <Star key={item} size={17} fill="currentColor" />
            ))}
            <a href="#product-reviews">3 reviews</a>
          </div>
          <p>{product.shortDescription}</p>
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
            <button className="heroSecondary detailAdd" type="button" onClick={() => onAdd(product, variant, quantity)}>
              <ShoppingBag size={18} /> Add to Cart
            </button>
            <button className="heroPrimary detailAdd" type="button" onClick={() => onBuy(product, variant, quantity)}>
              Buy Now
            </button>
          </div>
          <button className={saved ? "shopLinkButton savedAction" : "shopLinkButton"} type="button" onClick={() => onSave(product)}>
            <Heart size={18} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved for Later" : "Add to Wishlist"}
          </button>
          <div className="flatDetailMeta">
            <span><ShieldCheck size={16} /> Secure payment</span>
            <span><PackageCheck size={16} /> 30-day returns</span>
            <span><Truck size={16} /> Ships in 24 hours</span>
          </div>
        </div>
      </div>
      <ContentSections sections={contentSections} />
      <FlatReviews product={product} />
      <section className="flatAlsoLike">
        <h2>You may also like:</h2>
        <div>
          {templateProductImages.slice(1, 5).map((image, index) => (
            <article key={image}>
              <img src={image} alt="" />
              <span>{["Cozy Chair", "Minimal Lamp", "Soft Cushion", "Dining Set"][index]}</span>
              <strong>{money(unitPrice + (index + 1) * 12)}</strong>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function FlatReviews({ product }) {
  const reviews = [
    {
      name: "Annette Black",
      date: "2026-06-18",
      image: "/images/e-commerce/details/person1.jpg",
      text: `${product.name} arrived quickly and the finish looks exactly like the product photos.`
    },
    {
      name: "Ralph Edwards",
      date: "2026-06-12",
      image: "/images/e-commerce/details/person2.jpg",
      text: "Great build quality, clean packaging, and the checkout updates were easy to follow."
    },
    {
      name: "Jenny Wilson",
      date: "2026-06-02",
      image: "/images/e-commerce/details/person3.jpg",
      text: "The product feels premium for daily use. I would happily order another color."
    }
  ];

  return (
    <section className="flatReviews" id="product-reviews">
      <div className="flatReviewHeader">
        <h2>Reviews:</h2>
        <button type="button" className="shopLinkButton">+ Leave Feedback</button>
      </div>
      {reviews.map((review) => (
        <article key={review.name}>
          <img src={review.image} alt="" />
          <div>
            <header>
              <strong>{review.name}</strong>
              <span>{review.date}</span>
            </header>
            <div className="ratingRow">
              {[1, 2, 3, 4, 5].map((item) => (
                <Star key={item} size={16} fill="currentColor" />
              ))}
            </div>
            <p>{review.text}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function CustomerAuthModal({ authMode, setAuthMode, customer, setCustomer, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
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
          ? { name: form.name, email: form.email, password: form.password }
          : { email: form.email, password: form.password };
      const data = authMode === "signup" ? await api.customerRegister(payload) : await api.customerLogin(payload);
      customerAuthStore.token = data.token;
      customerAuthStore.customer = data.customer;
      setCustomer(data.customer);
      setStatus(`Signed in as ${data.customer.name}.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logoutCustomer = () => {
    customerAuthStore.clear();
    setCustomer(null);
    setStatus("Signed out.");
  };

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Customer account">
      <section className="customerAuthModal">
        <button className="modalClose" type="button" onClick={onClose} aria-label="Close login popup">
          <X size={20} />
        </button>
        <div>
          <span className="eyebrow">Customer account</span>
          <h2>{authMode === "signup" ? "Create Account" : "Login to Your Account"}</h2>
          <p>Use your customer account for faster checkout.</p>
        </div>
        {customer && (
          <div className="customerSignedIn">
            <strong>{customer.name}</strong>
            <span>{customer.email}</span>
            <button className="shopLinkButton" type="button" onClick={logoutCustomer}>Sign Out</button>
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
        <form className="customerAuthForm" onSubmit={submitAuth}>
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
          <button className="shopLinkButton" type="button">Reset Password</button>
        </form>
      </section>
    </div>
  );
}

function CheckoutPage({
  cart,
  total,
  checkout,
  setCheckout,
  checkoutStep,
  setCheckoutStep,
  shippingCost,
  firstOrderDiscount,
  deliveryEstimate,
  emailInvalid,
  cardInvalid,
  paymentStatus,
  setPaymentStatus,
  orderId,
  setOrderId,
  shippingRuleId,
  shippingLabel,
  paymentMethods,
  onBack
}) {
  const discountTotal = getFirstOrderDiscount(firstOrderDiscount, total);
  const finalTotal = total + shippingCost - discountTotal;
  const activePaymentMethods = paymentMethods?.length ? paymentMethods : [{ code: "cod", name: "Cash on Delivery", type: "cod" }];
  const selectedPayment = activePaymentMethods.find((method) => method.code === checkout.paymentMethod) || activePaymentMethods[0];
  const needsReference = selectedPayment?.type === "razorpay";
  const canPay = cart.length > 0 && checkout.email && checkout.name && checkout.shippingAddress && !emailInvalid && (!needsReference || !cardInvalid);

  useEffect(() => {
    if (activePaymentMethods.length && !activePaymentMethods.some((method) => method.code === checkout.paymentMethod)) {
      setCheckout({ ...checkout, paymentMethod: activePaymentMethods[0].code });
    }
  }, [paymentMethods]);

  const confirmPayment = async () => {
    setPaymentStatus(selectedPayment.type === "razorpay" ? "Processing Razorpay payment..." : "Placing Cash on Delivery order...");
    try {
      const data = await api.createStorefrontOrder({
        items: cart.map((item) => ({ productId: item.product._id, quantity: item.quantity })),
        checkout: {
          ...checkout,
          shippingAddress: checkout.sameAsBilling ? checkout.billingAddress : checkout.shippingAddress
        },
        paymentMethodCode: selectedPayment.code,
        shippingRuleId,
        paymentReference: checkout.card,
        razorpayPaymentId: selectedPayment.type === "razorpay" ? `pay_${Date.now().toString().slice(-8)}` : undefined
      });
      setOrderId(data.order.orderNumber);
      setPaymentStatus(`${selectedPayment.name} accepted. Order ${data.order.orderNumber} issued.`);
      setCheckoutStep("confirmation");
    } catch (error) {
      setPaymentStatus(error.message);
    }
  };

  return (
    <section className="shopSection checkoutPage">
      <button className="shopLinkButton backButton" type="button" onClick={onBack}>Back to Products</button>
      <div className="checkoutLayout">
        <div className="checkoutMain">
          <div className="checkoutSteps" aria-label="Checkout steps">
            {["account", "address", "payment", "confirmation"].map((step) => (
              <button
                className={checkoutStep === step ? "active" : ""}
                key={step}
                type="button"
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
                <input type="password" value={checkout.password} onChange={(event) => setCheckout({ ...checkout, password: event.target.value })} placeholder="Password" />
              </label>
              <button className="heroPrimary" type="button" onClick={() => setCheckoutStep("address")}>
                Continue
              </button>
            </div>
          )}

          {checkoutStep === "address" && (
            <div className="checkoutPanel">
              <span className="eyebrow">Billing & Shipping</span>
              <h2>Where should we send it?</h2>
              <div className="fulfillmentToggle">
                <button className={checkout.fulfillment === "ship" ? "selected" : ""} type="button" onClick={() => setCheckout({ ...checkout, fulfillment: "ship" })}>
                  <Truck size={16} /> Ship
                </button>
                <button className={checkout.fulfillment === "pickup" ? "selected" : ""} type="button" onClick={() => setCheckout({ ...checkout, fulfillment: "pickup" })}>
                  <PackageCheck size={16} /> Click & Collect
                </button>
              </div>
              <label>
                <span>Name</span>
                <input value={checkout.name} onChange={(event) => setCheckout({ ...checkout, name: event.target.value })} placeholder="Full name" />
              </label>
              <label>
                <span>Billing address</span>
                <input value={checkout.billingAddress} onChange={(event) => setCheckout({ ...checkout, billingAddress: event.target.value })} placeholder="Street, city, ZIP" />
              </label>
              <label className="toggleRow">
                <input
                  type="checkbox"
                  checked={checkout.sameAsBilling}
                  onChange={(event) =>
                    setCheckout({
                      ...checkout,
                      sameAsBilling: event.target.checked,
                      shippingAddress: event.target.checked ? checkout.billingAddress : checkout.shippingAddress
                    })
                  }
                />
                <span>Shipping same as billing</span>
              </label>
              <label>
                <span>Shipping address</span>
                <input
                  value={checkout.sameAsBilling ? checkout.billingAddress : checkout.shippingAddress}
                  onChange={(event) => setCheckout({ ...checkout, shippingAddress: event.target.value, sameAsBilling: false })}
                  placeholder="Street, city, ZIP"
                />
              </label>
              <label>
                <span>ZIP / postal code</span>
                <input value={checkout.postalCode} onChange={(event) => setCheckout({ ...checkout, postalCode: event.target.value })} placeholder="10001" />
                <small>{deliveryEstimate} · Shipping {shippingCost === 0 ? "free" : money(shippingCost)}</small>
              </label>
              <button
                className="heroPrimary"
                type="button"
                onClick={() => {
                  setCheckout({
                    ...checkout,
                    shippingAddress: checkout.sameAsBilling ? checkout.billingAddress : checkout.shippingAddress
                  });
                  setCheckoutStep("payment");
                }}
              >
                Continue to Payment
              </button>
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
                    onClick={() => setCheckout({ ...checkout, paymentMethod: method.code })}
                  >
                    <Icon size={16} /> {method.name}
                  </button>
                  );
                })}
              </div>
              {selectedPayment?.type === "razorpay" && (
                <label>
                  <span>Razorpay reference</span>
                  <input value={checkout.card} onChange={(event) => setCheckout({ ...checkout, card: event.target.value })} placeholder={selectedPayment.razorpay?.keyId || "Razorpay payment reference"} />
                  {cardInvalid && <small>Payment reference is too short.</small>}
                </label>
              )}
              {selectedPayment?.type === "cod" && <p className="paymentStatus">{selectedPayment.instructions || "Pay when your order is delivered."}</p>}
              {paymentStatus && <p className="paymentStatus">{paymentStatus}</p>}
              <button className="heroPrimary" type="button" disabled={!canPay} onClick={confirmPayment}>
                {selectedPayment?.type === "cod" ? `Place order for ${money(finalTotal)}` : `Pay ${money(finalTotal)} with ${selectedPayment?.name}`}
              </button>
            </div>
          )}

          {checkoutStep === "confirmation" && (
            <div className="checkoutPanel confirmationPanel">
              <CheckCircle2 size={42} />
              <h2>Order Confirmed</h2>
              <p>{paymentStatus || "Payment confirmed."}</p>
              <strong>{orderId}</strong>
            </div>
          )}
        </div>

        <aside className="checkoutSummary">
          <h2>Order Summary</h2>
          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div className="summaryLine" key={item.key}>
                <img src={productImage(item.product)} alt={item.product.name} />
                <div>
                  <strong>{item.product.name}</strong>
                  <span>Qty {item.quantity}</span>
                </div>
                <strong>{money(Number(item.product.offerPrice || item.product.price) * item.quantity)}</strong>
              </div>
            ))
          )}
          <div className="cartSummary inlineSummary">
            <div><span>Subtotal</span><strong>{money(total)}</strong></div>
            {discountTotal > 0 && <div><span>First order discount</span><strong>-{money(discountTotal)}</strong></div>}
            <div><span>Shipping</span><strong>{shippingCost === 0 ? "Free" : money(shippingCost)}</strong></div>
            {shippingLabel && <div><span>Rule</span><strong>{shippingLabel}</strong></div>}
            <div><span>Total</span><strong>{money(finalTotal)}</strong></div>
          </div>
        </aside>
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

function CartPage({ cart, total, shippingCost, firstOrderDiscount, deliveryEstimate, onUpdate, onCheckout, onBack }) {
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
                <img src={productImage(item.product)} alt={item.product.name} />
                <div>
                  <strong>{item.product.name}</strong>
                  <small>{money(item.product.offerPrice || item.product.price)}</small>
                </div>
                <div className="quantityStepper">
                  <button type="button" onClick={() => onUpdate(item.key, item.quantity - 1)}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => onUpdate(item.key, item.quantity + 1)}><Plus size={14} /></button>
                </div>
                <strong>{money(Number(item.product.offerPrice || item.product.price) * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <aside className="cartPageSummary">
            <h2>Summary</h2>
            <div className="cartSummary">
              <div><span>Subtotal</span><strong>{money(total)}</strong></div>
              {discountTotal > 0 && <div><span>First order discount</span><strong>-{money(discountTotal)}</strong></div>}
              <div><span>Shipping</span><strong>{shippingCost === 0 ? "Free" : money(shippingCost)}</strong></div>
              <div><span>Delivery</span><strong>{deliveryEstimate}</strong></div>
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
                  <img src={productImage(item.product)} alt={item.product.name} />
                  <div>
                    <strong>{item.product.name}</strong>
                    <small>{money(item.product.offerPrice || item.product.price)}</small>
                  </div>
                  <div className="quantityStepper">
                    <button type="button" onClick={() => onUpdate(item.key, item.quantity - 1)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onUpdate(item.key, item.quantity + 1)}><Plus size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cartSummary">
            <div><span>Subtotal</span><strong>{money(total)}</strong></div>
            {discountTotal > 0 && <div><span>First order discount</span><strong>-{money(discountTotal)}</strong></div>}
            <div><span>Shipping</span><strong>{shippingCost === 0 ? "Free" : money(shippingCost)}</strong></div>
            <div><span>Delivery</span><strong>{deliveryEstimate}</strong></div>
            <div><span>Total</span><strong>{money(total + shippingCost - discountTotal)}</strong></div>
            <div className="checkoutTrust">
              <span><ShieldCheck size={15} /> Encrypted checkout</span>
              <span><WalletCards size={15} /> Razorpay supported</span>
            </div>
            <button className="heroPrimary" type="button" disabled={cart.length === 0} onClick={onCheckout}>
              Checkout
            </button>
            <button className="heroSecondary" type="button" disabled={cart.length === 0} onClick={onViewCart}>
              View Cart
            </button>
          </div>
    </aside>
  );
}

function ShopFooter({ settings = {} }) {
  const footerPages = settings.pages?.filter((page) => page.isActive && ["footer", "both"].includes(page.menu)) || [];

  return (
    <footer className="shopFooter" id="support">
      <div className="footerNewsletter">
        <span>
          <strong>Subscribe to our newsletter</strong>
          <small>Get new arrivals, offers, and style notes in your inbox.</small>
        </span>
        <div className="newsletter">
          <input placeholder="Email address" aria-label="Newsletter email" />
          <button type="button">Join</button>
        </div>
      </div>
      <div className="footerMain">
        <div className="footerBrand">
          <strong className="footerLogoText">{settings.shopName || "HS Cart"}</strong>
          <p>{settings.address || "Modern ecommerce storefront connected to the same product catalog your admin team manages."}</p>
          <p>{[settings.email, settings.phone].filter(Boolean).join(" / ")}</p>
          <div className="footerSocials" aria-label="Social links">
            <a href="#support">Fb</a>
            <a href="#support">Tw</a>
            <a href="#support">In</a>
            <a href="#support">Be</a>
          </div>
        </div>
        <div>
          <span>Company</span>
          {footerPages.map((page) => <a key={page._id || page.slug} href={`#/page/${page.slug}`}>{page.title}</a>)}
          <a href="#featured">New Arrivals</a>
          <a href="#support">Contact</a>
        </div>
        <div>
          <span>My Account</span>
          <a href="#support">Orders</a>
          <a href="#support">Wishlist</a>
          <a href="#support">Sign In</a>
        </div>
        <div>
          <span>Customer Service</span>
          <a href="#support">Shipping Policy</a>
          <a href="#support">Returns</a>
          <a href="#support">Secure Payment</a>
        </div>
      </div>
      <div className="footerBottom">
        <small>Copyright 2026 HS Cart. All rights reserved.</small>
        <small>Privacy Policy / Terms & Conditions</small>
      </div>
    </footer>
  );
}
