import React, { useState, useEffect } from "react";
import {
  useStore,
  CustomerDeliveryDetails,
  CartItem,
  generateWhatsAppOrderUrl,
  generateWhatsAppWebOrderUrl,
  buildWhatsAppOrderMessage,
  cleanWhatsAppNumber,
} from "@/context/StoreContext";
import { Product } from "@/data/products";
import {
  Truck,
  MessageCircle,
  ShieldCheck,
  Check,
  Edit2,
  Trash2,
  AlertCircle,
  Copy,
  ExternalLink,
  MapPin,
  User,
  Phone,
  Mail,
  Home,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CustomerDetailsFormProps {
  items: CartItem[] | { product: Product; quantity: number; packSize?: string }[];
  subtotal: number;
  shippingFee: number;
  finalTotal: number;
  onOrderCompleted?: (orderId: string) => void;
  className?: string;
}

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  items,
  subtotal,
  shippingFee,
  finalTotal,
  onOrderCompleted,
  className = "",
}) => {
  const {
    savedCustomerDetails,
    saveCustomerDetails,
    clearSavedCustomerDetails,
    createOrder,
    settings,
  } = useStore();

  // Mode: "review-saved" (for returning customers) | "fill-form" | "confirm-order"
  const [mode, setMode] = useState<"review-saved" | "fill-form" | "confirm-order">(
    savedCustomerDetails ? "review-saved" : "fill-form"
  );

  // Form Fields (Required 1-7)
  const [fullName, setFullName] = useState(savedCustomerDetails?.fullName || "");
  const [phone, setPhone] = useState(savedCustomerDetails?.phone || "");
  const [addressLine, setAddressLine] = useState(savedCustomerDetails?.addressLine || "");
  const [cityVillage, setCityVillage] = useState(savedCustomerDetails?.cityVillage || "");
  const [state, setState] = useState(savedCustomerDetails?.state || "Gujarat");
  const [pincode, setPincode] = useState(savedCustomerDetails?.pincode || "");
  const [country, setCountry] = useState(savedCustomerDetails?.country || "India");

  // Optional Fields
  const [landmark, setLandmark] = useState(savedCustomerDetails?.landmark || "");
  const [email, setEmail] = useState(savedCustomerDetails?.email || "");

  // Consent for saving details on this device
  const [consentToSave, setConsentToSave] = useState(!!savedCustomerDetails);

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission / Review state
  const [submittedMessage, setSubmittedMessage] = useState<string>("");
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string>("");
  const [submittedWhatsAppWebUrl, setSubmittedWhatsAppWebUrl] = useState<string>("");
  const [createdOrderId, setCreatedOrderId] = useState<string>("");
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (savedCustomerDetails) {
      setFullName(savedCustomerDetails.fullName || "");
      setPhone(savedCustomerDetails.phone || "");
      setAddressLine(savedCustomerDetails.addressLine || "");
      setCityVillage(savedCustomerDetails.cityVillage || "");
      setState(savedCustomerDetails.state || "Gujarat");
      setPincode(savedCustomerDetails.pincode || "");
      setCountry(savedCustomerDetails.country || "India");
      setLandmark(savedCustomerDetails.landmark || "");
      setEmail(savedCustomerDetails.email || "");
      setConsentToSave(true);
    }
  }, [savedCustomerDetails]);

  // Validate form fields
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.fullName = "कृपया अपना पूरा नाम लिखें (Full Name is required)";
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = "कृपया मान्य 10 अंकों का मोबाइल नंबर भरें (Valid 10-digit phone required)";
    }

    if (!addressLine.trim() || addressLine.trim().length < 5) {
      errs.addressLine = "कृपया मकान नं., गली या पूरा पता लिखें (Complete address required)";
    }

    if (!cityVillage.trim()) {
      errs.cityVillage = "कृपया शहर या गाँव का नाम लिखें (City/Village is required)";
    }

    if (!state.trim()) {
      errs.state = "कृपया राज्य का नाम भरें (State is required)";
    }

    const cleanPin = pincode.replace(/[^0-9]/g, "");
    if (!cleanPin || cleanPin.length !== 6) {
      errs.pincode = "कृपया 6 अंकों का सही पिनकोड भरें (6-digit PIN code required)";
    }

    if (!country.trim()) {
      errs.country = "कृपया देश का नाम भरें (Country is required)";
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "कृपया मान्य ईमेल पता लिखें (Invalid email format)";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) {
      toast.error("कृपया सभी आवश्यक फ़ील्ड सही तरीके से भरें।");
      return;
    }

    setIsSubmitting(true);
    try {
      const details: CustomerDeliveryDetails = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine: addressLine.trim(),
        cityVillage: cityVillage.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: country.trim() || "India",
        landmark: landmark.trim() || undefined,
        email: email.trim() || undefined,
      };

      // Save with consent
      saveCustomerDetails(details, consentToSave);

      // Prepare WhatsApp Message & URL
      const origin = typeof window !== "undefined" ? window.location.origin : "https://shifa-a-hayat.com";
      const msg = buildWhatsAppOrderMessage({
        customer: details,
        items: items.map((i) => ({
          product: i.product,
          quantity: i.quantity,
          packSize: i.packSize || i.product.packSize,
        })),
        subtotal,
        shippingCharge: shippingFee,
        finalAmount: finalTotal,
        origin,
      });

      const waUrl = generateWhatsAppOrderUrl({
        customer: details,
        items: items.map((i) => ({
          product: i.product,
          quantity: i.quantity,
          packSize: i.packSize || i.product.packSize,
        })),
        subtotal,
        shippingCharge: shippingFee,
        finalAmount: finalTotal,
        whatsappNumber: settings.whatsapp,
        origin,
      });

      // Record order locally with status "Pending Confirmation"
      const newOrder = createOrder({
        customerName: details.fullName,
        customerPhone: details.phone,
        customerEmail: details.email,
        shippingAddress: {
          id: `addr-${Date.now()}`,
          fullName: details.fullName,
          phone: details.phone,
          addressLine: details.addressLine,
          landmark: details.landmark,
          city: details.cityVillage,
          state: details.state,
          pincode: details.pincode,
        },
        customerDeliveryDetails: details,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          productImage: i.product.image,
          price: i.product.price,
          quantity: i.quantity,
          packSize: i.packSize || i.product.packSize,
        })),
        subtotal,
        shippingCharge: shippingFee,
        discount: 0,
        total: finalTotal,
        paymentMethod: "WhatsApp Direct Order",
        paymentStatus: "Pending Confirmation",
        notes: "Submitted via WhatsApp order request",
      });

      const waWebUrl = generateWhatsAppWebOrderUrl({
        customer: details,
        items: items.map((i) => ({
          product: i.product,
          quantity: i.quantity,
          packSize: i.packSize || i.product.packSize,
        })),
        subtotal,
        shippingCharge: shippingFee,
        finalAmount: finalTotal,
        whatsappNumber: settings.whatsapp,
        origin,
      });

      setCreatedOrderId(newOrder.id);
      setSubmittedMessage(msg);
      setSubmittedWhatsAppUrl(waUrl);
      setSubmittedWhatsAppWebUrl(waWebUrl);
      setMode("confirm-order");

      if (onOrderCompleted) {
        onOrderCompleted(newOrder.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseSavedAddress = () => {
    if (!savedCustomerDetails || isSubmitting) return;
    setIsSubmitting(true);
    try {
      setFullName(savedCustomerDetails.fullName);
      setPhone(savedCustomerDetails.phone);
      setAddressLine(savedCustomerDetails.addressLine);
      setCityVillage(savedCustomerDetails.cityVillage);
      setState(savedCustomerDetails.state);
      setPincode(savedCustomerDetails.pincode);
      setCountry(savedCustomerDetails.country || "India");
      setLandmark(savedCustomerDetails.landmark || "");
      setEmail(savedCustomerDetails.email || "");

    // Prepare WhatsApp Message & URL
    const origin = typeof window !== "undefined" ? window.location.origin : "https://shifa-a-hayat.com";
    const msg = buildWhatsAppOrderMessage({
      customer: savedCustomerDetails,
      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        packSize: i.packSize || i.product.packSize,
      })),
      subtotal,
      shippingCharge: shippingFee,
      finalAmount: finalTotal,
      origin,
    });

    const waUrl = generateWhatsAppOrderUrl({
      customer: savedCustomerDetails,
      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        packSize: i.packSize || i.product.packSize,
      })),
      subtotal,
      shippingCharge: shippingFee,
      finalAmount: finalTotal,
      whatsappNumber: settings.whatsapp,
      origin,
    });

    const waWebUrl = generateWhatsAppWebOrderUrl({
      customer: savedCustomerDetails,
      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        packSize: i.packSize || i.product.packSize,
      })),
      subtotal,
      shippingCharge: shippingFee,
      finalAmount: finalTotal,
      whatsappNumber: settings.whatsapp,
      origin,
    });

    const newOrder = createOrder({
      customerName: savedCustomerDetails.fullName,
      customerPhone: savedCustomerDetails.phone,
      customerEmail: savedCustomerDetails.email,
      shippingAddress: {
        id: `addr-${Date.now()}`,
        fullName: savedCustomerDetails.fullName,
        phone: savedCustomerDetails.phone,
        addressLine: savedCustomerDetails.addressLine,
        landmark: savedCustomerDetails.landmark,
        city: savedCustomerDetails.cityVillage,
        state: savedCustomerDetails.state,
        pincode: savedCustomerDetails.pincode,
      },
      customerDeliveryDetails: savedCustomerDetails,
      items: items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        productImage: i.product.image,
        price: i.product.price,
        quantity: i.quantity,
        packSize: i.packSize || i.product.packSize,
      })),
      subtotal,
      shippingCharge: shippingFee,
      discount: 0,
      total: finalTotal,
      paymentMethod: "WhatsApp Direct Order",
      paymentStatus: "Pending Confirmation",
      notes: "Submitted using saved details via WhatsApp order request",
    });

    setCreatedOrderId(newOrder.id);
    setSubmittedMessage(msg);
    setSubmittedWhatsAppUrl(waUrl);
    setSubmittedWhatsAppWebUrl(waWebUrl);
    setMode("confirm-order");

    if (onOrderCompleted) {
      onOrderCompleted(newOrder.id);
    }
  } finally {
    setIsSubmitting(false);
  }
};

  const handleOpenWhatsApp = (e: React.MouseEvent, targetUrl: string) => {
    try {
      const win = window.open(targetUrl, "_blank", "noopener,noreferrer");
      if (!win || win.closed || typeof win.closed === "undefined") {
        toast.warning("पॉपअप अवरुद्ध हो सकता है। कृपया नीचे दिए गए 'ऑर्डर विवरण कॉपी करें' का उपयोग करें।");
      }
    } catch (err) {
      console.error("Popup blocked or window error", err);
      toast.error("WhatsApp नहीं खुला। कृपया 'ऑर्डर विवरण कॉपी करें' का उपयोग करें।");
    }
  };

  const handleCopyMessage = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(submittedMessage);
      setHasCopied(true);
      toast.success("WhatsApp संदेश कॉपी हो गया है!");
      setTimeout(() => setHasCopied(false), 2500);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. RETURNING CUSTOMER SAVED CARD */}
      {mode === "review-saved" && savedCustomerDetails && (
        <div className="bg-card border-2 border-primary/20 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
                सहेजा गया डिलीवरी पता (Saved Address)
              </h3>
            </div>
            <span className="text-[10px] bg-secondary text-muted-foreground px-2.5 py-0.5 rounded-full font-semibold">
              डिवाइस पर सुरक्षित
            </span>
          </div>

          {/* Details summary */}
          <div className="bg-secondary/40 border border-border rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span>{savedCustomerDetails.fullName}</span>
              <span className="text-primary font-mono">{savedCustomerDetails.phone}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {savedCustomerDetails.addressLine},{" "}
              {savedCustomerDetails.landmark ? `${savedCustomerDetails.landmark}, ` : ""}
              {savedCustomerDetails.cityVillage}, {savedCustomerDetails.state} -{" "}
              {savedCustomerDetails.pincode}, {savedCustomerDetails.country || "India"}
            </p>
            {savedCustomerDetails.email && (
              <p className="text-[11px] text-muted-foreground font-mono">
                ✉️ {savedCustomerDetails.email}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <Button
              type="button"
              size="lg"
              disabled={isSubmitting}
              onClick={handleUseSavedAddress}
              className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>{isSubmitting ? "ऑर्डर तैयार हो रहा है..." : "इसी पते पर WhatsApp पर ऑर्डर भेजें"}</span>
            </Button>

            <div className="flex items-center justify-between gap-3 pt-1 text-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode("fill-form")}
                className="rounded-xl text-xs flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>पता बदलें (Edit Details)</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearSavedCustomerDetails();
                  setMode("fill-form");
                }}
                className="rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>सहेजा पता हटाएं (Clear Saved Details)</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FIRST-TIME OR EDITING CUSTOMER FORM */}
      {mode === "fill-form" && (
        <form onSubmit={handleProceedToReview} className="bg-card border border-border rounded-3xl p-4 sm:p-8 shadow-xs space-y-5 sm:space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <Truck className="w-4 h-4" />
              <span>डिलीवरी का विवरण (Shipping Details)</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              ग्राहक विवरण फ़ॉर्म (Customer Details)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              WhatsApp पर ऑर्डर भेजने से पहले कृपया अपना सही डिलीवरी पता दर्ज करें।
            </p>
          </div>

          {/* Required Fields 1 & 2: Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-fullName" className="text-xs font-semibold flex items-center gap-1 text-foreground">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>पूरा नाम (Full Name) *</span>
              </Label>
              <Input
                id="cust-fullName"
                required
                placeholder="उदा: मोहम्मद रफ़ीक (Mr. Rafiq)"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors({ ...errors, fullName: "" });
                }}
                className={`bg-secondary/40 text-xs ${errors.fullName ? "border-rose-500 ring-rose-500" : ""}`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-phone" className="text-xs font-semibold flex items-center gap-1 text-foreground">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>मोबाइल नंबर (Mobile Number) *</span>
              </Label>
              <Input
                id="cust-phone"
                required
                type="tel"
                inputMode="tel"
                placeholder="उदा: 98250 12345"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors({ ...errors, phone: "" });
                }}
                className={`bg-secondary/40 text-xs ${errors.phone ? "border-rose-500 ring-rose-500" : ""}`}
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Required Field 3: Complete Address Line */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-addressLine" className="text-xs font-semibold flex items-center gap-1 text-foreground">
              <Home className="w-3.5 h-3.5 text-primary" />
              <span>मकान नं., गली व मोहल्ला (Complete Delivery Address) *</span>
            </Label>
            <Input
              id="cust-addressLine"
              required
              placeholder="उदा: मकान नं. 14, मदीना मस्जिद के पास, स्टेशन रोड"
              value={addressLine}
              onChange={(e) => {
                setAddressLine(e.target.value);
                if (errors.addressLine) setErrors({ ...errors, addressLine: "" });
              }}
              className={`bg-secondary/40 text-xs ${errors.addressLine ? "border-rose-500 ring-rose-500" : ""}`}
            />
            {errors.addressLine && (
              <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.addressLine}
              </p>
            )}
          </div>

          {/* Required Fields 4, 5, 6: City/Village, State, PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-cityVillage" className="text-xs font-semibold flex items-center gap-1 text-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>शहर या गाँव (City or Village) *</span>
              </Label>
              <Input
                id="cust-cityVillage"
                required
                placeholder="उदा: पालनपुर (Palanpur)"
                value={cityVillage}
                onChange={(e) => {
                  setCityVillage(e.target.value);
                  if (errors.cityVillage) setErrors({ ...errors, cityVillage: "" });
                }}
                className={`bg-secondary/40 text-xs ${errors.cityVillage ? "border-rose-500 ring-rose-500" : ""}`}
              />
              {errors.cityVillage && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.cityVillage}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-state" className="text-xs font-semibold text-foreground">
                राज्य (State) *
              </Label>
              <Input
                id="cust-state"
                required
                placeholder="उदा: Gujarat"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  if (errors.state) setErrors({ ...errors, state: "" });
                }}
                className={`bg-secondary/40 text-xs ${errors.state ? "border-rose-500 ring-rose-500" : ""}`}
              />
              {errors.state && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.state}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-pincode" className="text-xs font-semibold text-foreground">
                पिन कोड (PIN Code) *
              </Label>
              <Input
                id="cust-pincode"
                required
                maxLength={6}
                inputMode="numeric"
                placeholder="उदा: 385001"
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value);
                  if (errors.pincode) setErrors({ ...errors, pincode: "" });
                }}
                className={`bg-secondary/40 text-xs ${errors.pincode ? "border-rose-500 ring-rose-500" : ""}`}
              />
              {errors.pincode && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.pincode}
                </p>
              )}
            </div>
          </div>

          {/* Required Field 7: Country (Default India, Editable) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-country" className="text-xs font-semibold text-foreground">
                देश (Country) *
              </Label>
              <Input
                id="cust-country"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-secondary/40 text-xs"
              />
            </div>

            {/* Optional Field: Landmark */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-landmark" className="text-xs font-medium text-muted-foreground">
                पहचान चिन्ह (Landmark - ऐच्छिक)
              </Label>
              <Input
                id="cust-landmark"
                placeholder="उदा: नियर पानी की टंकी"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="bg-secondary/40 text-xs"
              />
            </div>

            {/* Optional Field: Email */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-email" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>ईमेल (Email - ऐच्छिक)</span>
              </Label>
              <Input
                id="cust-email"
                type="email"
                placeholder="उदा: name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary/40 text-xs"
              />
            </div>
          </div>

          {/* Consent Checkbox: Section 6 */}
          <div className="bg-secondary/30 border border-border rounded-2xl p-4 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentToSave}
                onChange={(e) => setConsentToSave(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary accent-emerald-700"
              />
              <div className="text-xs leading-relaxed text-foreground">
                <span className="font-semibold block">
                  भविष्य के ऑर्डर्स के लिए मेरे पते की जानकारी इस डिवाइस पर सुरक्षित रखें
                </span>
                <span className="text-muted-foreground text-[11px] block mt-0.5">
                  (Save my details on this device for faster checkout. You can edit or clear details anytime.)
                </span>
              </div>
            </label>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>
              आपकी जानकारी पूर्णतः सुरक्षित है। हम कोई पासवर्ड, आधार या अनावश्यक व्यक्तिगत डेटा नहीं मांगते।
            </span>
          </div>

          {/* Submit Action */}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>{isSubmitting ? "ऑर्डर तैयार हो रहा है..." : "WhatsApp पर ऑर्डर अनुरोध भेजें (Send via WhatsApp)"}</span>
          </Button>
        </form>
      )}

      {/* 3. ORDER SUBMITTED / CONFIRMATION SCREEN */}
      {mode === "confirm-order" && (
        <div className="bg-card border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-8 shadow-xl text-center space-y-5 sm:space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border-2 border-emerald-500">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full uppercase tracking-wider">
              ऑर्डर अनुरोध तैयार हो गया
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-2">
              WhatsApp पर ऑर्डर संदेश भेजें
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-lg mx-auto leading-relaxed">
              ऑर्डर संदर्भ नंबर: <strong className="text-primary font-bold">{createdOrderId}</strong><br />
              <span className="text-stone-600 dark:text-stone-300 text-xs">
                ⚠️ ध्यान दें: WhatsApp खुलने के बाद 'Send' बटन दबाकर हकीम जी को संदेश भेजें। हकीम जी द्वारा पुष्टि के बाद ही ऑर्डर स्वीकार माना जाएगा।
              </span>
            </p>
          </div>

          {/* WhatsApp Direct Action Buttons (Requirements 5 & 7) */}
          <div className="space-y-3 max-w-md mx-auto">
            <a
              href={submittedWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleOpenWhatsApp(e, submittedWhatsAppUrl)}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg transition-all cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>WhatsApp पर ऑर्डर भेजें (Open WhatsApp)</span>
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>

            {/* Desktop WhatsApp Web Alternative */}
            <a
              href={submittedWhatsAppWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleOpenWhatsApp(e, submittedWhatsAppWebUrl)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>कंप्यूटर / लैपटॉप के लिए WhatsApp Web खोलें</span>
            </a>

            {/* Copy Order Details Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyMessage}
              className="w-full rounded-xl text-xs flex items-center justify-center gap-2 border-stone-300 dark:border-stone-700 font-semibold py-2.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{hasCopied ? "✓ ऑर्डर विवरण कॉपी हो गया!" : "ऑर्डर विवरण कॉपी करें (Copy Order Details)"}</span>
            </Button>
          </div>

          {/* Helpful Error & Fallback Banner (Requirement 7) */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1.5 max-w-xl mx-auto">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>यदि WhatsApp सीधे नहीं खुल पाता है:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
              ब्राउज़र सुरक्षा या पूर्वावलोकन अवरोध के कारण यदि WhatsApp नहीं खुलता (जैसे ERR_BLOCKED_BY_RESPONSE), तो कृपया ऊपर <strong>'ऑर्डर विवरण कॉपी करें'</strong> बटन दबाएं और सीधे हकीम जी के WhatsApp नंबर <strong>+91 {cleanWhatsAppNumber(settings.whatsapp)}</strong> पर संदेश पेस्ट करके भेज दें।
            </p>
          </div>

          {/* Message Preview Box */}
          <div className="text-left bg-secondary/40 border border-border rounded-2xl p-4 text-xs space-y-2 max-w-xl mx-auto">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-muted-foreground">
              तैयार किया गया WhatsApp संदेश (Preview):
            </span>
            <pre className="text-[11px] font-mono whitespace-pre-wrap text-stone-700 dark:text-stone-300 bg-card p-3 rounded-xl border border-border max-h-48 overflow-y-auto">
              {submittedMessage}
            </pre>
          </div>

          {/* Post Order Options */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("fill-form")}
              className="rounded-xl text-xs"
            >
              विवरण दोबारा जांचें / बदलें (Edit Form)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
