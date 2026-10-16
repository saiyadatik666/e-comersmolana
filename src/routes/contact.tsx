import React, { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Search,
  HelpCircle,
  ShoppingBag,
  Truck,
  RotateCcw,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Info,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      {
        title: "ग्राहक सेवा, सहायता केंद्र एवं FAQ — Shifa A Hayat",
      },
      {
        name: "description",
        content:
          "शिफा ए हयात ग्राहक सहायता केंद्र। उत्पाद खोज, कार्ट, कूपन, फ्री शिपिंग, WhatsApp ऑर्डर, अक्सर पूछे जाने वाले सवाल (FAQ) और हकीम इनायत अहमदी से मुफ्त परामर्श।",
      },
      { property: "og:title", content: "Customer Help Center & FAQ | Shifa A Hayat" },
      { property: "og:url", content: "https://shifa-a-hayat.com/contact" },
    ],
    links: [{ rel: "canonical", href: "https://shifa-a-hayat.com/contact" }],
  }),
  component: ContactAndHelpCenterPage,
});

interface FAQItem {
  id: string;
  category: "ordering" | "shipping" | "products" | "orders";
  categoryHindi: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "faq-1",
    category: "ordering",
    categoryHindi: "ऑर्डर व भुगतान",
    question: "कैश ऑन डिलीवरी (COD) की क्या सुविधा है?",
    answer:
      "हाँ, शिफा ए हयात द्वारा पूरे भारत में कैश ऑन डिलीवरी (COD) उपलब्ध कराई जाती है। पार्सल मिलने पर आप कूरियर डिलीवरी एजेंट को नकद भुगतान कर सकते हैं। चेकआउट के समय COD विकल्प चुनें।",
  },
  {
    id: "faq-2",
    category: "ordering",
    categoryHindi: "ऑर्डर व भुगतान",
    question: "WhatsApp द्वारा सीधा ऑर्डर कैसे किया जाता है?",
    answer:
      "आप किसी भी उत्पाद विवरण पृष्ठ पर 'WhatsApp पर ऑर्डर करें' बटन दबा सकते हैं, या चेकआउट फॉर्म भरकर 'WhatsApp सीधा ऑर्डर' चुन सकते हैं। इससे हकीम जी के अधिकृत नंबर (+91 95860 37331) पर पूर्व-लिखित संदेश के साथ चैट खुलती है जहाँ आप सीधे ऑर्डर की पुष्टि कर सकते हैं।",
  },
  {
    id: "faq-3",
    category: "ordering",
    categoryHindi: "ऑर्डर व भुगतान",
    question: "कूपन कोड कैसे लागू करें और छूट कैसे मिलती है?",
    answer:
      "शॉपिंग कार्ट या चेकआउट पृष्ठ पर कूपन इनपुट में 'SHIFA10' दर्ज करें और 'लागू करें' पर क्लिक करें। वैध कूपन होने पर कुल राशि पर तुरंत 10% की छूट लागू हो जाएगी।",
  },
  {
    id: "faq-4",
    category: "shipping",
    categoryHindi: "शिपिंग व डिलीवरी",
    question: "फ्री शिपिंग का क्या नियम है और सामान्य शिपिंग शुल्क कितना है?",
    answer:
      "₹499 या उससे अधिक के सभी ऑर्डर्स पर शिपिंग पूर्णतः निःशुल्क (FREE Delivery) है। ₹499 से कम मूल्य के ऑर्डर्स पर ₹49 का मानक शिपिंग शुल्क लगता है।",
  },
  {
    id: "faq-5",
    category: "shipping",
    categoryHindi: "शिपिंग व डिलीवरी",
    question: "पार्सल डिलीवरी में सामान्यतः कितना समय लगता है?",
    answer:
      "हकीम जी द्वारा ऑर्डर की पुष्टि होने के उपरांत सामान्यतः 3 से 6 कार्यदिवसों में पार्सल आपके दिए गए पते पर पहुँच जाता है। सुदूर या ग्रामीण क्षेत्रों में कूरियर सेवा के अनुसार 1-2 दिन का अतिरिक्त समय लग सकता है।",
  },
  {
    id: "faq-6",
    category: "shipping",
    categoryHindi: "शिपिंग व डिलीवरी",
    question: "क्या पार्सल की पैकेजिंग गोपनीय (Discreet Packaging) होती है?",
    answer:
      "जी हाँ, आपकी पूर्ण निजता का सम्मान करते हुए सभी पार्सल सादे, सुरक्षित पैकेजिंग में भेजे जाते हैं। बाहरी कूरियर लेबल पर केवल आपका नाम व पता होता है; किसी रोग या दवा का नाम बाहर अंकित नहीं किया जाता।",
  },
  {
    id: "faq-7",
    category: "products",
    categoryHindi: "दवा व गुणवत्ता",
    question: "क्या शिफा ए हयात के नुस्खों का कोई साइड इफेक्ट है?",
    answer:
      "नहीं। हकीम इनायत अहमदी साहब के सभी 21 हर्बल नुस्खे पारंपरिक भारतीय आयुर्वेदिक व यूनानी जड़ी-बूटियों (जैसे जाफरान, अर्क, बादाम रोगन, प्राकृतिक भस्म) से तैयार किए जाते हैं। इनमें कोई कृत्रिम स्टेरॉयड या हानिकारक केमिकल नहीं होता।",
  },
  {
    id: "faq-8",
    category: "products",
    categoryHindi: "दवा व गुणवत्ता",
    question: "दवा की सही खुराक (Dosage) और सेवन विधि कैसे जानें?",
    answer:
      "प्रत्येक उत्पाद के विवरण पृष्ठ पर स्पष्ट सेवन विधि (जैसे 1-2 गोली गुनगुने दूध या पानी से) दी गई है। इसके अतिरिक्त, यदि आपको कोई विशेष स्वास्थ्य स्थिति है, तो आप WhatsApp (+91 95860 37331) पर हकीम जी से व्यक्तिगत मार्गदर्शन ले सकते हैं।",
  },
  {
    id: "faq-9",
    category: "products",
    categoryHindi: "दवा व गुणवत्ता",
    question: "वेबसाइट पर दिए गए 21 उत्पादों के दाम क्या प्रमाणित हैं?",
    answer:
      "हाँ, सभी 21 उत्पादों के मूल्य हकीम जी के मूल प्रचार पोस्टरों व आधिकारिक पैकेजिंग के अनुसार प्रमाणित हैं (जैसे अर्क आबे हयात ₹250, तनावी नाभि तैल ₹200)। उत्पाद पृष्ठ पर 'पोस्टर प्रमाणित' लेबल देखकर आप मूल पोस्टर का उच्च-रिज़ॉल्यूशन चित्र भी देख सकते हैं।",
  },
  {
    id: "faq-10",
    category: "orders",
    categoryHindi: "अकाउंट व रिकॉर्ड",
    question: "मैं अपने पिछले ऑर्डर्स कहाँ देख सकता हूँ?",
    answer:
      "यदि आपने इस डिवाइस के ब्राउज़र से चेकआउट किया है, तो आप 'माय अकाउंट' (/account) पेज पर जाकर अपने हालिया ऑर्डर्स की सूची, तारीख और मूल्य देख सकते हैं। यह डेटा आपकी डिवाइस के ब्राउज़र में सुरक्षित रहता है।",
  },
  {
    id: "faq-11",
    category: "orders",
    categoryHindi: "अकाउंट व रिकॉर्ड",
    question: "ब्राउज़र में दिखने वाले ऑर्डर और व्यावसायिक पुष्टि में क्या अंतर है?",
    answer:
      "चेकआउट पूरा करने पर एक स्थानीय ऑर्डर रिकॉर्ड बनता है। वास्तविक डिलीवरी आरंभ करने के लिए हकीम जी या हमारी टीम WhatsApp/कॉल द्वारा आपसे संपर्क कर पते व उपलब्धता की पुष्टि करती है। जब तक पुष्टि न हो, ऑर्डर को फाइनल डिस्पैच न समझें।",
  },
  {
    id: "faq-12",
    category: "shipping",
    categoryHindi: "शिपिंग व डिलीवरी",
    question: "यदि उत्पाद क्षतिग्रस्त (Damaged) या गलत पहुंचे तो क्या नीति है?",
    answer:
      "यदि पार्सल क्षतिग्रस्त या सील टूटी हुई मिलती है, तो प्राप्ति के 7 दिनों के भीतर पार्सल की फोटो WhatsApp (+91 95860 37331) पर भेजें। हमारी 7-दिवसीय रिटर्न नीति के अंतर्गत प्रतिस्थापन (Replacement) या उचित समाधान प्रदान किया जाता है।",
  },
];

