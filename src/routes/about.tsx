import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import {
  Sparkles,
  ShieldCheck,
  Award,
  Leaf,
  Heart,
  MessageCircle,
  Phone,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "हकीम इनायत अहमदी का परिचय (About Us) — Shifa A Hayat" },
      {
        name: "description",
        content:
          "शिफा खाना आयुर्वेदिक एवं यूनानी सेंटर, पालनपुर (गुजरात) के संस्थापक हकीम इनायत अहमदी (इनायत पालनपुरी) का परिचय एवं शुद्ध कुदरती इलाज की विरासत।",
      },
      { property: "og:title", content: "About Hakeem Inayat Ahmadi | Shifa A Hayat Heritage" },
      { property: "og:url", content: "https://shifa-a-hayat.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://shifa-a-hayat.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { settings } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-8 sm:space-y-12">
        {/* Heritage Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 text-xs font-semibold">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>हकीम इनायत अहमदी (इनायत पालनपुरी) की सेवा में</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-foreground leading-tight">
            शिफा ए हयात — शुद्ध कुदरती इलाज की विश्वसनीय पहचान
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            शिफा खाना आयुर्वेदिक एवं यूनानी सेंटर (पालनपुर, गुजरात) वर्षों से पारंपरिक जड़ी-बूटियों के अध्ययन और अनुसंधान से तैयार असरदार नुस्खों द्वारा लोगों को स्वस्थ जीवन प्रदान कर रहा है।
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-3xl p-6 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center mx-auto">
              <Leaf className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              100% शुद्ध जड़ी-बूटी
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              हम केवल प्रामाणिक हिमालयन एवं वनौषधियों, शुद्ध कश्मीरी ज़ाफरान और सोने-चांदी के वर्क का उपयोग करते हैं।
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              शास्त्रीय यूनानी नुस्खे
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              दवाएं प्राचीन ग्रंथों और व्यक्तिगत अनुभव के अनुसार संतुलित अनुपातों में तैयार की जाती हैं ताकि रोग जड़ से दूर हो।
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              सच्ची सलाह व ईमानदारी
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              हम झूठे वादे या भ्रामक दावे नहीं करते। बीमारी के कारण को समझकर सही परहेज़ और नुस्खे की सलाह दी जाती है।
            </p>
          </div>
        </div>

        {/* Hakim Ji Profile Card */}
        <div className="bg-stone-900 text-stone-100 rounded-3xl p-8 sm:p-12 border border-stone-800 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 text-center">
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-amber-400/40 mx-auto shadow-2xl bg-stone-950">
              <img
                src="/assets/molana/IMG-20261009-WA0023.jpg"
                alt="हकीम इनायत अहमदी (इनायत पालनपुरी) - संस्थापक"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <p className="font-serif font-bold text-amber-300 text-lg mt-4">
              हकीम इनायत अहमदी
            </p>
            <p className="text-xs text-stone-400">इनायत पालनपुरी • पालनपुर (गुजरात)</p>
          </div>

          <div className="md:col-span-7 space-y-4">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">
              "तंदुरुस्ती खुदा की सबसे बड़ी नेमत है"
            </h2>
            <p className="text-sm text-stone-300 leading-relaxed">
              हमारा मानना है कि सही खान-पान, प्राकृतिक परहेज और कुदरती जड़ी-बूटियों के माध्यम से शरीर अपने भीतर की बीमारियों को स्वयं ठीक करने की क्षमता रखता है।
            </p>
            <p className="text-sm text-stone-300 leading-relaxed">
              यदि आप मर्दाना कमजोरी, पेट व पाचन समस्या, जोड़ों के दर्द या किसी पुरानी बीमारी से परेशान हैं, तो आप बेझिझक सीधे मुझसे WhatsApp या कॉल पर अपनी समस्या साझा कर सकते हैं।
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href={formatWhatsAppUrl(
                  settings.whatsapp,
                  "السلام علیکم Hakeem Ji, I want to consult you."
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 text-xs">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span>WhatsApp पर परामर्श लें</span>
                </Button>
              </a>

              <Link to="/shop">
                <Button variant="outline" className="rounded-full border-stone-700 text-stone-300 hover:text-white px-6 text-xs">
                  <span>उत्पाद कैटलॉग देखें</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
