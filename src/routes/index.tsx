import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/context/StoreContext";
import { CATEGORIES, Product } from "@/data/products";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductPosterModal } from "@/components/product/ProductPosterModal";
import {
  Sparkles,
  ShieldCheck,
  Truck,
  MessageCircle,
  Phone,
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  Leaf,
  Award,
  ChevronRight,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { products, settings } = useStore();
  const [selectedPoster, setSelectedPoster] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const bestsellers = products.filter((p) => p.isBestseller).slice(0, 8);
  const verifiedPricedProducts = products.filter((p) => p.isVerifiedPrice);

  const filteredProducts =
    activeCategory === "all"
      ? products.slice(0, 12)
      : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500/20">
      <Header />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-stone-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-emerald-800/40">
          {/* Subtle Decorative Aura */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fde047_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-800/80 border border-emerald-600/40 text-amber-300 text-xs font-semibold backdrop-blur-xs">
                <Sparkles className="w-4 h-4" />
                <span>हकीम इनायत अहमदी (पालनपुर, गुजरात) के प्रमाणित नुस्खे</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15]">
                कुदरती जड़ी-बूटी से पाएं{" "}
                <span className="text-amber-400 italic">सच्ची शिफा</span> व भरपूर ताकत
              </h1>

              <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0">
                शिफा ए हयात (Shifa A Hayat) पर आपका स्वागत है। हमारे पास मर्दाना ताकत, पेट व पाचन समस्या, जोड़ों व कमर का दर्द, और शास्त्रीय यूनानी अर्क के 100% सुरक्षित और प्राकृतिक नुस्खे उपलब्ध हैं।
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link to="/shop">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto rounded-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-8 shadow-lg shadow-amber-500/20 text-sm"
                  >
                    <span>सभी 21 उत्पाद देखें</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                <a
                  href={`https://wa.me/91${settings.whatsapp}?text=السلام علیکم Hakeem Ji, I want to consult for herbal treatment.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto rounded-full border-emerald-500/60 text-emerald-300 hover:bg-emerald-800/40 font-semibold px-6 text-sm"
                  >
                    <MessageCircle className="w-4 h-4 mr-2 fill-emerald-400 text-emerald-400" />
                    <span>हकीम जी से मुफ्त परामर्श</span>
                  </Button>
                </a>
              </div>

              {/* Verified Trust Stats */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-emerald-800/60">
                <div className="space-y-0.5">
                  <span className="font-serif text-2xl font-bold text-amber-300">21+</span>
                  <p className="text-xs text-stone-400">प्रमाणित नुस्खे</p>
                </div>
                <div className="space-y-0.5">
                  <span className="font-serif text-2xl font-bold text-amber-300">100%</span>
                  <p className="text-xs text-stone-400">शुद्ध जड़ी-बूटी</p>
                </div>
                <div className="space-y-0.5">
                  <span className="font-serif text-2xl font-bold text-amber-300">COD</span>
                  <p className="text-xs text-stone-400">कैश ऑन डिलीवरी</p>
                </div>
                <div className="space-y-0.5">
                  <span className="font-serif text-2xl font-bold text-amber-300">भारत भर</span>
                  <p className="text-xs text-stone-400">कूरियर डिलीवरी</p>
                </div>
              </div>
            </div>

            {/* Right Hero Product Feature Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative max-w-sm w-full bg-stone-900/90 border border-emerald-600/40 rounded-3xl p-4 shadow-2xl backdrop-blur-md">
                <div className="absolute -top-3 left-6">
                  <Badge className="bg-amber-500 text-stone-950 font-bold px-3 py-1 shadow-md">
                    विशेष शास्त्रीय नुस्खा
                  </Badge>
                </div>

                <div className="aspect-4/5 rounded-2xl overflow-hidden mb-4 border border-emerald-700/50 relative group">
                  <img
                    src="/assets/molana/IMG-20261009-WA0003.jpg"
                    alt="Capsule Zafrani Gold"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-3 left-3 right-3 bg-stone-950/80 backdrop-blur-md p-3 rounded-xl border border-stone-800">
                    <p className="text-xs font-semibold text-amber-300">कैप्सूल ज़ाफरानी गोल्ड</p>
                    <p className="text-[11px] text-stone-300">सच्ची मर्दाना ताकत और स्टैमिना का शाही तोहफा</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <div>
                    <span className="text-xs text-stone-400">मूल्य</span>
                    <p className="text-xl font-bold text-amber-400">₹1,450</p>
                  </div>
                  <Link to="/product/$id" params={{ id: "shifa-zafrani-gold" }}>
                    <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      विवरण देखें
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VERIFIED PRICING SPOTLIGHT (₹200 - ₹250 POSTER VERIFIED PRODUCTS) */}
        <section className="py-12 bg-amber-500/5 border-b border-amber-500/20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                  <Flame className="w-4 h-4 text-amber-600 fill-amber-600" />
                  <span>मूल्य प्रमाणित उत्पाद (Verified Poster Pricing)</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                  पोस्टर पर स्पष्ट रूप से प्रमाणित न्यूनतम मूल्य
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                इन उत्पादों के मूल्य मूल प्रचार सामग्री पर मुद्रित हैं। बिना किसी छिपे शुल्क के पूरे भारत में उपलब्ध।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Product 1: Arq Abe Hayat ₹250 */}
              <div className="bg-card border-2 border-amber-500/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-center">
                <img
                  src="/assets/molana/IMG-20261009-WA0013.jpg"
                  alt="Arq Abe Hayat"
                  className="w-24 h-32 object-cover rounded-xl border shrink-0"
                />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Badge className="bg-amber-600 text-white font-bold text-[10px]">
                    कीमत ओन्ली ₹250
                  </Badge>
                  <h3 className="font-serif font-bold text-base text-foreground leading-snug truncate">
                    इर्क आबे हयात (Arq Abe Hayat)
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    हर घर का मसीहा • सर्दी, सिरदर्द, कफ, दांत दर्द व जोड़ों में तुरंत राहत
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="font-bold text-primary text-lg">₹250</span>
                    <Link to="/product/$id" params={{ id: "shifa-arq-abe-hayat" }}>
                      <Button size="sm" variant="outline" className="text-xs rounded-lg">
                        ऑर्डर करें
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Product 2: Tanavai Tel ₹200 */}
              <div className="bg-card border-2 border-amber-500/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-center">
                <img
                  src="/assets/molana/IMG-20261009-WA0021.jpg"
                  alt="Tanavai Tel"
                  className="w-24 h-32 object-cover rounded-xl border shrink-0"
                />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Badge className="bg-amber-600 text-white font-bold text-[10px]">
                    सिर्फ़ ₹200/-
                  </Badge>
                  <h3 className="font-serif font-bold text-base text-foreground leading-snug truncate">
                    तनावई तेल (Tanavai Nabhi Tel)
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    नाभि में डालने का तेल • 72,000 नसों के लिए कुदरत का करिश्मा
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="font-bold text-primary text-lg">₹200</span>
                    <Link to="/product/$id" params={{ id: "shifa-tanavai-tel" }}>
                      <Button size="sm" variant="outline" className="text-xs rounded-lg">
                        ऑर्डर करें
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Product 3: Gas Ki Goliyan ₹199 */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-center">
                <img
                  src="/assets/molana/IMG-20261009-WA0016.jpg"
                  alt="Gas Ki Goliyan"
                  className="w-24 h-32 object-cover rounded-xl border shrink-0"
                />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Badge className="bg-emerald-700 text-white font-semibold text-[10px]">
                    100% आयुर्वेदिक
                  </Badge>
                  <h3 className="font-serif font-bold text-base text-foreground leading-snug truncate">
                    गैस की गोलियां (Gas Tablets)
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    पेट की गैस और अपच का रामबाण इलाज • भोजन के बाद तुरंत हल्कापन
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="font-bold text-primary text-lg">₹199</span>
                    <Link to="/product/$id" params={{ id: "shifa-gas-ki-goliyan" }}>
                      <Button size="sm" variant="outline" className="text-xs rounded-lg">
                        ऑर्डर करें
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* POPULAR CATEGORIES */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">
              प्राकृतिक समाधान
            </span>
            <h2 className="font-serif text-3xl font-bold text-foreground mt-1">
              स्वास्थ्य समस्याओं के अनुसार खोजें
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              अपनी समस्या चुनें और हकीम जी द्वारा तैयार किए गए विशेष नुस्खों का लाभ उठाएं।
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary/70 text-foreground border-border hover:bg-secondary"
                }`}
              >
                {cat.hindi}
              </button>
            ))}
          </div>

          {/* Filtered Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenPoster={(p) => setSelectedPoster(p)}
              />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/shop">
              <Button size="lg" variant="outline" className="rounded-full px-8 font-semibold">
                <span>सभी 21 उत्पाद देखें</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </section>

        {/* HAKEEM INAYAT AHMADI HERITAGE SECTION */}
        <section className="py-16 bg-stone-900 text-stone-100 border-y border-stone-800 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 p-2 bg-stone-950/80 shadow-2xl">
                <img
                  src="/assets/molana/IMG-20261009-WA0023.jpg"
                  alt="Shabab Avar Powder - Inayat Palanpuri"
                  className="rounded-2xl w-full object-cover max-h-[460px]"
                />
                <div className="absolute bottom-5 left-5 right-5 bg-stone-900/95 backdrop-blur-md p-4 rounded-xl border border-stone-700 text-center">
                  <p className="font-serif font-bold text-amber-300 text-base">
                    हकीम इनायत अहमदी (इनायत पालनपुरी)
                  </p>
                  <p className="text-xs text-stone-300 mt-0.5">
                    "आपका दुआग्गो — शिफा खाना आयुर्वेदिक एवं यूनानी सेंटर, पालनपुर (गुजरात)"
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700/50 text-emerald-300 text-xs font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>पारंपरिक यूनानी व आयुर्वेदिक विरासत</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
                नुस्खा वही जो असर दिखाए, बिना किसी साइड इफेक्ट के
              </h2>

              <p className="text-sm text-stone-300 leading-relaxed">
                आज के दौर में बाज़ार रासायनिक गोलियों और अस्थायी असर देने वाली दवाओं से भरा हुआ है, जो शरीर के आंतरिक अंगों (लीवर, गुर्दे, दिल) को कमज़ोर कर देती हैं।
              </p>

              <p className="text-sm text-stone-300 leading-relaxed">
                शिफा ए हयात में हम शुद्ध कश्मीरी ज़ाफरान, सुवर्ण भस्म (Gold), असली शिलाजीत, मुसली और जंगली जड़ी-बूटियों के पारंपरिक अनुपातों से दवाएं तैयार करते हैं। हमारे नुस्खे रोग को जड़ से खत्म करने और शरीर की प्राकृतिक जीवनी शक्ति (कुव्वत-ए-मुदाफिअत) को जगाने के लिए बनाए जाते हैं।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-stone-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>कोई भी हानिकारक स्टेरॉयड या केमिकल नहीं</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>शुद्ध जड़ी-बूटियों का शास्त्रीय मिश्रण</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>व्यक्तिगत परामर्श एवं सही खुराक की सलाह</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>पूरे भारत में सुरक्षित व गोपनीय पार्सल</span>
                </div>
              </div>

              <div className="pt-3">
                <a
                  href={`https://wa.me/91${settings.whatsapp}?text=السلام علیکم Hakeem Ji, I want consultation regarding my health.`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    <span>WhatsApp पर परामर्श लें (+91 {settings.whatsapp})</span>
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">
              संदेह निवारण
            </span>
            <h2 className="font-serif text-3xl font-bold text-foreground mt-1">
              अक्सर पूछे जाने वाले सवाल (FAQ)
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              दवा मंगाने और उपयोग करने से जुड़ी सभी जरूरी जानकारियां।
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="item-1" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                क्या दवाइयों का कोई साइड इफेक्ट होता है?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                बिल्कुल नहीं। शिफा ए हयात की सभी दवाइयां 100% शुद्ध आयुर्वेदिक और यूनानी जड़ी-बूटियों से शास्त्रीय विधि द्वारा बनाई जाती हैं। इनमें कोई भी अंग्रेजी रसायन या स्टेरॉयड नहीं मिलाया जाता।
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                डिलीवरी में कितना समय लगता है और क्या कैश ऑन डिलीवरी उपलब्ध है?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                हां, कैश ऑन डिलीवरी (COD) पूरे भारत में उपलब्ध है। सामान्यतः ऑर्डर पुष्टि के 3 से 6 कार्यदिवसों में पार्सल आपके दिए पते पर पहुंच जाता है।
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                क्या पार्सल की पैकिंग गोपनीय (Discreet) होती है?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                जी हां, आपकी निजता (Privacy) का पूरा ध्यान रखा जाता है। पार्सल के ऊपर केवल सामान्य कुरियर लेबल होता है, किसी भी उत्पाद या बीमारी का नाम बाहर नहीं लिखा होता।
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                दवा लेने का सही तरीका और परहेज़ कैसे पता चलेगा?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                हर उत्पाद के विवरण और पार्सल के साथ खुराक का पूरा पर्चा भेजा जाता है। इसके अलावा आप WhatsApp (+91 9586037331) पर सीधे हकीम जी से अपनी समस्या और परहेज़ की जानकारी ले सकते हैं।
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </main>

      <Footer />

      {/* High-res Poster Inspector Modal */}
      <ProductPosterModal
        product={selectedPoster}
        onClose={() => setSelectedPoster(null)}
      />
    </div>
  );
}
