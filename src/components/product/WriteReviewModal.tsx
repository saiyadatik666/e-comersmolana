import React, { useState } from "react";
import { Star, ShieldCheck, X, Loader2, CheckCircle2, AlertCircle, Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitProductReviewServerFn, PublicProductReview } from "@/lib/reviews-api";
import { toast } from "sonner";

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onReviewSubmitted: (review: PublicProductReview) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "1★ निराशाजनक (Poor)",
  2: "2★ सामान्य से कम (Fair)",
  3: "3★ संतोषजनक (Average)",
  4: "4★ बहुत अच्छा (Good)",
  5: "5★ सर्वोत्तम एवं अत्यंत लाभकारी (Excellent)",
};

export function WriteReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  onReviewSubmitted,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [authorName, setAuthorName] = useState<string>("");
  const [city, setCity] = useState<string>("");

  // Verified Purchase Verification Fields
  const [hasOrder, setHasOrder] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // Honeypot spam trap
  const [botField, setBotField] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ review: PublicProductReview; message: string } | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setRating(5);
    setHoverRating(null);
    setTitle("");
    setComment("");
    setAuthorName("");
    setCity("");
    setHasOrder(false);
    setOrderId("");
    setPhone("");
    setBotField("");
    setErrorMessage(null);
    setSuccessData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Frontend validations
    if (!authorName.trim() || authorName.trim().length < 2) {
      setErrorMessage("कृपया अपना नाम दर्ज करें (न्यूनतम 2 अक्षर)।");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage("कृपया समीक्षा का शीर्षक लिखें (न्यूनतम 3 अक्षर)।");
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      setErrorMessage("कृपया कम से कम 10 अक्षरों में अपना विस्तृत अनुभव साझा करें।");
      return;
    }

    if (hasOrder) {
      if (!orderId.trim()) {
        setErrorMessage("सत्यापित खरीद बैज हेतु कृपया अपना ऑर्डर आईडी दर्ज करें (उदा. ORD-XXXXXX-XXXX)।");
        return;
      }
      const digits = phone.replace(/[^0-9]/g, "");
      if (digits.length < 10) {
        setErrorMessage("सत्यापित खरीद बैज हेतु कृपया अपना 10-अंकीय मोबाइल नंबर दर्ज करें।");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await submitProductReviewServerFn({
        data: {
          productId,
          rating,
          title: title.trim(),
          comment: comment.trim(),
          authorName: authorName.trim(),
          city: city.trim() ? city.trim() : undefined,
          orderId: hasOrder ? orderId.trim() : undefined,
          phone: hasOrder ? phone.trim() : undefined,
          botField: botField ? botField.trim() : undefined,
        },
      });

      if (res && res.success && res.review) {
        setSuccessData({ review: res.review, message: res.message });
        toast.success(res.message);
        onReviewSubmitted(res.review);
      } else {
        throw new Error(res?.message || "समीक्षा दर्ज करने में विफलता।");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "समीक्षा सबमिट करने में तकनीकी समस्या आई।";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-review-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-3xl shadow-2xl p-5 sm:p-7 text-foreground my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
              <Star className="w-3.5 h-3.5 fill-primary" />
              <span>ग्राहक समीक्षा एवं अनुभव (Product Review)</span>
            </div>
            <h2 id="write-review-title" className="font-serif text-xl sm:text-2xl font-bold mt-1">
              {productName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              आपका सच्चा अनुभव अन्य जरूरतमंद रोगियों एवं ग्राहकों का सही मार्गदर्शन करेगा।
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="बंद करें (Close)"
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {successData ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl font-bold text-foreground">
              समीक्षा सफलतापूर्वक दर्ज हो चुकी है!
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {successData.message}
            </p>

            {successData.review.isVerifiedPurchase && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>सत्यापित खरीद (Verified Purchase) बैज सक्रिय</span>
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handleClose}
                className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
              >
                समीक्षाएं देखें (View Reviews)
              </Button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Honeypot hidden input */}
            <input
              type="text"
              name="website_url"
              tabIndex={-1}
              autoComplete="off"
              value={botField}
              onChange={(e) => setBotField(e.target.value)}
              className="hidden pointer-events-none opacity-0 h-0 w-0 absolute"
              aria-hidden="true"
            />

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Star Rating Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                आपकी रेटिंग (Star Rating) *
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating ?? rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 rounded-lg hover:scale-110 transition-transform focus:outline-hidden cursor-pointer"
                        aria-label={`${star} सितारे चुनें`}
                      >
                        <Star
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                            isFilled
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/40 hover:text-amber-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 pl-2">
                  {RATING_LABELS[hoverRating ?? rating]}
                </span>
              </div>
            </div>

            {/* Review Title */}
            <div className="space-y-1.5">
              <Label htmlFor="review-title" className="text-xs font-bold text-foreground">
                समीक्षा शीर्षक (Review Headline) *
              </Label>
              <Input
                id="review-title"
                required
                maxLength={100}
                placeholder="उदा. 15 दिन में अत्यधिक आराम मिला / बहुत असरदार नुस्खा"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs rounded-xl bg-secondary/40"
              />
            </div>

            {/* Review Comment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="review-comment" className="text-xs font-bold text-foreground">
                  विस्तृत अनुभव एवं लाभ (Detailed Experience) *
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {comment.length} / 1000 अक्षर
                </span>
              </div>
              <Textarea
                id="review-comment"
                required
                rows={4}
                maxLength={1000}
                placeholder="दवा का सेवन कितने दिन किया, क्या परहेज रखा और आपको क्या-क्या स्वास्थ्य सुधार महसूस हुआ? कृपया स्पष्ट बताएं..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="text-xs rounded-xl bg-secondary/40 resize-none"
              />
            </div>

            {/* Author Name & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="review-author" className="text-xs font-bold text-foreground">
                  आपका नाम (Full Name) *
                </Label>
                <Input
                  id="review-author"
                  required
                  maxLength={60}
                  placeholder="उदा. Mohammad Arif"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="text-xs rounded-xl bg-secondary/40"
                />
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>सार्वजनिक रूप से केवल '{authorName.trim() ? `${authorName.trim()[0]}***` : "M***"}' दिखेगा।</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="review-city" className="text-xs font-bold text-foreground">
                  शहर / राज्य (City, State — Optional)
                </Label>
                <Input
                  id="review-city"
                  maxLength={50}
                  placeholder="उदा. Palanpur, Gujarat"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="text-xs rounded-xl bg-secondary/40"
                />
              </div>
            </div>

            {/* Verified Purchase Section (Toggle) */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <input
                  type="checkbox"
                  id="claim-verified-checkbox"
                  checked={hasOrder}
                  onChange={(e) => setHasOrder(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded-md border-emerald-400 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="claim-verified-checkbox" className="text-xs cursor-pointer select-none space-y-0.5">
                  <span className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>मैंने यह उत्पाद Shifa A Hayat से खरीदा है (सत्यापित खरीद बैज प्राप्त करें)</span>
                  </span>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    ऑर्डर आईडी व मोबाइल नंबर दर्ज करने पर सर्वर द्वारा पुष्टि होने पर आपकी समीक्षा को प्रामाणिक 'Verified Purchase' बैज प्राप्त होगा।
                  </p>
                </label>
              </div>

              {hasOrder && (
                <div className="mt-3 p-3.5 rounded-2xl bg-secondary/40 border border-border space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="verify-order-id" className="text-xs font-semibold text-foreground">
                        ऑर्डर संदर्भ आईडी (Order ID) *
                      </Label>
                      <Input
                        id="verify-order-id"
                        placeholder="ORD-XXXXXX-XXXX"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                        className="text-xs rounded-xl bg-card font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="verify-phone" className="text-xs font-semibold text-foreground">
                        ऑर्डर में दर्ज मोबाइल नंबर (Phone Number) *
                      </Label>
                      <Input
                        id="verify-phone"
                        type="tel"
                        maxLength={15}
                        placeholder="10-अंकीय मोबाइल नंबर"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="text-xs rounded-xl bg-card"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      आपका फ़ोन नंबर कभी सार्वजनिक नहीं किया जाएगा। इसका उपयोग केवल आपकी वास्तविक खरीद सत्यापित करने हेतु होता है।
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleClose}
                className="rounded-xl text-xs"
              >
                रद्द करें
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 shadow-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>सत्यापन व सबमिशन जारी...</span>
                  </span>
                ) : (
                  <span>समीक्षा प्रकाशित करें</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
