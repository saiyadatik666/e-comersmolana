import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useStore, formatWhatsAppUrl } from "@/context/StoreContext";
import {
  Phone,
  MessageCircle,
  MapPin,
  Mail,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const { settings } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !message) return;
    setSent(true);
    toast.success("आपका संदेश प्राप्त हो गया है। हकीम जी जल्द ही आपसे संपर्क करेंगे।");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2 sm:space-y-3">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            सीधा संपर्क एवं परामर्श
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-foreground">
            हकीम जी से मुफ्त सलाह प्राप्त करें
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            अपनी बीमारी या दवा के संबंध में कोई भी सवाल पूछें। आपकी जानकारी पूर्णतः गोपनीय रखी जाती है।
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Contact Details Card */}
          <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-4 sm:p-8 space-y-6 shadow-xs">
            <h3 className="font-serif text-xl font-bold text-foreground border-b border-border pb-3">
              दुकान का पता व संपर्क
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">पता (Clinic Address)</span>
                  <p className="text-muted-foreground mt-0.5">
                    {settings.storeName}<br />
                    {settings.address}, {settings.city}, {settings.state} - 385001, {settings.country}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">सीधा फोन नंबर</span>
                  <a href={`tel:${settings.phone}`} className="text-primary font-semibold hover:underline mt-0.5 block">
                    {settings.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">WhatsApp हेल्पलाइन</span>
                  <a
                    href={formatWhatsAppUrl(
                      settings.whatsapp,
                      "السلام علیکم Hakeem Ji, I need consultation."
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
                    सोमवार से रविवार: सुबह 9:00 बजे से रात 9:00 बजे तक
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={formatWhatsAppUrl(
                  settings.whatsapp,
                  "السلام علیکم Hakim Inayat Ji, please help with medical guidance."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>सीधे WhatsApp पर बात करें</span>
              </a>
            </div>
          </div>

          {/* Consultation Form */}
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs">
            {sent ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground">
                  संदेश भेज दिया गया है!
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  हकीम इनायत अहमदी जल्द ही आपके दिए गए नंबर पर संपर्क करेंगे। यदि आवश्यक हो तो आप सीधे WhatsApp पर भी संदेश लिख सकते हैं।
                </p>
                <Button onClick={() => setSent(false)} variant="outline" size="sm" className="rounded-xl text-xs">
                  अन्य संदेश भेजें
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-serif text-xl font-bold text-foreground border-b border-border pb-3">
                  परामर्श फॉर्म (Send an Inquiry)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">आपका नाम *</Label>
                    <Input
                      required
                      placeholder="उदा: मोहम्मद रफ़ीक"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-xs bg-secondary/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">मोबाइल नंबर *</Label>
                    <Input
                      required
                      type="tel"
                      placeholder="उदा: 98250 12345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="text-xs bg-secondary/40"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">रोग / समस्या का विषय</Label>
                  <Input
                    placeholder="उदा: मर्दाना कमजोरी, गैस, घुटनों का दर्द, हेअर फॉल..."
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    className="text-xs bg-secondary/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">अपनी समस्या का विवरण *</Label>
                  <textarea
                    required
                    rows={4}
                    placeholder="कृपया अपनी उम्र और समस्या कितने समय से है, संक्षेप में लिखें..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-border bg-secondary/40"
                  />
                </div>

                <Button type="submit" className="w-full rounded-2xl font-bold text-xs py-5">
                  <Send className="w-4 h-4 mr-2" />
                  <span>परामर्श अनुरोध भेजें (Send Inquiry)</span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