interface ContactFormErrors {
  name?: string | undefined;
  phone?: string | undefined;
  message?: string | undefined;
}

function ContactAndHelpCenterPage() {
  const { settings } = useStore();

  // Consultation Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("स्वास्थ्य परामर्श");
  const [message, setMessage] = useState("");
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({});
  const [preparedWhatsAppUrl, setPreparedWhatsAppUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // FAQ Search & Filter State
  const [faqSearch, setFaqSearch] = useState("");
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<
    "all" | "ordering" | "shipping" | "products" | "orders"
  >("all");

  // Order Lookup Assistant State
  const [orderLookupId, setOrderLookupId] = useState("");

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
        faq.answer.toLowerCase().includes(faqSearch.toLowerCase());

      const matchesCat =
        selectedFaqCategory === "all" || faq.category === selectedFaqCategory;

      return matchesSearch && matchesCat;
    });
  }, [faqSearch, selectedFaqCategory]);

  const validateForm = (): boolean => {
    const errors: ContactFormErrors = {};
    if (!name || name.trim().length < 2) {
      errors.name = "कृपया अपना पूरा नाम लिखें (कम से कम 2 अक्षर)।";
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      errors.phone = "कृपया वैध 10-अंकीय मोबाइल नंबर दर्ज करें।";
    }

    if (!message || message.trim().length < 5) {
      errors.message = "कृपया अपनी समस्या या सवाल कम से कम 5 अक्षरों में लिखें।";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("कृपया फॉर्म में दी गई त्रुटियों को सुधारें।");
      return;
    }

    const consultationText = `السلام علیکم Hakeem Ji,

नाम: ${name.trim()}
मोबाइल: ${phone.trim()}
विषय: ${category}
विवरण: ${message.trim()}

कृपया मुझे उचित मार्गदर्शन व नुस्खा बताएं।`;

    const waUrl = formatWhatsAppUrl(settings.whatsapp, consultationText);
    setPreparedWhatsAppUrl(waUrl);

    // Open WhatsApp in a new tab
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }

    toast.success("परामर्श संदेश WhatsApp के लिए तैयार है!");
  };

  const handleCopyMessage = () => {
    const consultationText = `السلام علیکم Hakeem Ji,
नाम: ${name.trim()}
मोबाइल: ${phone.trim()}
विषय: ${category}
विवरण: ${message.trim()}`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(consultationText);
      setCopied(true);
      toast.success("संदेश क्लिपबोर्ड में कॉपी हो गया!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOrderLookupWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = orderLookupId.trim();
    if (!cleanId) {
      toast.error("कृपया अपना ऑर्डर नंबर दर्ज करें।");
      return;
    }

    const orderQuery = `السلام علیکم Hakeem Ji, मैं अपने Shifa A Hayat ऑर्डर #${cleanId} की स्थिति जानना चाहता हूँ। कृपया विवरण दें।`;
    const waUrl = formatWhatsAppUrl(settings.whatsapp, orderQuery);

    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-12">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1">
            ग्राहक सहायता एवं FAQ
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            हम आपकी सहायता के लिए उपस्थित हैं
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            ऑर्डर प्रक्रिया, शिपिंग नियम, कूपन छूट, या हकीम इनायत अहमदी जी से व्यक्तिगत मुफ्त स्वास्थ्य परामर्श — सभी आवश्यक जानकारियां यहाँ उपलब्ध हैं।
          </p>
        </div>

        {/* Quick Help Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href={formatWhatsAppUrl(
              settings.whatsapp,
              "السلام علیکم Hakeem Ji, I need assistance with herbal products."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <MessageCircle className="w-5 h-5 fill-white" />
              </div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                WhatsApp सहायता
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                हकीम जी से सीधा संवाद व परामर्श। संदेश लिखने पर त्वरित उत्तर।
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-4 flex items-center gap-1">
              +91 {settings.whatsapp} <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          <a
            href={`tel:${settings.phone}`}
            className="p-5 rounded-2xl bg-secondary/50 border border-border hover:border-primary/40 transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                फोन हेल्पलाइन
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ऑर्डर बुकिंग एवं दवा की जानकारी के लिए सीधे कॉल करें।
              </p>
            </div>
            <span className="text-xs font-semibold text-primary mt-4 flex items-center gap-1">
              +91 {settings.phone} <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </a>

          <div className="p-5 rounded-2xl bg-secondary/50 border border-border flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">परामर्श का समय</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                सोमवार से रविवार: सुबह 9:00 बजे से रात 9:00 बजे तक उपलब्ध।
              </p>
            </div>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-4">
              ✓ सप्ताह के सातों दिन खुला
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-secondary/50 border border-border flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">दवाखाना का पता</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {settings.storeName}, {settings.address}, {settings.city}, {settings.state} - 385001.
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground mt-4">
              पालनपुर, गुजरात (भारत)
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* HOW TO USE WEBSITE: STEP-BY-STEP USER GUIDES */}
        {/* ================================================================= */}
        <section className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                वेबसाइट गाइड: खरीदारी एवं ऑर्डर प्रक्रिया
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              वेबसाइट पर उपलब्ध सभी सुविधाओं का उपयोग कैसे करें, संक्षेप में समझें।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Guide 1 */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                चरण 1 • उत्पाद खोज व चयन
              </span>
              <h3 className="font-serif text-sm font-bold text-foreground">
                उत्पाद कैसे खोजें और जानकारी देखें?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                शीर्ष सर्च बार में किसी भी दवा का अंग्रेजी या हिंदी नाम लिखें (उदा. 'ज़ाफरानी गोल्ड' या 'दर्द')। आप <Link to="/shop" className="text-primary hover:underline font-semibold">दुकान (/shop)</Link> में 7 प्रमुख श्रेणियों से फ़िल्टर कर सकते हैं। उत्पाद विवरण पृष्ठ पर पैकेजिंग फोटो और मूल विरासत विज्ञापन पोस्टर दोनों देखे जा सकते हैं।
              </p>
            </div>

            {/* Guide 2 */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                चरण 2 • कार्ट, मात्रा व कूपन
              </span>
              <h3 className="font-serif text-sm font-bold text-foreground">
                कार्ट प्रबंधन और कूपन छूट
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                'कार्ट में जोड़ें' बटन दबाकर मात्रा 1 से 99 तक चुन सकते हैं। <Link to="/cart" className="text-primary hover:underline font-semibold">शॉपिंग कार्ट (/cart)</Link> में 'SHIFA10' कूपन कोड दर्ज करके 10% की छूट पाएं। ₹499 या उससे अधिक के ऑर्डर पर शिपिंग स्वतः निःशुल्क हो जाती है (अन्यथा ₹49 मानक शिपिंग शुल्क लगता है)।
              </p>
            </div>

            {/* Guide 3 */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                चरण 3 • WhatsApp द्वारा ऑर्डर
              </span>
              <h3 className="font-serif text-sm font-bold text-foreground">
                WhatsApp से ऑर्डर की पुष्टि कैसे करें?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                उत्पाद पृष्ठ पर 'WhatsApp पर ऑर्डर करें' या चेकआउट पर 'WhatsApp सीधा ऑर्डर' चुनें। आपका नाम, पता व दवा का नाम स्वतः एक संदेश में तैयार हो जाएगा। WhatsApp खुलने पर सेंड दबाएं। हकीम जी ऑर्डर की पुष्टि करेंगे।
              </p>
            </div>

            {/* Guide 4 */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                चरण 4 • ऑर्डर रिकॉर्ड्स व लाइव ट्रैकिंग
              </span>
              <h3 className="font-serif text-sm font-bold text-foreground">
                ऑर्डर स्थिति व लाइव ट्रैकिंग कैसे देखें?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                चेकआउट पूरा करने पर आपको एक अद्वितीय ऑर्डर आईडी (उदा: ORD-XXXX) प्राप्त होती है। आप हमारे समर्पित <Link to="/track-order" className="text-primary hover:underline font-semibold">ऑर्डर ट्रैकिंग पेज (/track-order)</Link> पर ऑर्डर आईडी और 10-अंकीय मोबाइल नंबर दर्ज कर वास्तविक समय में डिस्पैच और डाक/कूरियर प्रगति देख सकते हैं।
              </p>
            </div>
          </div>

          {/* Policy Links Strip */}
          <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground font-medium">विस्तृत नियम व शर्तें देखें:</span>
            <div className="flex items-center gap-3 flex-wrap">
              <Link to="/policies" search={{ tab: "shipping" }} className="text-primary hover:underline">
                शिपिंग नीति →
              </Link>
              <Link to="/policies" search={{ tab: "refund" }} className="text-primary hover:underline">
                7-दिवसीय रिटर्न नीति →
              </Link>
              <Link to="/policies" search={{ tab: "privacy" }} className="text-primary hover:underline">
                प्राइवेसी पॉलिसी →
              </Link>
              <Link to="/policies" search={{ tab: "terms" }} className="text-primary hover:underline">
                नियम व शर्तें →
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* FREQUENTLY ASKED QUESTIONS (FAQ) SECTION */}
        {/* ================================================================= */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>संदेह निवारण एवं उत्तर</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              अक्सर पूछे जाने वाले सवाल (FAQ)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              दवा मंगाने, डिलीवरी, खुराक और स्टोर नीतियों से जुड़े प्रमुख सवालों के सत्यापित उत्तर।
            </p>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Input
                type="text"
                name="faqQuery"
                id="faq-search-input"
                aria-label="अक्सर पूछे जाने वाले सवालों में खोजें (Search FAQ)"
                placeholder="सवालों में खोजें (उदा. 'डिलीवरी', 'COD', 'साइड इफेक्ट', 'कूपन')..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="pl-9 text-xs rounded-xl h-10 bg-card"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
              <button
                onClick={() => setSelectedFaqCategory("all")}
                className={`py-1.5 px-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedFaqCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                सभी ({FAQS.length})
              </button>
              <button
                onClick={() => setSelectedFaqCategory("ordering")}
                className={`py-1.5 px-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedFaqCategory === "ordering"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                ऑर्डर व भुगतान
              </button>
              <button
                onClick={() => setSelectedFaqCategory("shipping")}
                className={`py-1.5 px-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedFaqCategory === "shipping"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                शिपिंग
              </button>
              <button
                onClick={() => setSelectedFaqCategory("products")}
                className={`py-1.5 px-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedFaqCategory === "products"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                दवा व खुराक
              </button>
              <button
                onClick={() => setSelectedFaqCategory("orders")}
                className={`py-1.5 px-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedFaqCategory === "orders"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                अकाउंट
              </button>
            </div>
          </div>

          {/* Accordion List */}
          <div className="max-w-3xl mx-auto">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-10 bg-card border border-border rounded-2xl space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  आपकी खोज से संबंधित कोई सवाल नहीं मिला।
                </p>
                <button
                  onClick={() => {
                    setFaqSearch("");
                    setSelectedFaqCategory("all");
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  सभी सवाल देखें
                </button>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-2.5">
                {filteredFaqs.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="border border-border rounded-2xl px-4 bg-card shadow-xs transition-colors"
                  >
                    <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline text-left py-4">
                      <div className="flex items-center gap-2 pr-2">
                        <span className="text-foreground">{faq.question}</span>
                        <Badge
                          variant="outline"
                          className="hidden sm:inline-flex text-[9px] text-muted-foreground shrink-0 border-border"
                        >
                          {faq.categoryHindi}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4 pt-1 border-t border-border/50">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* ORDER STATUS ASSISTANT & LOOKUP HELP */}
        {/* ================================================================= */}
        <section className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="border-b border-border pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                ऑर्डर सहायता व सत्यापन (Order Assistance)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                ऑर्डर नंबर द्वारा हकीम जी से सीधे स्थिति की जानकारी प्राप्त करें।
              </p>
            </div>
            <Link to="/account">
              <Button variant="outline" size="sm" className="rounded-xl text-xs">
                माय अकाउंट में ऑर्डर्स देखें →
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                • <strong>स्थानीय ब्राउज़र रिकॉर्ड्स</strong>: यदि आपने इस डिवाइस पर चेकआउट किया है, तो आपका ऑर्डर नंबर व विवरण <Link to="/account" className="text-primary hover:underline font-semibold">माय अकाउंट</Link> में सुरक्षित रहता है।
              </p>
              <p>
                • <strong>व्यापारिक पुष्टि</strong>: हमारा स्टोर स्वचालित गेटवे से पुष्टि नहीं करता। ऑर्डर की अंतिम पुष्टि हकीम जी द्वारा WhatsApp या फोन द्वारा संपर्क करने पर ही होती है।
              </p>
            </div>

            <form
              onSubmit={handleOrderLookupWhatsApp}
              className="md:col-span-5 flex flex-col sm:flex-row gap-2"
            >
              <Input
                name="orderId"
                id="order-lookup-input"
                aria-label="ऑर्डर स्थिति जांचने के लिए ऑर्डर नंबर दर्ज करें (Enter Order Number)"
                placeholder="ऑर्डर नंबर (उदा. 1728900...)"
                value={orderLookupId}
                onChange={(e) => setOrderLookupId(e.target.value)}
                className="text-xs rounded-xl"
              />
              <Button
                type="submit"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5 fill-white" />
                <span>स्थिति पूछें</span>
              </Button>
            </form>
          </div>
        </section>

        {/* ================================================================= */}
        {/* CONSULTATION & CONTACT FORM */}
        {/* ================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Clinic & Founder Details */}
          <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-border pb-3">
              <h2 className="font-serif text-xl font-bold text-foreground">
                दुकान व क्लिनिक विवरण
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                हकीम इनायत अहमदी (इनायत पालनपुरी) से सीधा संपर्क।
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">पता (Clinic Address)</span>
                  <p className="text-muted-foreground mt-0.5">
                    {settings.storeName}
                    <br />
                    {settings.address}, {settings.city}, {settings.state} - 385001, {settings.country}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">हेल्पलाइन फोन</span>
                  <a
                    href={`tel:${settings.phone}`}
                    className="text-primary font-semibold hover:underline mt-0.5 block"
                  >
                    +91 {settings.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">WhatsApp परामर्श</span>
                  <a
                    href={formatWhatsAppUrl(
                      settings.whatsapp,
                      "السلام علیکم Hakeem Ji, I need health consultation."
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mt-0.5 block"
                  >
                    +91 {settings.whatsapp} (चैट शुरू करें)
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">परामर्श का समय</span>
                  <p className="text-muted-foreground mt-0.5">
                    सुबह 9:00 बजे से रात 9:00 बजे तक (सप्ताह के सातों दिन)
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border text-xs space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                गोपनीयता का संकल्प
              </span>
              <p className="text-[11px] text-muted-foreground leading-normal">
                आपकी बीमारी, नाम या फोन नंबर किसी भी तीसरे पक्ष के साथ साझा नहीं किया जाता। सभी परामर्श पूर्णतः सुरक्षित और व्यक्तिगत रहते हैं।
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="border-b border-border pb-3 mb-5">
              <h2 className="font-serif text-xl font-bold text-foreground">
                परामर्श अनुरोध फॉर्म (Health Consultation)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                अपनी समस्या का विवरण लिखें। फॉर्म सबमिट करने पर यह WhatsApp में सुरक्षित तैयार होगा।
              </p>
            </div>

            {preparedWhatsAppUrl ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    आपका परामर्श संदेश तैयार है!
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    नीचे दिए गए बटन पर क्लिक करके सीधे हकीम जी के WhatsApp पर यह संदेश भेजें। यदि WhatsApp सीधे न खुले, तो आप संदेश कॉपी कर सकते हैं।
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <a
                    href={preparedWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>WhatsApp पर भेजें</span>
                  </a>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyMessage}
                    className="w-full sm:w-auto text-xs rounded-xl"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        <span>कॉपी हो गया!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        <span>संदेश कॉपी करें</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPreparedWhatsAppUrl(null);
                      setMessage("");
                    }}
                    className="w-full sm:w-auto text-xs rounded-xl"
                  >
                    नया संदेश लिखें
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">आपका पूरा नाम *</Label>
                    <Input
                      placeholder="उदा: मोहम्मद रफ़ीक"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                      }}
                      className={`text-xs ${formErrors.name ? "border-rose-500" : ""}`}
                    />
                    {formErrors.name && (
                      <p className="text-[10px] text-rose-600 font-medium">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">मोबाइल फोन नंबर *</Label>
                    <Input
                      type="tel"
                      placeholder="उदा: 98250 12345"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                      }}
                      className={`text-xs ${formErrors.phone ? "border-rose-500" : ""}`}
                    />
                    {formErrors.phone && (
                      <p className="text-[10px] text-rose-600 font-medium">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">परामर्श का विषय (Inquiry Topic)</Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-border bg-secondary/30 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="स्वास्थ्य परामर्श">सामान्य स्वास्थ्य व बीमारी परामर्श</option>
                    <option value="मर्दाना ताकत व कमजोरी">मर्दाना कमजोरी, वीर्य व ताकत समस्या</option>
                    <option value="पेट, गैस व पाचन रोग">पेट, गैस, कब्ज, एसिडिटी व बवासीर</option>
                    <option value="जोड़ों व कमर का दर्द">कमर, साइटिका व जोड़ों का दर्द</option>
                    <option value="दवा की खुराक व परहेज़">दवा की खुराक, विधि व परहेज़</option>
                    <option value="ऑर्डर पूछताछ">ऑर्डर स्थिति या बुकिंग पूछताछ</option>
                    <option value="अन्य">अन्य सामान्य पूछताछ</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">अपनी समस्या का संक्षेप विवरण *</Label>
                  <textarea
                    rows={4}
                    placeholder="कृपया अपनी उम्र और समस्या कितने समय से है, संक्षेप में लिखें..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (formErrors.message) setFormErrors({ ...formErrors, message: undefined });
                    }}
                    className={`w-full text-xs p-3 rounded-xl border bg-secondary/30 text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                      formErrors.message ? "border-rose-500" : "border-border"
                    }`}
                  />
                  {formErrors.message && (
                    <p className="text-[10px] text-rose-600 font-medium">{formErrors.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-5 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2 fill-white" />
                  <span>WhatsApp पर हकीम जी से परामर्श लें</span>
                </Button>

                <p className="text-[10px] text-muted-foreground text-center">
                  बटन दबाने पर आपके दिए विवरण के साथ सुरक्षित WhatsApp विंडो खुलेगी। कोई भी डेटा अनधिकृत सर्वर पर सेव नहीं होता।
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
