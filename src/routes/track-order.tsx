import React, { useState, useEffect, useTransition } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import { trackOrderServerFn } from "@/lib/admin-api";
import type { CustomerTrackingResponse, ServerOrderStatus } from "@/server/order-store";
import {
  Truck,
  Search,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  RotateCcw,
  Sparkles,
  Loader2,
  HelpCircle,
  Check,
  XCircle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface TrackOrderSearch {
  orderId?: string | undefined;
  phone?: string | undefined;
}

export const Route = createFileRoute("/track-order")({
  validateSearch: (search: Record<string, unknown>): TrackOrderSearch => {
    const orderId = typeof search["orderId"] === "string" ? search["orderId"] : undefined;
    const phone = typeof search["phone"] === "string" ? search["phone"] : undefined;
    return { orderId, phone };
  },
  head: () => ({
    meta: [
      { title: "ऑर्डर स्थिति ट्रैक करें (Track Order) — Shifa A Hayat" },
      {
        name: "description",
        content:
          "अपने Shifa A Hayat ऑर्डर की वास्तविक स्थिति ट्रैक करें। ऑर्डर संदर्भ आईडी और पंजीकृत मोबाइल नंबर दर्ज कर वास्तविक डिस्पैच और डिलीवरी प्रगति देखें।",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: TrackOrderPage,
});

interface StatusStep {
  key: ServerOrderStatus;
  titleHindi: string;
  subtitleHindi: string;
}

const ORDER_STEPS: StatusStep[] = [
  {
    key: "Order Received",
    titleHindi: "ऑर्डर प्राप्त हुआ",
    subtitleHindi: "वेबसाइट पर दर्ज • समीक्षा प्रतीक्षारत",
  },
  {
    key: "Confirmed",
    titleHindi: "ऑर्डर पुष्टीकृत",
    subtitleHindi: "हकीम जी द्वारा स्वीकृत",
  },
  {
    key: "Processing",
    titleHindi: "तैयार किया जा रहा है",
    subtitleHindi: "शुद्ध हर्बल फार्मूलेशन व पैकेजिंग",
  },
  {
    key: "Shipped",
    titleHindi: "प्रेषित / डिस्पैच",
    subtitleHindi: "डाक / कूरियर सेवा को सुपुर्द",
  },
  {
    key: "Out for Delivery",
    titleHindi: "वितरण हेतु निकला",
    subtitleHindi: "निकटतम केंद्र से आपके पते की ओर",
  },
  {
    key: "Delivered",
    titleHindi: "सफलतापूर्वक सुपुर्द",
    subtitleHindi: "पार्सल ग्राहक तक सुरक्षित पहुंचा",
  },
];

function getStepIndex(status: ServerOrderStatus): number {
  if (status === "Pending Confirmation" || status === "Order Received") return 0;
  if (status === "Confirmed") return 1;
  if (status === "Processing") return 2;
  if (status === "Shipped") return 3;
  if (status === "Out for Delivery") return 4;
  if (status === "Delivered") return 5;
  return -1; // Cancelled
}

function TrackOrderPage() {
  const searchParams = Route.useSearch();
  const { orders: localOrders, settings } = useStore();

  const [orderIdInput, setOrderIdInput] = useState<string>(searchParams.orderId || "");
  const [phoneInput, setPhoneInput] = useState<string>(searchParams.phone || "");
  const [trackingData, setTrackingData] = useState<CustomerTrackingResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  const handleLookup = async (lookupId: string, lookupPhone: string) => {
    const cleanId = (lookupId || "").trim();
    const cleanPhone = (lookupPhone || "").replace(/[^0-9]/g, "");

    if (!cleanId) {
      toast.error("कृपया अपना ऑर्डर संदर्भ आईडी दर्ज करें (उदा: ORD-XXXX-XXXX)");
      setErrorMessage("कृपया अपना ऑर्डर संदर्भ आईडी दर्ज करें।");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("कृपया अपना 10-अंकीय पंजीकृत मोबाइल नंबर दर्ज करें");
      setErrorMessage("सत्यापन हेतु वैध 10-अंकीय मोबाइल नंबर आवश्यक है।");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await trackOrderServerFn({
        data: {
          orderId: cleanId,
          phone: cleanPhone,
        },
      });

      startTransition(() => {
        setTrackingData(result);
        setErrorMessage(null);
      });
      toast.success("ऑर्डर विवरण सफलतापूर्वक प्राप्त हुआ");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "इस ऑर्डर आईडी और मोबाइल नंबर से मेल खाता कोई रिकॉर्ड नहीं मिला।";

      startTransition(() => {
        setTrackingData(null);
        setErrorMessage(
          msg.includes("No matching order") || msg.includes("मेल खाता कोई ऑर्डर नहीं")
            ? "इस ऑर्डर आईडी और मोबाइल नंबर से मेल खाता कोई रिकॉर्ड नहीं मिला। कृपया दोनों विवरण पुनः जांचें अथवा हकीम जी से संपर्क करें।"
            : msg
        );
      });
      toast.error("ऑर्डर रिकॉर्ड नहीं मिला। कृपया विवरण जांचें।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup(orderIdInput, phoneInput);
  };

  // Auto-search if URL has both orderId and phone
  useEffect(() => {
    if (searchParams.orderId && searchParams.phone) {
      setOrderIdInput(searchParams.orderId);
      setPhoneInput(searchParams.phone);
      handleLookup(searchParams.orderId, searchParams.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.orderId, searchParams.phone]);

  const currentStepIdx = trackingData ? getStepIndex(trackingData.orderStatus) : -1;
  const isCancelled = trackingData?.orderStatus === "Cancelled";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-8 sm:space-y-12">
        {/* Header Breadcrumb / Intro */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Truck className="w-3.5 h-3.5" />
            <span>पारदर्शी ग्राहक सेवा एवं ऑर्डर ट्रैकिंग</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            अपने ऑर्डर की स्थिति जानें
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            चेकआउट पर मिला ऑर्डर संदर्भ आईडी (Order ID) और पंजीकृत मोबाइल नंबर दर्ज करें।
            Shifa A Hayat में हम बिना किसी कृत्रिम दावों के शत-प्रतिशत प्रामाणिक प्रगति प्रदर्शित करते हैं।
          </p>
        </div>

        {/* Order Lookup Form Box */}
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="track-order-id" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span>ऑर्डर आईडी (Order ID) *</span>
                </Label>
                <Input
                  id="track-order-id"
                  name="orderId"
                  autoComplete="off"
                  placeholder="उदा: ORD-14285-9302"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value.toUpperCase())}
                  className="bg-secondary/40 text-xs font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="track-phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>पंजीकृत मोबाइल नंबर (10 Digit) *</span>
                </Label>
                <Input
                  id="track-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="उदा: 98250 12345"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="bg-secondary/40 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>सत्यापित व खोजा जा रहा है...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>ऑर्डर स्थिति देखें (Track My Order)</span>
                </>
              )}
            </Button>
          </form>

          {/* Quick-fill helper from local device orders */}
          {localOrders.length > 0 && !trackingData && (
            <div className="pt-4 border-t border-border space-y-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                इस डिवाइस पर हाल ही में दिए गए ऑर्डर्स (त्वरित चयन):
              </span>
              <div className="flex flex-wrap gap-2">
                {localOrders.slice(0, 3).map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => {
                      setOrderIdInput(ord.id);
                      setPhoneInput(ord.customerPhone);
                      handleLookup(ord.id, ord.customerPhone);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors text-left"
                  >
                    <Package className="w-3 h-3 text-primary shrink-0" />
                    <span>#{ord.id}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      (₹{ord.total})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Guarantee Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs text-muted-foreground leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>गोपनीयता सुरक्षा:</strong> ग्राहक की व्यक्तिगत जानकारी व अन्य ग्राहकों के ऑर्डर्स सुरक्षित रखने के लिए ऑर्डर आईडी के साथ संबंधित 10-अंकीय मोबाइल नंबर का मिलान अनिवार्य है।
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="max-w-2xl mx-auto p-4 sm:p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5 text-xs text-rose-900 dark:text-rose-200 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <strong className="font-semibold block text-sm">ऑर्डर जानकारी अनुपलब्ध</strong>
              <p className="leading-relaxed">{errorMessage}</p>
              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href={formatWhatsAppUrl(
                    settings.whatsapp,
                    `السلام علیکم Hakeem Ji, मुझे मेरे ऑर्डर #${orderIdInput || "Unknown"} की जानकारी प्राप्त करने में सहायता चाहिए।`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                  <span>WhatsApp पर हकीम जी से पूछें</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESSFUL TRACKING RESULTS DISPLAY */}
        {trackingData && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Order Summary Card */}
            <div className="bg-card border-2 border-emerald-500/30 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                      ऑर्डर #{trackingData.id}
                    </h2>
                    <Badge
                      className={`text-xs font-semibold px-2.5 py-0.5 ${
                        isCancelled
                          ? "bg-rose-600 text-white"
                          : trackingData.orderStatus === "Delivered"
                          ? "bg-emerald-600 text-white"
                          : trackingData.orderStatus === "Shipped" || trackingData.orderStatus === "Out for Delivery"
                          ? "bg-indigo-600 text-white"
                          : trackingData.orderStatus === "Processing"
                          ? "bg-purple-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {trackingData.orderStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>
                      ऑर्डर तिथि: {new Date(trackingData.createdAt).toLocaleDateString("hi-IN", { dateStyle: "long" })}
                    </span>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-muted-foreground block">कुल देय राशि:</span>
                  <span className="font-serif text-2xl font-bold text-primary">
                    ₹{trackingData.total}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    ({trackingData.paymentMethod})
                  </span>
                </div>
              </div>

              {/* CANCELLED STATE BANNER */}
              {isCancelled ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 flex items-start gap-3 text-xs leading-relaxed">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-sm text-rose-950 dark:text-rose-100">
                      यह ऑर्डर निरस्त (Cancelled) कर दिया गया है
                    </strong>
                    <p className="mt-1">
                      {trackingData.carrierNotes || "स्टॉक अनुपलब्धता या ग्राहक अनुरोध के कारण ऑर्डर निरस्त किया गया।"}
                    </p>
                  </div>
                </div>
              ) : (
                /* 6-STEP VISUAL TIMELINE PROGRESS BAR */
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>प्रक्रिया एवं पूर्ति स्थिति (Fulfillment Stepper)</span>
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      अनुमानित डिलीवरी: {trackingData.estimatedDeliveryWindow}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    {ORDER_STEPS.map((step, idx) => {
                      const isComplete = currentStepIdx >= idx;
                      const isCurrent = currentStepIdx === idx;

                      return (
                        <div
                          key={step.key}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isCurrent
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40"
                              : isComplete
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
                              : "bg-secondary/30 border-border/70 text-muted-foreground opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                isCurrent
                                  ? "bg-white text-emerald-700"
                                  : isComplete
                                  ? "bg-emerald-600 text-white"
                                  : "bg-secondary text-stone-500"
                              }`}
                            >
                              {isComplete && !isCurrent ? <Check className="w-3 h-3" /> : idx + 1}
                            </span>
                            {isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                            )}
                          </div>
                          <h4 className="font-bold text-xs leading-tight">{step.titleHindi}</h4>
                          <p
                            className={`text-[10px] mt-1 leading-snug line-clamp-2 ${
                              isCurrent ? "text-emerald-100" : "text-muted-foreground"
                            }`}
                          >
                            {step.subtitleHindi}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HONEST DISPATCH & COURIER STATUS CARD */}
              <div className="bg-secondary/40 border border-border rounded-2xl p-4 sm:p-5 text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                    <Truck className="w-4 h-4 text-primary" />
                    <span>वास्तविक प्रेषण व कूरियर जानकारी (Dispatch Status)</span>
                  </div>
                  {trackingData.hasTrackingNumber && (
                    <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                      कूरियर रसीद: {trackingData.trackingNumber}
                    </span>
                  )}
                </div>

                <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                  {trackingData.carrierNotes}
                </p>

                {trackingData.hasTrackingNumber ? (
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href="https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border hover:bg-secondary font-semibold text-xs text-foreground transition-colors"
                    >
                      <span>भारतीय डाक (India Post) पोर्टल पर रसीद संख्या से जांचें</span>
                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    </a>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/40 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                    <strong>नोट:</strong> कूरियर/डाक रसीद नंबर पार्सल स्थानीय डाकघर अथवा कूरियर सेवा को सुपुर्द किए जाने के बाद जारी होता है। डिस्पैच होते ही हकीम जी द्वारा WhatsApp पर सूचना दी जाएगी।
                  </div>
                )}
              </div>

              {/* WHATSAPP WORKFLOW DISTINCTION BANNER */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 text-xs space-y-1.5">
                <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>WhatsApp ऑर्डर पुष्टि नियम (Order Clarification):</span>
                </span>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  वेबसाइट पर चेकआउट पूरा करने या केवल WhatsApp चैट खोलने से ऑर्डर स्वतः 'Confirmed' नहीं होता।
                  हकीम इनायत अहमदी जी द्वारा आपकी स्वास्थ्य संबंधी आवश्यकता, पते और स्टॉक की समीक्षा उपरांत पुष्टि की जाती है।
                </p>
              </div>

              {/* TWO-COLUMN DETAILS: ITEMS & DELIVERY ADDRESS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                {/* Left: Ordered Formulations */}
                <div className="md:col-span-7 space-y-3">
                  <h3 className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    <span>ऑर्डर किए गए नुस्खे ({trackingData.items.length})</span>
                  </h3>

                  <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-card">
                    {trackingData.items.map((item, idx) => (
                      <div key={idx} className="p-3 sm:p-4 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            width={44}
                            height={52}
                            loading="lazy"
                            decoding="async"
                            className="w-11 h-13 object-contain p-1 rounded-xl bg-stone-50 dark:bg-stone-900 border border-border shrink-0"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-bold text-foreground truncate">{item.productName}</p>
                            <span className="text-[11px] text-muted-foreground block">
                              {item.packSize} • मात्रा: {item.quantity}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-foreground">₹{item.lineTotal}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            (₹{item.price} प्रति)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-secondary/30 p-4 rounded-2xl border border-border space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>सामग्री मूल्य (Subtotal):</span>
                      <span className="text-foreground font-semibold">₹{trackingData.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>डिलीवरी शुल्क (Shipping):</span>
                      <span className="text-foreground font-semibold">
                        {trackingData.shippingCharge === 0 ? "मुफ्त (FREE)" : `₹${trackingData.shippingCharge}`}
                      </span>
                    </div>
                    {trackingData.discount > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span>छूट (Discount):</span>
                        <span>-₹{trackingData.discount}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-border flex justify-between font-bold text-foreground text-sm">
                      <span>कुल राशि (Final Total):</span>
                      <span className="text-primary text-base">₹{trackingData.total}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Masked Customer Info & Real Status History Log */}
                <div className="md:col-span-5 space-y-4">
                  {/* Masked Customer Identity */}
                  <div className="bg-card border border-border rounded-2xl p-4 text-xs space-y-2">
                    <h3 className="font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>डिलीवरी गंतव्य (Masked for Privacy)</span>
                    </h3>
                    <div className="space-y-1 text-muted-foreground">
                      <p>
                        ग्राहक: <strong className="text-foreground">{trackingData.customerNameMasked}</strong>
                      </p>
                      <p>
                        मोबाइल: <strong className="text-foreground font-mono">{trackingData.customerPhoneMasked}</strong>
                      </p>
                      <p>
                        शहर व राज्य:{" "}
                        <strong className="text-foreground">
                          {trackingData.deliveryCity}, {trackingData.deliveryState} (पिन: {trackingData.deliveryPincode})
                        </strong>
                      </p>
                      <p className="text-[10px] text-stone-500 pt-1">
                        (सुरक्षा कारणों से पूर्ण गली का पता छुपाया गया है)
                      </p>
                    </div>
                  </div>

                  {/* Real Status Change Timeline Audit Log */}
                  <div className="bg-card border border-border rounded-2xl p-4 text-xs space-y-3">
                    <h3 className="font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>ऑर्डर प्रगति इतिहास (Status History)</span>
                    </h3>

                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {trackingData.statusHistory.map((hist, idx) => (
                        <div key={idx} className="relative pl-5 border-l-2 border-emerald-500/50 space-y-0.5">
                          <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-emerald-600" />
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-foreground">{hist.status}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(hist.timestamp).toLocaleDateString("hi-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {hist.notes && (
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              {hist.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct Contact Button */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2.5">
                    <span className="font-bold text-foreground block">
                      इस ऑर्डर के संबंध में कोई प्रश्न है?
                    </span>
                    <a
                      href={formatWhatsAppUrl(
                        settings.whatsapp,
                        `السلام علیکم Hakeem Ji, मैं अपने Shifa A Hayat ऑर्डर #${trackingData.id} की स्थिति के बारे में जानकारी चाहता हूँ।`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>WhatsApp पर हकीम जी से सहायता लें</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
