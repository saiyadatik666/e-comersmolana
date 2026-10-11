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
  const { cartCount, wishlist, settings, currentUser, products } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/shop", search: { q: searchQuery.trim() } as any });
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
      <div className="bg-primary text-primary-foreground text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-serif tracking-widest text-amber-300 font-medium">
              بِسْمِ ٱللّٰهِ ٱلرَّحْمٰنِ ٱلرَّحِيمِ
            </span>
            <span className="hidden md:inline text-primary-foreground/40">•</span>
            <span className="hidden md:inline font-medium">
              {settings.tagline}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="hidden sm:inline-flex items-center gap-1 text-amber-200">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% शुद्ध जड़ी-बूटी • कैश ऑन डिलीवरी उपलब्ध
            </span>
            <a
              href={formatWhatsAppUrl(
                settings.whatsapp,
                "السلام علیکم Hakeem Ji, I want consultation regarding herbal products."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-200 hover:text-white transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
              <span>WhatsApp: +91 {settings.whatsapp}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-800 to-primary flex items-center justify-center text-amber-300 shadow-md border border-amber-400/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-primary leading-tight flex items-center gap-1.5">
              Shifa A Hayat
              <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 font-semibold border border-amber-400/30">
                हर्बल
              </span>
            </span>
            <span className="text-xs text-muted-foreground font-medium tracking-wide">
              शिफा ए हयात • हकीम इनायत अहमदी (पालनपुर)
            </span>
          </div>
        </Link>

        {/* Desktop Search Bar */}
        <div className="hidden lg:flex flex-1 max-w-md relative mx-4">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <Input
              type="text"
              placeholder="सर्च करें: ज़ाफरानी गोल्ड, हब्बे हवा, हेअर ऑयल, दर्द निवारण..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="w-full pl-10 pr-10 py-2 bg-secondary/50 border-border/80 focus:bg-background rounded-full text-sm"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    className="w-9 h-9 rounded object-cover border"
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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* WhatsApp Direct Consult Button */}
          <a
            href={formatWhatsAppUrl(
              settings.whatsapp,
              "السلام علیکم Hakim Ji, I need guidance for a health problem."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/20 border border-emerald-600/30 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>हकीम जी से सलाह</span>
          </a>

          {/* Wishlist Link */}
          <Link
            to="/account"
            className="p-2 rounded-full hover:bg-secondary text-foreground relative transition-colors"
            title="Wishlist"
          >
            <Heart className="w-5 h-5 text-muted-foreground hover:text-red-500 transition-colors" />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* Cart Drawer / Page Link */}
          <Link
            to="/cart"
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-sm transition-colors border border-primary/20"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-600 text-white rounded-full text-[10px] font-bold px-1.5 py-0.2 min-w-4 text-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline text-xs font-bold">Cart</span>
          </Link>

          {/* Account / Admin Link */}
          <Link
            to="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            <span>Admin</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden lg:block border-t border-border/40 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-7 py-2.5">
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
              सभी उत्पाद (All Products)
            </Link>
            <Link
              to="/shop"
              search={{ category: "mens-wellness" } as any}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              मर्दाना कमजोरी व ताकत
            </Link>
            <Link
              to="/shop"
              search={{ category: "digestive-care" } as any}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              पेट, गैस व कब्ज
            </Link>
            <Link
              to="/shop"
              search={{ category: "joint-pain" } as any}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              कमर व जोड़ों का दर्द
            </Link>
            <Link
              to="/shop"
              search={{ category: "classical-tonics" } as any}
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
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <Phone className="w-3 h-3" /> ऑर्डर हेल्पलाइन: +91 9586037331
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-3">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Input
              type="text"
              placeholder="सर्च करें हर्बल प्रोडक्ट्स..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 bg-secondary/60 rounded-lg text-sm"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          {/* Links */}
          <div className="flex flex-col space-y-2.5 text-sm font-medium">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-secondary text-foreground"
            >
              होम (Home)
            </Link>
            <Link
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-secondary text-foreground"
            >
              सभी 21 उत्पाद (Shop All Products)
            </Link>
            <Link
              to="/shop"
              search={{ category: "mens-wellness" } as any}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-secondary text-muted-foreground"
            >
              पुरुष स्वास्थ्य एवं मर्दाना ताकत
            </Link>
            <Link
              to="/shop"
              search={{ category: "digestive-care" } as any}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-secondary text-muted-foreground"
            >
              पेट, गैस, कब्ज व पाचन
            </Link>
            <Link
              to="/shop"
              search={{ category: "joint-pain" } as any}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-secondary text-muted-foreground"
            >
              कमर, साइटिका व जोड़ों का दर्द
            </Link>
            <Link
              to="/shop"
              search={{ category: "classical-tonics" } as any}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-secondary text-muted-foreground"
            >
              शास्त्रीय अर्क व टॉनिक (आबे हयात ₹250)
            </Link>
            <Link
              to="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-secondary text-foreground"
            >
              माय अकाउंट व ऑर्डर्स (My Account)
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg bg-amber-500/10 text-amber-800 font-semibold border border-amber-400/30"
            >
              एडमिन डैशबोर्ड (Admin Dashboard)
            </Link>
          </div>

          {/* Quick Consultation Call on Mobile */}
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <a
              href={formatWhatsAppUrl(
                settings.whatsapp,
                "السلام علیکم Hakim Inayat Ji, I want consultation regarding products."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-sm"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>WhatsApp पर सीधे बात करें</span>
            </a>
            <a
              href="tel:9586037331"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-primary text-primary font-semibold text-sm"
            >
              <Phone className="w-4 h-4" />
              <span>कॉल करें: +91 9586037331</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
