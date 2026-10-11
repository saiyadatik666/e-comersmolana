import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useStore } from "@/context/StoreContext";
import {
  Truck,
  RotateCcw,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface PolicySearch {
  tab?: "shipping" | "refund" | "privacy" | "terms" | "compliance";
}

export const Route = createFileRoute("/policies")({
  validateSearch: (search: Record<string, unknown>): PolicySearch => {
    return {
      tab: typeof search.tab === "string" ? (search.tab as any) : "shipping",
    };
  },
  head: () => ({
    meta: [
      { title: "नीतियां, शिपिंग एवं रिफंड (Store Policies) — Shifa A Hayat" },
      {
        name: "description",
        content:
          "शिफा ए हयात की शिपिंग व डिलीवरी नीति, 7-दिवसीय रिटर्न व रिफंड नियम, गोपनीयता नीति एवं वैधानिक चिकित्सा डिस्क्लेमर।",
      },
      { property: "og:title", content: "Store Policies | Shifa A Hayat" },
      { property: "og:url", content: "https://shifa-a-hayat.com/policies" },
    ],
    links: [{ rel: "canonical", href: "https://shifa-a-hayat.com/policies" }],
  }),
  component: PoliciesPage,
});

function PoliciesPage() {
  const searchParams = Route.useSearch();
  const [activeTab, setActiveTab] = useState<
    "shipping" | "refund" | "privacy" | "terms" | "compliance"
  >(searchParams.tab || "shipping");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            पारदर्शिता एवं विश्वास
          </span>
          <h1 className="font-serif text-3xl font-bold text-foreground mt-1">
            स्टोर नीतियां एवं वैधानिक नियम (Store Policies)
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border mb-8 gap-2 overflow-x-auto scrollbar-none pb-1 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab("shipping")}
            className={`flex items-center gap-1.5 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "shipping"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>शिपिंग एवं डिलीवरी नीति</span>
          </button>

          <button
            onClick={() => setActiveTab("refund")}
            className={`flex items-center gap-1.5 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "refund"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>रिटर्न एवं रिफंड नीति</span>
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-1.5 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "privacy"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>प्राइवेसी एवं गोपनीयता</span>
          </button>

          <button
            onClick={() => setActiveTab("terms")}
            className={`flex items-center gap-1.5 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "terms"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>नियम एवं शर्तें (Terms)</span>
          </button>

          <button
            onClick={() => setActiveTab("compliance")}
            className={`flex items-center gap-1.5 py-3 px-4 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "compliance"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>चिकित्सा डिस्क्लेमर</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-xs space-y-6 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          {activeTab === "shipping" && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                शिपिंग एवं डिलीवरी नीति (Shipping Policy)
              </h2>
              <p>
                <strong>1. डिलीवरी का क्षेत्र:</strong> शिफा ए हयात पूरे भारत (All India) में प्रतिष्ठित एक्सप्रेस कूरियर सेवाओं (DTDC, Delhivery, Speed Post आदि) के माध्यम से पार्सल भेजता है।
              </p>
              <p>
                <strong>2. डिलीवरी समय सीमा:</strong> ऑर्डर कन्फर्म होने के 24 से 48 घंटे के भीतर पार्सल प्रेषित कर दिया जाता है। मेट्रो शहरों में 3-4 दिन तथा अन्य स्थानों पर 4-6 कार्यदिवस में डिलीवरी हो जाती है।
              </p>
              <p>
                <strong>3. डिलीवरी शुल्क:</strong> ₹499 या उससे अधिक के सभी ऑर्डर्स पर ऑल इंडिया फ्री डिलीवरी उपलब्ध है। ₹499 से कम के ऑर्डर्स पर केवल ₹49 का नाममात्र कूरियर शुल्क लागू होता है।
              </p>
              <p>
                <strong>4. गोपनीय पैकिंग (Discreet Packaging):</strong> आपकी निजता का पूर्ण सम्मान करते हुए पार्सल को सादे और मजबूत डिब्बे में पैक किया जाता है। पार्सल के बाहरी लेबल पर केवल कूरियर कोड होता है, कोई भी उत्पाद या बीमारी का नाम नहीं लिखा जाता।
              </p>
            </div>
          )}

          {activeTab === "refund" && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                रिटर्न एवं रिफंड नीति (Return & Refund Policy)
              </h2>
              <p>
                <strong>1. क्षतिग्रस्त पार्सल:</strong> यदि डिलीवरी के समय पार्सल टूटा या क्षतिग्रस्त मिले, तो कृपया कूरियर स्वीकार न करें या पार्सल खोलने का छोटा वीडियो बनाकर 24 घंटे के भीतर हमारे WhatsApp नंबर 9586037331 पर भेजें। हम तुरंत नया पार्सल मुफ्त भेजेंगे।
              </p>
              <p>
                <strong>2. हर्बल एवं दवा उत्पाद:</strong> स्वच्छता एवं सुरक्षा कारणों से, सील टूटी या उपयोग की गई आयुर्वेदिक व यूनानी दवाओं की वापसी स्वीकार नहीं की जाती है।
              </p>
              <p>
                <strong>3. रिफंड प्रक्रिया:</strong> यदि कोई ऑनलाइन भुगतान किया गया ऑर्डर प्रेषण (Dispatch) से पहले रद्द किया जाता है, तो पूरी राशि 3-5 कार्यदिवसों में आपके मूल भुगतान खाते में लौटा दी जाएगी।
              </p>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                प्राइवेसी एवं डेटा सुरक्षा (Privacy Policy)
              </h2>
              <p>
                <strong>1. व्यक्तिगत डेटा का उपयोग:</strong> आपका नाम, मोबाइल नंबर और पता केवल आपके ऑर्डर की डिलीवरी और हकीम जी द्वारा परामर्श प्रदान करने के उद्देश्य से ही उपयोग किया जाता है।
              </p>
              <p>
                <strong>2. डेटा की गोपनीयता:</strong> हम आपकी किसी भी जानकारी को किसी तीसरे पक्ष (Third party) या मार्केटिंग एजेंसी को साझा या विक्रय नहीं करते हैं।
              </p>
              <p>
                <strong>3. सुरक्षित संपर्क:</strong> WhatsApp या कॉल पर आपकी स्वास्थ्य समस्या के बारे में की गई सभी बातचीत हकीम जी और आपके बीच पूर्णतः गोपनीय रहती है।
              </p>
            </div>
          )}

          {activeTab === "terms" && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                नियम एवं शर्तें (Terms & Conditions)
              </h2>
              <p>
                1. Shifa A Hayat की वेबसाइट का उपयोग करके आप हमारी नियमों और शर्तों से सहमत होते हैं।
              </p>
              <p>
                2. कैश ऑन डिलीवरी (COD) ऑर्डर बुक करते समय कृपया सही पता और सक्रिय फोन नंबर ही प्रदान करें ताकि कूरियर डिलीवरी में रुकावट न आए।
              </p>
              <p>
                3. सभी बौद्धिक संपदा अधिकार, ब्रांड नाम, लोगो और पोस्टर सामग्री Shifa A Hayat के सुरक्षित अधिकार हैं।
              </p>
            </div>
          )}

          {activeTab === "compliance" && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                वैधानिक चिकित्सा अस्वीकरण (Compliance & Health Disclaimer)
              </h2>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-900 dark:text-amber-200">
                <p className="font-semibold mb-1">
                  महत्वपूर्ण वैधानिक सूचना:
                </p>
                <p>
                  Shifa A Hayat द्वारा प्रदान किए जाने वाले उत्पाद शास्त्रीय आयुर्वेदिक एवं यूनानी परंपरा के अनुसार शुद्ध प्राकृतिक जड़ी-बूटियों से तैयार किए जाते हैं।
                </p>
              </div>
              <p>
                • किसी भी आयुर्वेदिक या यूनानी उत्पाद का प्रभाव प्रत्येक व्यक्ति की शारीरिक संरचना, पाचन शक्ति, उम्र और मिजाज के अनुसार भिन्न हो सकता है।
              </p>
              <p>
                • यह उत्पाद किसी गंभीर आपातकालीन चिकित्सकीय स्थिति का विकल्प नहीं हैं। गंभीर या जटिल बीमारियों में अपने नजदीकी पंजीकृत चिकित्सक से जांच कराना आवश्यक है।
              </p>
              <p>
                • गर्भवती महिलाएं, स्तनपान कराने वाली माताएं अथवा पहले से किसी गंभीर बीमारी की नियमित दवा ले रहे व्यक्ति सेवन से पूर्व हकीम जी अथवा अपने डॉक्टर से अवश्य परामर्श लें।
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
