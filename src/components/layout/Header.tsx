import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import {
  ShoppingBag,
  Heart,
  Search,
  Menu,
  X,
  Phone,
  MessageCircle,
  ShieldCheck,
  User as UserIcon,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Header: React.FC = () => {
  const { cartCount, cartGrandTotal, wishlist, settings, currentUser, products } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/shop", search: { q: searchQuery.trim() } });
      setSearchFocused(false);
      setMobileMenuOpen(false);
    }
  };

  const filteredSuggestions = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.nameHindi.includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md shadow-xs transition-all">
      {/* Top Heritage & Trust Bar */}
      <div className="bg-primary text-primary-foreground text-xs py-1.5 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="font-serif tracking-wider text-amber-300 font-medium whitespace-nowrap">
              بِسْمِ ٱللّٰهِ
            </span>
            <span className="text-primary-foreground/40">•</span>
            <span className="truncate text-emerald-100 font-medium">
              100% शुद्ध आयुर्वेदिक व यूनानी • COD उपलब्ध
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={formatWhatsAppUrl(
                settings.whatsapp,
                "السلام علیکم Hakeem Ji, I want consultation regarding herbal products."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-200 hover:text-white transition-colors font-medium whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500 shrink-0" />
              <span className="hidden xs:inline">हेल्पलाइन:</span> +91 {settings.whatsapp}
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-800 to-primary flex items-center justify-center text-amber-300 shadow-md border border-amber-400/30 group-hover:scale-105 transition-transform shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-serif text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-primary leading-tight flex items-center gap-1 sm:gap-1.5 truncate">
              Shifa A Hayat
              <span className="text-[9px] sm:text-[10px] font-sans px-1 sm:px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 font-semibold border border-amber-400/30 shrink-0">
                हर्बल
              </span>
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium tracking-wide truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">
              हकीम इनायत अहमदी (पालनपुर)
            </span>
          </div>
        </Link>

        {/* Desktop & Tablet Search Bar */}
        <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md relative mx-2 lg:mx-4">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <Input
              type="text"
              placeholder="सर्च करें: ज़ाफरानी, तेल, दर्द..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="w-full pl-9 pr-9 py-2 bg-secondary/50 border-border/80 focus:bg-background rounded-full text-xs sm:text-sm h-9 sm:h-10"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Quick Search Suggestions Dropdown */}
          {searchFocused && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl p-2 z-50">
              <div className="text-[11px] font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                Matching Products
              </div>
              {filteredSuggestions.map((product) => (
                <Link
                  key={product.id}
                  to="/product/$id"
                  params={{ id: product.id }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/70 transition-colors"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    onError={(e) => {
                      if (product.posterImage && e.currentTarget.src !== product.posterImage) {
                        e.currentTarget.src = product.posterImage;
                      }
                    }}
                    className="w-9 h-9 rounded object-contain p-0.5 bg-stone-50 dark:bg-stone-900 border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{product.nameHindi}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">₹{product.price}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* WhatsApp Direct Consult Button (Large Tablet & Desktop) */}
          <a
            href={formatWhatsAppUrl(
              settings.whatsapp,
              "السلام علیکم Hakim Ji, I need guidance for a health problem."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600/20 border border-emerald-600/30 transition-colors min-h-[40px]"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>हकीम जी से सलाह</span>
          </a>

          {/* Wishlist Link */}
          <Link
            to="/account"
            search={{ tab: "wishlist" }}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary text-foreground relative transition-colors"
            title="विशलिस्ट (Wishlist)"
            aria-label={`विशलिस्ट: ${wishlist.length} सहेजे गए उत्पाद (Wishlist with ${wishlist.length} items)`}
          >
            <Heart className="w-5 h-5 text-muted-foreground hover:text-red-500 transition-colors" />
            {wishlist.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* Cart Drawer / Page Link */}
          <Link
            to="/cart"
            className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-sm transition-colors border border-primary/20 min-w-[44px] justify-center"
            aria-label={`Shopping cart with ${cartCount} items`}
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 bg-amber-600 text-white rounded-full text-[10px] font-bold px-1.5 min-w-4 h-4 flex items-center justify-center text-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-xs font-bold ml-1">Cart</span>
          </Link>

          {/* Account / Admin Link */}
          <Link
            to="/admin"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border min-h-[40px]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            <span>Admin</span>
          </Link>

          {/* Mobile & Tablet Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-foreground w-10 h-10 flex items-center justify-center rounded-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile-only Search Bar (Phones < 768px) */}
      <div className="md:hidden px-3 pb-2.5 pt-0">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Input
            type="text"
            placeholder="उत्पाद खोजें (ज़ाफरानी गोल्ड, तेल, दर्द...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-secondary/60 border-border/80 rounded-xl text-xs sm:text-sm h-10"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search query"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden lg:block border-t border-border/40 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm font-medium overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-4 xl:gap-7 py-2.5 whitespace-nowrap">
            <Link
              to="/"
              className="text-foreground hover:text-primary transition-colors font-medium"
              activeProps={{ className: "text-primary font-bold" }}
            >
              होम (Home)
            </Link>
            <Link
              to="/shop"
              className="text-foreground hover:text-primary transition-colors font-medium"
              activeProps={{ className: "text-primary font-bold" }}
            >
              सभी 21 उत्पाद (All Products)
            </Link>
            <Link
              to="/shop"
              search={{ category: "mens-wellness" }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              मर्दाना कमजोरी व ताकत
            </Link>
            <Link
              to="/shop"
              search={{ category: "digestive-care" }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              पेट, गैस व कब्ज
            </Link>
            <Link
              to="/shop"
              search={{ category: "joint-pain" }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              कमर व जोड़ों का दर्द
            </Link>
            <Link
              to="/shop"
              search={{ category: "classical-tonics" }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              शास्त्रीय अर्क व माजून
            </Link>
            <Link
              to="/about"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              हकीम जी का परिचय (About)
            </Link>
            <Link
              to="/contact"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              संपर्क (Contact)
            </Link>
          </div>

          <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
              <Phone className="w-3 h-3" /> ऑर्डर हेल्पलाइन: +91 {settings.phone}
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Navigation with Backdrop Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-0 sm:p-4">
          <div
            className="fixed inset-0"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-background border border-border rounded-t-3xl sm:rounded-3xl max-w-lg w-full mx-auto max-h-[85vh] overflow-y-auto px-4 pt-4 pb-8 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary text-amber-300 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-foreground">Shifa A Hayat</h3>
                  <p className="text-[10px] text-muted-foreground">नेविगेशन एवं श्रेणियां</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col space-y-1 text-sm font-medium">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-foreground flex items-center justify-between"
              >
                <span>होम (Home)</span>
                <span className="text-xs text-muted-foreground">→</span>
              </Link>
              <Link
                to="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-foreground font-semibold flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
              >
                <span>सभी 21 उत्पाद देखें (Shop All)</span>
                <span className="text-xs">→</span>
              </Link>
              <Link
                to="/shop"
                search={{ category: "mens-wellness" }}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-stone-700 dark:text-stone-300 flex items-center justify-between text-xs"
              >
                <span>पुरुष स्वास्थ्य एवं मर्दाना ताकत</span>
                <span className="text-muted-foreground">→</span>
              </Link>
              <Link
                to="/shop"
                search={{ category: "digestive-care" }}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-stone-700 dark:text-stone-300 flex items-center justify-between text-xs"
              >
                <span>पेट, गैस, कब्ज व पाचन</span>
                <span className="text-muted-foreground">→</span>
              </Link>
              <Link
                to="/shop"
                search={{ category: "joint-pain" }}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-stone-700 dark:text-stone-300 flex items-center justify-between text-xs"
              >
                <span>कमर, साइटिका व जोड़ों का दर्द</span>
                <span className="text-muted-foreground">→</span>
              </Link>
              <Link
                to="/shop"
                search={{ category: "classical-tonics" }}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-stone-700 dark:text-stone-300 flex items-center justify-between text-xs"
              >
                <span>शास्त्रीय अर्क व टॉनिक (आबे हयात ₹250)</span>
                <span className="text-muted-foreground">→</span>
              </Link>
              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-foreground flex items-center justify-between"
              >
                <span>शॉपिंग कार्ट ({cartCount} सामग्री)</span>
                <span className="text-xs text-primary font-bold">₹{cartGrandTotal}</span>
              </Link>
              <Link
                to="/account"
                search={{ tab: "wishlist" }}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-foreground flex items-center justify-between"
              >
                <span>विशलिस्ट ({wishlist.length} सहेजे गए)</span>
                <span className="text-xs text-rose-500 font-semibold">{wishlist.length}</span>
              </Link>
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-foreground flex items-center justify-between"
              >
                <span>माय अकाउंट व ऑर्डर्स (My Account)</span>
                <span className="text-xs text-muted-foreground">→</span>
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-foreground flex items-center justify-between"
              >
                <span>हकीम जी का परिचय (About)</span>
                <span className="text-xs text-muted-foreground">→</span>
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-secondary text-foreground flex items-center justify-between"
              >
                <span>संपर्क व परामर्श (Contact)</span>
                <span className="text-xs text-muted-foreground">→</span>
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold border border-amber-400/30 flex items-center justify-between"
              >
                <span>एडमिन डैशबोर्ड (Admin Portal)</span>
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Consultation Call on Mobile */}
            <div className="pt-3 border-t border-border flex flex-col gap-2.5">
              <a
                href={formatWhatsAppUrl(
                  settings.whatsapp,
                  "السلام علیکم Hakim Inayat Ji, I want consultation regarding products."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp पर सीधे बात करें (+91 {settings.whatsapp})</span>
              </a>
              <a
                href={`tel:${settings.phone}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-primary text-primary font-semibold text-xs transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>कॉल करें: +91 {settings.phone}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
