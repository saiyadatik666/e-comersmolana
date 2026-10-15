import React from "react";
import { Link } from "@tanstack/react-router";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import {
  Sparkles,
  Phone,
  MessageCircle,
  MapPin,
  Mail,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Lock,
} from "lucide-react";

export const Footer: React.FC = () => {
  const { settings } = useStore();

  return (
    <footer className="bg-stone-900 text-stone-200 border-t border-stone-800">
      {/* Trust & Guarantee Highlights */}
      <div className="border-b border-stone-800 bg-stone-950/60 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-stone-900/50 border border-stone-800/60">
            <div className="w-11 h-11 rounded-lg bg-emerald-900/40 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-700/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">100% शुद्ध आयुर्वेदिक</h4>
              <p className="text-xs text-stone-400">प्राकृतिक जड़ी-बूटी से तैयार नुस्खे</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-stone-900/50 border border-stone-800/60">
            <div className="w-11 h-11 rounded-lg bg-amber-900/40 text-amber-400 flex items-center justify-center shrink-0 border border-amber-700/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">ऑल इंडिया कूरियर सेवा</h4>
              <p className="text-xs text-stone-400">कैश ऑन डिलीवरी (COD) उपलब्ध</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-stone-900/50 border border-stone-800/60">
            <div className="w-11 h-11 rounded-lg bg-blue-900/40 text-blue-400 flex items-center justify-center shrink-0 border border-blue-700/30">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">गोपनीय पैकिंग (Discreet)</h4>
              <p className="text-xs text-stone-400">पार्सल पर उत्पाद का नाम नहीं छपता</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-stone-900/50 border border-stone-800/60">
            <div className="w-11 h-11 rounded-lg bg-emerald-900/40 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-700/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">हकीम जी से मुफ्त परामर्श</h4>
              <p className="text-xs text-stone-400">WhatsApp पर सीधे सवाल पूछें</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-amber-300 border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif text-2xl font-bold tracking-tight text-white">
                  Shifa A Hayat
                </span>
                <p className="text-xs text-amber-400/90 font-medium">
                  शिफा ए हयात • आयुर्वेदिक एवं यूनानी सेंटर
                </p>
              </div>
            </div>

            <p className="text-sm text-stone-400 leading-relaxed pr-4">
              हकीम इनायत अहमदी (इनायत पालनपुरी) के मार्गदर्शन में पारंपरिक भारतीय यूनानी व आयुर्वेदिक जड़ी-बूटियों के प्रमाणित नुस्खे। हमारा उद्देश्य बिना हानिकारक रसायनों के शुद्ध सेहत और खुशहाल जीवन प्रदान करना है।
            </p>

            <div className="pt-2 space-y-2 text-sm text-stone-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {settings.address}, {settings.city}, {settings.state}, {settings.country}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>फोन / ऑर्डर: {settings.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={formatWhatsAppUrl(
                    settings.whatsapp,
                    "السلام علیکم Hakeem Ji, I want consultation regarding herbal products."
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors"
                >
                  WhatsApp परामर्श: +91 {settings.whatsapp}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ईमेल: {settings.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 border-b border-stone-800 pb-2">
              प्रमुख श्रेणियां
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li>
                <Link to="/shop" search={{ category: "mens-wellness" }} className="hover:text-emerald-400 transition-colors">
                  पुरुष स्वास्थ्य व ताकत
                </Link>
              </li>
              <li>
                <Link to="/shop" search={{ category: "digestive-care" }} className="hover:text-emerald-400 transition-colors">
                  गैस, कब्ज व उदर रोग
                </Link>
              </li>
              <li>
                <Link to="/shop" search={{ category: "joint-pain" }} className="hover:text-emerald-400 transition-colors">
                  कमर व जोड़ों का दर्द
                </Link>
              </li>
              <li>
                <Link to="/shop" search={{ category: "classical-tonics" }} className="hover:text-emerald-400 transition-colors">
                  आबे हयात व अर्क-ए-अंबर
                </Link>
              </li>
              <li>
                <Link to="/shop" search={{ category: "skin-hair" }} className="hover:text-emerald-400 transition-colors">
                  हेअर ऑयल व हूर क्रीम
                </Link>
              </li>
              <li>
                <Link to="/shop" search={{ category: "womens-health" }} className="hover:text-emerald-400 transition-colors">
                  स्त्री रोग व लिकोरिया
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service & Account */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 border-b border-stone-800 pb-2">
              ग्राहक सहायता
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li>
                <Link to="/account" className="hover:text-emerald-400 transition-colors">
                  माय अकाउंट व ऑर्डर हिस्ट्री
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-emerald-400 transition-colors">
                  शॉपिंग कार्ट
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-emerald-400 transition-colors">
                  हकीम जी का परिचय
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-emerald-400 transition-colors">
                  सहायता केंद्र व FAQ (Help Center)
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-amber-400 transition-colors text-amber-400/80 font-medium">
                  एडमिन पोर्टल (Store Admin)
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Compliance */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 border-b border-stone-800 pb-2">
              नीतियां एवं नियम
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li>
                <Link to="/policies" search={{ tab: "shipping" }} className="hover:text-emerald-400 transition-colors">
                  शिपिंग व डिलीवरी नीति
                </Link>
              </li>
              <li>
                <Link to="/policies" search={{ tab: "refund" }} className="hover:text-emerald-400 transition-colors">
                  रिटर्न एवं रिफंड नीति
                </Link>
              </li>
              <li>
                <Link to="/policies" search={{ tab: "privacy" }} className="hover:text-emerald-400 transition-colors">
                  प्राइवेसी पॉलिसी
                </Link>
              </li>
              <li>
                <Link to="/policies" search={{ tab: "terms" }} className="hover:text-emerald-400 transition-colors">
                  नियम व शर्तें (Terms)
                </Link>
              </li>
              <li>
                <Link to="/policies" search={{ tab: "compliance" }} className="hover:text-emerald-400 transition-colors">
                  वैधानिक चिकित्सा डिस्क्लेमर
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Statutory Compliance Medical Disclaimer */}
        <div className="mt-12 pt-6 border-t border-stone-800 text-xs text-stone-500 leading-relaxed space-y-2">
          <p className="font-semibold text-stone-400">
            वैधानिक सूचना एवं चिकित्सा अस्वीकरण (Statutory Health Disclaimer):
          </p>
          <p>
            Shifa A Hayat के सभी उत्पाद पारंपरिक भारतीय आयुर्वेद एवं यूनानी पद्धति के अनुसार प्राकृतिक जड़ी-बूटियों से तैयार किए जाते हैं। किसी भी हर्बल नुस्खे का प्रभाव हर व्यक्ति की शारीरिक प्रकृति (मिज़ाज/दोष) के अनुसार अलग हो सकता है। यह उत्पाद किसी गंभीर आपातकालीन चिकित्सकीय स्थिति का विकल्प नहीं हैं। उपयोग से पूर्व किसी योग्य चिकित्सक या हकीम से सलाह लेना उचित है।
          </p>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-6 pt-6 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            © {new Date().getFullYear()} Shifa A Hayat (शिफा ए हयात). All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-stone-400">
            <span>Palanpur, Gujarat • Cash on Delivery Available</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
