import React, { useState, useMemo } from "react";
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  ThumbsUp,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PublicProductReview, ProductReviewStats } from "@/lib/reviews-api";
import { WriteReviewModal } from "./WriteReviewModal";

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  reviews: PublicProductReview[];
  stats: ProductReviewStats;
  isLoading?: boolean;
  onReviewSubmitted: (newReview: PublicProductReview) => void;
}

type FilterOption = "all" | "verified" | "5" | "4" | "3" | "2" | "1";

export function ProductReviewsSection({
  productId,
  productName,
  reviews,
  stats,
  isLoading = false,
  onReviewSubmitted,
}: ProductReviewsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((rev) => {
      if (activeFilter === "verified") {
        return rev.isVerifiedPurchase;
      }
      if (["5", "4", "3", "2", "1"].includes(activeFilter)) {
        return Math.floor(rev.rating) === Number(activeFilter);
      }
      return true;
    });
  }, [reviews, activeFilter]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section
      id="customer-reviews-section"
      aria-label="ग्राहक समीक्षाएं एवं अनुभव"
      className="mt-16 sm:mt-20 border-t border-border pt-12"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% प्रामाणिक ग्राहक समीक्षा प्रणाली (Trustworthy Reviews)</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            सच्चे ग्राहकों के अनुभव एवं रेटिंग
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            हम कभी भी बनावटी या स्वचालित समीक्षाएं नहीं दिखाते। यहाँ केवल वास्तविक ग्राहकों के सत्यापित अनुभव प्रदर्शित किए जाते हैं।
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm px-5 py-2.5 shadow-md self-start sm:self-auto flex items-center gap-2 cursor-pointer"
        >
          <Star className="w-4 h-4 fill-primary-foreground text-primary-foreground" />
          <span>समीक्षा लिखें (Write a Review)</span>
        </Button>
      </div>

      {/* Aggregate Rating & Star Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-card border border-border rounded-3xl p-6 sm:p-8 mb-8">
        {/* Left: Overall Rating Box */}
        <div className="lg:col-span-4 flex flex-col justify-center items-center sm:items-start border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0 lg:pr-8 text-center sm:text-left">
          {stats.totalReviews > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-5xl sm:text-6xl font-bold text-foreground">
                  {stats.averageRating.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">/ 5.0</span>
              </div>

              {/* Golden Stars */}
              <div className="flex items-center gap-1 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(stats.averageRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-foreground font-semibold">
                कुल {stats.totalReviews} सार्वजनिक समीक्षाएं
              </p>

              {stats.verifiedCount > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{stats.verifiedCount} सत्यापित खरीदार (Verified Purchases)</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2 py-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
                <span>नई पेशकश (Catalog Active)</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-foreground">
                अभी कोई समीक्षा नहीं
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                इस उत्पाद पर पहली प्रामाणिक समीक्षा लिखकर अन्य जरूरतमंद लोगों का मार्गदर्शन करें।
              </p>
            </div>
          )}
        </div>

        {/* Right: Star Distribution Bars */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-2.5">
          <span className="text-xs font-bold text-foreground mb-1 block">
            रेटिंग वितरण (Rating Distribution)
          </span>

          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.ratingDistribution[star as keyof typeof stats.ratingDistribution] || 0;
            const pct = stats.ratingPercentages[star as keyof typeof stats.ratingPercentages] || 0;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setActiveFilter(activeFilter === String(star) ? "all" : (String(star) as FilterOption))}
                className={`w-full flex items-center gap-3 text-xs p-1 rounded-xl transition-colors cursor-pointer text-left ${
                  activeFilter === String(star) ? "bg-secondary font-bold" : "hover:bg-secondary/40"
                }`}
                title={`${star} सितारा समीक्षाएं फ़िल्टर करें`}
              >
                <span className="w-10 shrink-0 font-medium text-muted-foreground flex items-center gap-1">
                  <span>{star}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>

                <div className="flex-1 h-2.5 bg-secondary/80 rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="w-16 shrink-0 text-right text-muted-foreground font-medium">
                  {pct}% ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>फ़िल्टर:</span>
        </span>

        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeFilter === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          सभी ({reviews.length})
        </button>

        <button
          onClick={() => setActiveFilter("verified")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
            activeFilter === "verified"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>सत्यापित खरीद ({stats.verifiedCount})</span>
        </button>

        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setActiveFilter(String(star) as FilterOption)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === String(star)
                ? "bg-amber-500 text-stone-950 shadow-xs"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {star}★ ({stats.ratingDistribution[star as keyof typeof stats.ratingDistribution] || 0})
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((rev) => (
            <article
              key={rev.id}
              className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-3 transition-shadow hover:shadow-md"
            >
              {/* Review Card Top: Stars, Verified Badge & Date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>

                  {rev.isVerifiedPurchase ? (
                    <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 py-0.5 px-2">
                      <ShieldCheck className="w-3 h-3" />
                      <span>सत्यापित खरीद (Verified Purchase)</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      ग्राहक समीक्षा
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <time dateTime={rev.createdAt}>{formatDate(rev.createdAt)}</time>
                </div>
              </div>

              {/* Title */}
              <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
                {rev.title}
              </h3>

              {/* Comment text */}
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                {rev.comment}
              </p>

              {/* Author & Location */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-foreground">{rev.authorMasked}</span>
                  {rev.city && <span>• {rev.city}</span>}
                </div>

                {rev.verifiedOrderIdMasked && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    संदर्भ: {rev.verifiedOrderIdMasked}
                  </span>
                )}
              </div>

              {/* Store / Hakim Ji Response (if present) */}
              {rev.adminReply && (
                <div className="mt-3 p-3.5 rounded-2xl bg-secondary/70 border border-border/80 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>हकीम जी / Shifa A Hayat का उत्तर:</span>
                  </div>
                  <p className="text-stone-800 dark:text-stone-200 leading-relaxed">
                    {rev.adminReply}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        /* Honest Empty State */
        <div className="bg-card border border-dashed border-border rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-secondary/80 text-muted-foreground mx-auto flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              {activeFilter !== "all"
                ? "इस फ़िल्टर से संबंधित कोई समीक्षा नहीं मिली"
                : "इस उत्पाद पर अभी कोई ग्राहक समीक्षा उपलब्ध नहीं है"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {activeFilter !== "all"
                ? "कृपया अन्य रेटिंग चुनें या 'सभी समीक्षाएं' पर क्लिक करें।"
                : "Shifa A Hayat अपनी पारदर्शिता के लिए जाना जाता है। हम कभी झूठी या बनावटी समीक्षाएं नहीं दिखाते। पहले खरीदार बनकर अपना सच्चा अनुभव साझा करें।"}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {activeFilter !== "all" ? (
              <Button
                variant="outline"
                onClick={() => setActiveFilter("all")}
                className="rounded-xl text-xs"
              >
                सभी समीक्षाएं देखें
              </Button>
            ) : (
              <Button
                onClick={() => setIsModalOpen(true)}
                className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm px-6 py-2.5 shadow-md"
              >
                <Star className="w-4 h-4 fill-primary-foreground mr-1.5" />
                <span>पहला अनुभव लिखें (Be the First to Review)</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      <WriteReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={productId}
        productName={productName}
        onReviewSubmitted={(newRev) => {
          onReviewSubmitted(newRev);
          setActiveFilter("all");
        }}
      />
    </section>
  );
}
