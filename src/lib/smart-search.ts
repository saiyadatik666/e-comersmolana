import { Product, CATEGORIES } from "@/data/products";

export interface SearchOptions {
  category?: string | undefined;
  priceRange?: "all" | "under-500" | "500-1000" | "above-1000" | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStockOnly?: boolean | undefined;
  sortBy?: "relevance" | "price-asc" | "price-desc" | "rating" | "featured" | undefined;
  limit?: number | undefined;
}

export interface SearchSuggestion {
  id: string;
  name: string;
  nameHindi: string;
  subtitle: string;
  category: string;
  categoryHindi: string;
  price: number;
  compareAtPrice?: number | undefined;
  image: string;
  posterImage?: string | undefined;
  packSize: string;
  inStock: boolean;
  score: number;
  matchedReason?: string | undefined;
}

export interface SearchResult {
  product: Product;
  score: number;
  matches: string[];
}

/**
 * Hindi Devanagari character normalization:
 * - Unifies Nukta forms (ज़ -> ज, फ़ -> फ, क़ -> क, ख़ -> ख, ग़ -> ग, ड़ -> ड, ढ़ -> ढ)
 * - Normalizes combining nukta mark (\u093C)
 * - Normalizes short and long vowel matras (ी <-> ि, ू <-> ु, ै <-> े)
 * - Normalizes nasalization (ँ <-> ं)
 */
export function normalizeHindi(text: string): string {
  if (!text) return "";
  let s = text.trim();

  // Replace precomposed nukta letters with basic consonants
  s = s
    .replace(/\u0958/g, "\u0915") // क़ -> क
    .replace(/\u0959/g, "\u0916") // ख़ -> ख
    .replace(/\u095A/g, "\u0917") // ग़ -> ग
    .replace(/\u095B/g, "\u091C") // ज़ -> ज
    .replace(/\u095C/g, "\u0921") // ड़ -> ड
    .replace(/\u095D/g, "\u0922") // ढ़ -> ढ
    .replace(/\u095E/g, "\u092B") // फ़ -> फ
    .replace(/\u095F/g, "\u092F"); // य़ -> य

  // Strip combining nukta mark (\u093C)
  s = s.replace(/\u093C/g, "");

  // Normalize chandrabindu (\u0901) to anusvara (\u0902)
  s = s.replace(/\u0901/g, "\u0902");

  // Normalize long matra to short matra for relaxed vowel matching
  s = s.replace(/\u0940/g, "\u093F"); // ी -> ि
  s = s.replace(/\u0942/g, "\u0941"); // ू -> ु
  s = s.replace(/\u0948/g, "\u0947"); // ै -> े

  // Normalize danda / punctuation
  s = s.replace(/[\u0964\u0965]/g, " ");

  return s;
}

/**
 * English & Transliteration phonetic normalization:
 * - Lowercase
 * - Collapse repeated letters (e.g. "zafraani" -> "zafrani", "tel" / "taill" -> "tail")
 * - Normalize phonetically interchangeable characters:
 *   - 'z' <-> 'j'
 *   - 'ph' <-> 'f'
 *   - 'q' <-> 'k' <-> 'c'
 */
export function normalizeEnglish(text: string): string {
  if (!text) return "";
  let s = text.toLowerCase().trim();

  // Strip punctuation and special symbols
  s = s.replace(/[^a-z0-9\s]/g, " ");

  // Normalizations for transliteration
  s = s
    .replace(/ph/g, "f")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ou/g, "u")
    .replace(/aa/g, "a")
    .replace(/suv/g, "sv")
    .replace(/w/g, "v")
    .replace(/kh/g, "k")
    .replace(/gh/g, "g")
    .replace(/th/g, "t")
    .replace(/dh/g, "d")
    .replace(/bh/g, "b")
    .replace(/sh/g, "s")
    .replace(/z/g, "j")
    .replace(/q/g, "k")
    .replace(/c(?=[iey])/g, "s")
    .replace(/c/g, "k");

  // Collapse consecutive identical letters (e.g. "kk" -> "k")
  s = s.replace(/([a-z])\1+/g, "$1");

  return s.replace(/\s+/g, " ").trim();
}

/**
 * Common Unani, Ayurvedic, and Hinglish keyword synonym dictionary.
 * Maps search concepts/keywords to product IDs, categories, or canonical terms.
 */
const UNANI_SYNONYM_MAP: Record<string, string[]> = {
  // Saffron & Zafrani Gold
  zafran: ["shifa-zafrani-gold", "mens-wellness"],
  zafrani: ["shifa-zafrani-gold", "mens-wellness"],
  jafran: ["shifa-zafrani-gold", "mens-wellness"],
  jafrani: ["shifa-zafrani-gold", "mens-wellness"],
  saffron: ["shifa-zafrani-gold"],
  kesar: ["shifa-zafrani-gold"],
  keshar: ["shifa-zafrani-gold"],
  ज़ाफरान: ["shifa-zafrani-gold"],
  ज़ाफरानी: ["shifa-zafrani-gold"],
  जाफरानी: ["shifa-zafrani-gold"],
  केसर: ["shifa-zafrani-gold"],

  // Pehlwan
  pehlwan: ["shifa-pehlwan-capsule", "mens-wellness"],
  pahalwan: ["shifa-pehlwan-capsule", "mens-wellness"],
  mushtari: ["shifa-pehlwan-capsule", "mens-wellness"],
  wrestler: ["shifa-pehlwan-capsule"],
  पहलवान: ["shifa-pehlwan-capsule"],

  // Habbe Hawa
  habb: ["shifa-habbe-hawa", "shifa-jiriyan-timing-pearls", "shifa-gas-ki-goliyan"],
  habbe: ["shifa-habbe-hawa", "shifa-jiriyan-timing-pearls"],
  hawa: ["shifa-habbe-hawa", "shifa-gas-ki-goliyan"],
  vayu: ["shifa-habbe-hawa", "shifa-gas-ki-goliyan", "digestive-care"],
  हब्बे: ["shifa-habbe-hawa"],
  हवा: ["shifa-habbe-hawa"],

  // Santan / Fertility
  santan: ["shifa-santaan-course", "womens-health"],
  santaan: ["shifa-santaan-course", "womens-health"],
  aulad: ["shifa-santaan-course", "womens-health"],
  fertility: ["shifa-santaan-course", "womens-health"],
  pregnancy: ["shifa-santaan-course", "womens-health"],
  infertility: ["shifa-santaan-course", "womens-health"],
  garbhadhan: ["shifa-santaan-course", "womens-health"],
  संतान: ["shifa-santaan-course"],
  औलाद: ["shifa-santaan-course"],

  // Hoor Night Cream
  hoor: ["shifa-hoor-night-cream", "skin-hair"],
  cream: ["shifa-hoor-night-cream", "skin-hair"],
  krim: ["shifa-hoor-night-cream", "skin-hair"],
  glow: ["shifa-hoor-night-cream", "skin-hair"],
  chehra: ["shifa-hoor-night-cream", "skin-hair"],
  fairness: ["shifa-hoor-night-cream", "skin-hair"],
  pimples: ["shifa-hoor-night-cream", "skin-hair"],
  blemishes: ["shifa-hoor-night-cream", "skin-hair"],
  face: ["shifa-hoor-night-cream", "skin-hair"],
  हूर: ["shifa-hoor-night-cream"],
  क्रीम: ["shifa-hoor-night-cream"],
  चेहरा: ["shifa-hoor-night-cream"],

  // Majoon & Mardanagi
  majoon: ["shifa-majun-mardangi", "classical-tonics", "mens-wellness"],
  majun: ["shifa-majun-mardangi", "classical-tonics", "mens-wellness"],
  mardanagi: ["shifa-majun-mardangi", "shifa-zafrani-gold", "mens-wellness"],
  mardana: ["shifa-majun-mardangi", "shifa-zafrani-gold", "mens-wellness"],
  sona: ["shifa-majun-mardangi", "shifa-zafrani-gold", "shifa-tiger-suwarna-bhasm"],
  chandi: ["shifa-majun-mardangi"],
  silver: ["shifa-majun-mardangi"],
  gold: ["shifa-zafrani-gold", "shifa-majun-mardangi", "shifa-tiger-suwarna-bhasm"],
  माजून: ["shifa-majun-mardangi"],
  मर्दानगी: ["shifa-majun-mardangi"],
  सोना: ["shifa-majun-mardangi", "shifa-zafrani-gold"],
  चांदी: ["shifa-majun-mardangi"],

  // Dimagi Tonic & Memory
  dimag: ["shifa-dimagi-tonic"],
  dimaag: ["shifa-dimagi-tonic"],
  dimagi: ["shifa-dimagi-tonic"],
  brain: ["shifa-dimagi-tonic"],
  memory: ["shifa-dimagi-tonic"],
  focus: ["shifa-dimagi-tonic"],
  yaaddasht: ["shifa-dimagi-tonic"],
  baccho: ["shifa-dimagi-tonic"],
  bachho: ["shifa-dimagi-tonic"],
  दिमाग: ["shifa-dimagi-tonic"],
  दिमागी: ["shifa-dimagi-tonic"],
  याददाश्त: ["shifa-dimagi-tonic"],

  // Jiryan & Timing
  jiryan: ["shifa-jiriyan-timing-pearls", "mens-wellness"],
  jiriyan: ["shifa-jiriyan-timing-pearls", "mens-wellness"],
  jiyan: ["shifa-jiriyan-timing-pearls", "mens-wellness"],
  ehtelam: ["shifa-jiriyan-timing-pearls", "mens-wellness"],
  ehtelaam: ["shifa-jiriyan-timing-pearls", "mens-wellness"],
  nightfall: ["shifa-jiriyan-timing-pearls", "mens-wellness"],
  timing: ["shifa-jiriyan-timing-pearls", "shifa-zafrani-gold", "shifa-majun-mardangi", "mens-wellness"],
  dhat: ["shifa-jiriyan-timing-pearls", "mens-wellness"],
  जिरियान: ["shifa-jiriyan-timing-pearls"],
  अहतिलाम: ["shifa-jiriyan-timing-pearls"],
  स्वप्नदोष: ["shifa-jiriyan-timing-pearls"],
  टाइमिंग: ["shifa-jiriyan-timing-pearls"],

  // Weight Cutter & Slimming
  weight: ["shifa-weight-cutter", "metabolic-care"],
  cutter: ["shifa-weight-cutter", "metabolic-care"],
  slimming: ["shifa-weight-cutter", "metabolic-care"],
  motapa: ["shifa-weight-cutter", "metabolic-care"],
  vajan: ["shifa-weight-cutter", "metabolic-care"],
  fat: ["shifa-weight-cutter", "metabolic-care"],
  वेट: ["shifa-weight-cutter"],
  मोटापा: ["shifa-weight-cutter"],
  वजन: ["shifa-weight-cutter"],

  // Digestive, Stomach, Kabz & Gas
  pet: ["shifa-pait-samasya-set", "shifa-gas-ki-goliyan", "digestive-care"],
  pait: ["shifa-pait-samasya-set", "shifa-gas-ki-goliyan", "digestive-care"],
  samasya: ["shifa-pait-samasya-set"],
  kabz: ["shifa-pait-samasya-set", "digestive-care"],
  qabz: ["shifa-pait-samasya-set", "digestive-care"],
  constipation: ["shifa-pait-samasya-set", "digestive-care"],
  churan: ["shifa-pait-samasya-set", "digestive-care"],
  hazma: ["shifa-pait-samasya-set", "shifa-gas-ki-goliyan", "digestive-care"],
  pachan: ["shifa-pait-samasya-set", "shifa-gas-ki-goliyan", "digestive-care"],
  acidity: ["shifa-gas-ki-goliyan", "shifa-pait-samasya-set", "digestive-care"],
  gas: ["shifa-gas-ki-goliyan", "shifa-pait-samasya-set", "digestive-care"],
  bloating: ["shifa-gas-ki-goliyan", "shifa-pait-samasya-set", "digestive-care"],
  पेट: ["shifa-pait-samasya-set", "shifa-gas-ki-goliyan"],
  कब्ज: ["shifa-pait-samasya-set"],
  गैस: ["shifa-gas-ki-goliyan", "shifa-pait-samasya-set"],
  पाचन: ["shifa-pait-samasya-set", "shifa-gas-ki-goliyan"],

  // Arq / Irq & Tonics
  arq: ["shifa-arq-abe-hayat", "shifa-arq-e-amber", "classical-tonics"],
  ark: ["shifa-arq-abe-hayat", "shifa-arq-e-amber", "classical-tonics"],
  arak: ["shifa-arq-abe-hayat", "shifa-arq-e-amber", "classical-tonics"],
  irq: ["shifa-arq-abe-hayat", "shifa-arq-e-amber", "classical-tonics"],
  irk: ["shifa-arq-abe-hayat", "shifa-arq-e-amber", "classical-tonics"],
  distillate: ["shifa-arq-abe-hayat", "shifa-arq-e-amber", "classical-tonics"],
  hayat: ["shifa-arq-abe-hayat", "classical-tonics"],
  abe: ["shifa-arq-abe-hayat", "classical-tonics"],
  ambar: ["shifa-arq-e-amber", "classical-tonics"],
  amber: ["shifa-arq-e-amber", "classical-tonics"],
  अर्क: ["shifa-arq-abe-hayat", "shifa-arq-e-amber"],
  इर्क: ["shifa-arq-abe-hayat"],
  अंबर: ["shifa-arq-e-amber"],

  // Oils & Hair / Body / Pain Oils
  tel: ["shifa-tanavai-tel", "shifa-hair-oil", "shifa-rahat-e-dard"],
  tail: ["shifa-tanavai-tel", "shifa-hair-oil", "shifa-rahat-e-dard"],
  taila: ["shifa-tanavai-tel", "shifa-hair-oil", "shifa-rahat-e-dard"],
  oil: ["shifa-tanavai-tel", "shifa-hair-oil", "shifa-rahat-e-dard"],
  malish: ["shifa-tanavai-tel", "shifa-rahat-e-dard"],
  roghan: ["shifa-tanavai-tel", "shifa-hair-oil"],
  hair: ["shifa-hair-oil", "skin-hair"],
  baal: ["shifa-hair-oil", "skin-hair"],
  dandruff: ["shifa-hair-oil", "skin-hair"],
  rusi: ["shifa-hair-oil", "skin-hair"],
  तेल: ["shifa-tanavai-tel", "shifa-hair-oil", "shifa-rahat-e-dard"],
  बाल: ["shifa-hair-oil"],
  हेयर: ["shifa-hair-oil"],

  // Pain Relief / Dard
  dard: ["shifa-rahat-e-dard", "shifa-va-rog-relief", "joint-pain"],
  pain: ["shifa-rahat-e-dard", "shifa-va-rog-relief", "joint-pain"],
  rahat: ["shifa-rahat-e-dard", "joint-pain"],
  jodon: ["shifa-va-rog-relief", "shifa-rahat-e-dard", "joint-pain"],
  joint: ["shifa-va-rog-relief", "shifa-rahat-e-dard", "joint-pain"],
  joints: ["shifa-va-rog-relief", "shifa-rahat-e-dard", "joint-pain"],
  kamar: ["shifa-rahat-e-dard", "shifa-va-rog-relief", "joint-pain"],
  back: ["shifa-rahat-e-dard", "joint-pain"],
  backache: ["shifa-rahat-e-dard", "joint-pain"],
  ghutne: ["shifa-va-rog-relief", "shifa-rahat-e-dard", "joint-pain"],
  knee: ["shifa-va-rog-relief", "shifa-rahat-e-dard", "joint-pain"],
  gathiya: ["shifa-va-rog-relief", "joint-pain"],
  arthritis: ["shifa-va-rog-relief", "joint-pain"],
  vaa: ["shifa-va-rog-relief", "joint-pain"],
  vaata: ["shifa-va-rog-relief", "joint-pain"],
  दर्द: ["shifa-rahat-e-dard", "shifa-va-rog-relief"],
  जोड़ों: ["shifa-va-rog-relief", "shifa-rahat-e-dard"],
  कमर: ["shifa-rahat-e-dard", "shifa-va-rog-relief"],
  गठिया: ["shifa-va-rog-relief"],

  // Tiger Boost & Swarna Bhasm
  tiger: ["shifa-tiger-suwarna-bhasm", "mens-wellness"],
  swarna: ["shifa-tiger-suwarna-bhasm", "shifa-zafrani-gold"],
  suwarna: ["shifa-tiger-suwarna-bhasm", "shifa-zafrani-gold"],
  suvarna: ["shifa-tiger-suwarna-bhasm", "shifa-zafrani-gold"],
  bhasm: ["shifa-tiger-suwarna-bhasm", "shifa-zafrani-gold"],
  bhasma: ["shifa-tiger-suwarna-bhasm", "shifa-zafrani-gold"],
  boost: ["shifa-tiger-suwarna-bhasm", "mens-wellness"],
  टाइगर: ["shifa-tiger-suwarna-bhasm"],
  सुवर्ण: ["shifa-tiger-suwarna-bhasm", "shifa-zafrani-gold"],
  भस्म: ["shifa-tiger-suwarna-bhasm", "shifa-zafrani-gold"],

  // Diabetes & Sugar
  diabetes: ["shifa-diabetes-care", "metabolic-care"],
  sugar: ["shifa-diabetes-care", "metabolic-care"],
  madhumeh: ["shifa-diabetes-care", "metabolic-care"],
  karela: ["shifa-diabetes-care", "metabolic-care"],
  jamun: ["shifa-diabetes-care", "metabolic-care"],
  डायबिटीज: ["shifa-diabetes-care"],
  शुगर: ["shifa-diabetes-care"],
  मधुमेह: ["shifa-diabetes-care"],

  // Tanavai & Nabhi Oil
  tanavai: ["shifa-tanavai-tel", "mens-wellness"],
  tanavay: ["shifa-tanavai-tel", "mens-wellness"],
  nabhi: ["shifa-tanavai-tel"],
  belly: ["shifa-tanavai-tel"],
  naval: ["shifa-tanavai-tel"],
  navel: ["shifa-tanavai-tel"],
  तनावई: ["shifa-tanavai-tel"],
  नाभि: ["shifa-tanavai-tel"],

  // Stri Rog & Likoriya
  likoriya: ["shifa-likoriya-care", "womens-health"],
  leucorrhea: ["shifa-likoriya-care", "womens-health"],
  leucorrhoea: ["shifa-likoriya-care", "womens-health"],
  safed: ["shifa-likoriya-care", "womens-health"],
  pani: ["shifa-likoriya-care", "womens-health"],
  stri: ["shifa-likoriya-care", "shifa-santaan-course", "womens-health"],
  mahila: ["shifa-likoriya-care", "shifa-santaan-course", "womens-health"],
  women: ["shifa-likoriya-care", "shifa-santaan-course", "womens-health"],
  female: ["shifa-likoriya-care", "shifa-santaan-course", "womens-health"],
  periods: ["shifa-likoriya-care", "womens-health"],
  स्त्री: ["shifa-likoriya-care", "shifa-santaan-course"],
  लिकोरिया: ["shifa-likoriya-care"],
  सफेद: ["shifa-likoriya-care"],

  // Shabab Awar Powder
  shabab: ["shifa-shabab-avar", "mens-wellness", "classical-tonics"],
  awar: ["shifa-shabab-avar"],
  avar: ["shifa-shabab-avar"],
  powder: ["shifa-shabab-avar", "shifa-pait-samasya-set"],
  churna: ["shifa-shabab-avar", "shifa-pait-samasya-set"],
  शबाब: ["shifa-shabab-avar"],
  पाउडर: ["shifa-shabab-avar"],

  // Classical Ingredients & Tonics
  shilajit: ["shifa-zafrani-gold", "shifa-tiger-suwarna-bhasm", "shifa-pehlwan-capsule"],
  silajit: ["shifa-zafrani-gold", "shifa-tiger-suwarna-bhasm", "shifa-pehlwan-capsule"],
  shilajeet: ["shifa-zafrani-gold", "shifa-tiger-suwarna-bhasm", "shifa-pehlwan-capsule"],
  ashwagandha: ["shifa-zafrani-gold", "shifa-pehlwan-capsule"],
  asgandh: ["shifa-zafrani-gold", "shifa-pehlwan-capsule"],
  musli: ["shifa-zafrani-gold", "shifa-pehlwan-capsule", "shifa-majun-mardangi"],
  moosli: ["shifa-zafrani-gold", "shifa-pehlwan-capsule", "shifa-majun-mardangi"],
  akarkara: ["shifa-zafrani-gold", "shifa-pehlwan-capsule"],
  kaunch: ["shifa-zafrani-gold", "shifa-pehlwan-capsule"],
  konch: ["shifa-zafrani-gold", "shifa-pehlwan-capsule"],
  शिलाजीत: ["shifa-zafrani-gold", "shifa-pehlwan-capsule"],
  अश्वगंधा: ["shifa-zafrani-gold", "shifa-pehlwan-capsule"],
  मूसली: ["shifa-zafrani-gold", "shifa-pehlwan-capsule"],

  // Dosage Forms
  capsule: ["shifa-zafrani-gold", "shifa-pehlwan-capsule", "shifa-weight-cutter"],
  capsules: ["shifa-zafrani-gold", "shifa-pehlwan-capsule", "shifa-weight-cutter"],
  tablet: ["shifa-tiger-suwarna-bhasm", "shifa-gas-ki-goliyan", "shifa-jiriyan-timing-pearls"],
  tablets: ["shifa-tiger-suwarna-bhasm", "shifa-gas-ki-goliyan", "shifa-jiriyan-timing-pearls"],
  goli: ["shifa-gas-ki-goliyan", "shifa-jiriyan-timing-pearls", "shifa-habbe-hawa"],
  goliyan: ["shifa-gas-ki-goliyan", "shifa-jiriyan-timing-pearls"],
  कैप्सूल: ["shifa-zafrani-gold", "shifa-pehlwan-capsule", "shifa-weight-cutter"],
  गोली: ["shifa-gas-ki-goliyan", "shifa-jiriyan-timing-pearls", "shifa-habbe-hawa"],
  गोलियां: ["shifa-gas-ki-goliyan", "shifa-jiriyan-timing-pearls"],
};

/**
 * Score a single product against the given raw query string.
 */
export function scoreProductMatch(product: Product, rawQuery: string): { score: number; matches: string[] } {
  const query = rawQuery.trim();
  if (!query) {
    return { score: 0, matches: [] };
  }

  let score = 0;
  const matches: string[] = [];

  const lowerRaw = query.toLowerCase();
  const normEngQuery = normalizeEnglish(query);
  const normHinQuery = normalizeHindi(query);

  // Deconstruct query into tokens for individual word scoring
  const rawTokens = lowerRaw.split(/\s+/).filter(Boolean);
  const engTokens = normEngQuery.split(/\s+/).filter(Boolean);
  const hinTokens = normHinQuery.split(/\s+/).filter(Boolean);

  // Pre-process product fields
  const pNameLower = product.name.toLowerCase();
  const pNameEng = normalizeEnglish(product.name);
  const pHindiNorm = normalizeHindi(product.nameHindi);
  const pSlug = product.slug.toLowerCase();
  const pId = product.id.toLowerCase();
  const pCategoryLower = product.category.toLowerCase();
  const pCategoryHindiNorm = normalizeHindi(product.categoryHindi);
  const pSubtitleLower = product.subtitle.toLowerCase();
  const pSubtitleEng = normalizeEnglish(product.subtitle);
  const pDescLower = product.description.toLowerCase();
  const pDescEng = normalizeEnglish(product.description);
  const pDescHindi = normalizeHindi(product.description);
  const pBenefits = (product.benefits || []).map((b) => ({
    raw: b.toLowerCase(),
    eng: normalizeEnglish(b),
    hin: normalizeHindi(b),
  }));
  const pIngredients = (product.ingredients || []).map((i) => ({
    raw: i.toLowerCase(),
    eng: normalizeEnglish(i),
    hin: normalizeHindi(i),
  }));
  const pDosage = (product.dosage || "").toLowerCase();

  // 1. Exact Name / Slug match (Highest priority)
  if (pNameLower === lowerRaw || pHindiNorm === normHinQuery || pSlug === lowerRaw || pId === lowerRaw) {
    score += 300;
    matches.push("Exact Name Match");
  } else if (pNameEng === normEngQuery && normEngQuery.length > 2) {
    score += 260;
    matches.push("Exact Transliterated Name Match");
  }

  // 2. Starts with query
  if (pNameLower.startsWith(lowerRaw) || (normEngQuery.length > 2 && pNameEng.startsWith(normEngQuery))) {
    score += 150;
    matches.push("Name Prefix Match");
  }
  if (pHindiNorm.startsWith(normHinQuery) && normHinQuery.length > 1) {
    score += 150;
    matches.push("Hindi Name Prefix Match");
  }

  // 3. Name Contains Full Query Substring
  if (pNameLower.includes(lowerRaw) || (normEngQuery.length > 2 && pNameEng.includes(normEngQuery))) {
    score += 110;
    matches.push("Name Substring");
  }
  if (normHinQuery.length > 1 && pHindiNorm.includes(normHinQuery)) {
    score += 110;
    matches.push("Hindi Name Substring");
  }

  // 4. Token matches in Name
  for (const t of rawTokens) {
    if (t.length > 1 && pNameLower.includes(t)) {
      score += 45;
      matches.push(`Name Token: ${t}`);
    }
  }
  for (const t of engTokens) {
    if (t.length > 2 && pNameEng.includes(t)) {
      score += 40;
      matches.push(`Eng Token: ${t}`);
    }
  }
  for (const t of hinTokens) {
    if (t.length > 1 && pHindiNorm.includes(t)) {
      score += 45;
      matches.push(`Hindi Token: ${t}`);
    }
  }

  // 5. Category and Taxonomy Matches
  if (pCategoryLower.includes(lowerRaw) || (normEngQuery && pCategoryLower.includes(normEngQuery))) {
    score += 65;
    matches.push("Category Match");
  }
  if (normHinQuery && pCategoryHindiNorm.includes(normHinQuery)) {
    score += 65;
    matches.push("Hindi Category Match");
  }
  // Check CATEGORIES taxonomy definitions
  const matchedTaxonomy = CATEGORIES.find(
    (c) =>
      c.id !== "all" &&
      (c.name.toLowerCase().includes(lowerRaw) ||
        normalizeHindi(c.hindi).includes(normHinQuery) ||
        (normEngQuery && normalizeEnglish(c.name).includes(normEngQuery)))
  );
  if (matchedTaxonomy && product.category === matchedTaxonomy.id) {
    score += 70;
    matches.push(`Taxonomy: ${matchedTaxonomy.name}`);
  }

  // 6. Subtitle Matches
  if (pSubtitleLower.includes(lowerRaw) || (normEngQuery.length > 2 && pSubtitleEng.includes(normEngQuery))) {
    score += 35;
    matches.push("Subtitle Match");
  }

  // 7. Ingredients Match
  for (const ing of pIngredients) {
    if (ing.raw.includes(lowerRaw) || (normEngQuery.length > 2 && ing.eng.includes(normEngQuery))) {
      score += 40;
      matches.push("Ingredient Match");
      break;
    }
    if (normHinQuery.length > 1 && ing.hin.includes(normHinQuery)) {
      score += 40;
      matches.push("Ingredient Hindi Match");
      break;
    }
  }

  // 8. Benefits Match
  for (const b of pBenefits) {
    if (b.raw.includes(lowerRaw) || (normEngQuery.length > 2 && b.eng.includes(normEngQuery))) {
      score += 30;
      matches.push("Benefit Match");
      break;
    }
    if (normHinQuery.length > 1 && b.hin.includes(normHinQuery)) {
      score += 30;
      matches.push("Benefit Hindi Match");
      break;
    }
  }

  // 9. Description Match
  if (pDescLower.includes(lowerRaw) || (normEngQuery.length > 3 && pDescEng.includes(normEngQuery))) {
    score += 25;
    matches.push("Description Match");
  }
  if (normHinQuery.length > 2 && pDescHindi.includes(normHinQuery)) {
    score += 25;
    matches.push("Description Hindi Match");
  }

  // 10. Dosage Match
  if (pDosage && (pDosage.includes(lowerRaw) || (normEngQuery.length > 3 && normalizeEnglish(pDosage).includes(normEngQuery)))) {
    score += 15;
    matches.push("Dosage Match");
  }

  // 11. Synonym & Transliteration Thesaurus Mapping
  const checkSynonym = (token: string) => {
    const targets = UNANI_SYNONYM_MAP[token];
    if (targets) {
      if (targets.includes(product.id) || targets.includes(product.category)) {
        score += 80;
        matches.push(`Synonym: ${token}`);
      }
    }
  };

  // Check full queries in synonym map
  checkSynonym(lowerRaw);
  checkSynonym(normEngQuery);
  checkSynonym(normHinQuery);
  // Check individual words
  for (const t of rawTokens) checkSynonym(t);
  for (const t of engTokens) checkSynonym(t);
  for (const t of hinTokens) checkSynonym(t);

  // Subtle tie-breakers for high-quality catalogue presentation
  if (score > 0) {
    if (product.isBestseller) score += 3;
    if (product.inStock) score += 2;
  }

  return { score, matches };
}

/**
 * Filter and sort products according to query and search options.
 */
export function searchCatalogProducts(
  products: Product[],
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const cleanQuery = (query || "").trim();
  const hasQuery = cleanQuery.length > 0;

  // 1. Filter and score
  const results: SearchResult[] = [];

  for (const product of products) {
    // Only published products
    if (product.status === "draft") continue;

    // Category filter
    if (options.category && options.category !== "all" && product.category !== options.category) {
      continue;
    }

    // In-stock filter
    if (options.inStockOnly && !product.inStock) {
      continue;
    }

    // Price range filter
    if (options.priceRange === "under-500" && product.price >= 500) {
      continue;
    }
    if (options.priceRange === "500-1000" && (product.price < 500 || product.price > 1000)) {
      continue;
    }
    if (options.priceRange === "above-1000" && product.price <= 1000) {
      continue;
    }
    if (typeof options.minPrice === "number" && product.price < options.minPrice) {
      continue;
    }
    if (typeof options.maxPrice === "number" && product.price > options.maxPrice) {
      continue;
    }

    // If query provided, compute score; otherwise score is 1 for matching filters
    if (hasQuery) {
      const { score, matches } = scoreProductMatch(product, cleanQuery);
      if (score > 0) {
        results.push({ product, score, matches });
      }
    } else {
      results.push({ product, score: 1, matches: [] });
    }
  }

  // 2. Sort results
  const sortBy = options.sortBy || (hasQuery ? "relevance" : "featured");

  results.sort((a, b) => {
    if (sortBy === "relevance" && hasQuery) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.product.isBestseller && !a.product.isBestseller) return 1;
      if (a.product.isBestseller && !b.product.isBestseller) return -1;
      return 0;
    }

    if (sortBy === "price-asc") {
      return a.product.price - b.product.price;
    }
    if (sortBy === "price-desc") {
      return b.product.price - a.product.price;
    }
    if (sortBy === "rating") {
      return b.product.rating - a.product.rating;
    }
    // "featured" default: bestsellers first, then rating
    if (a.product.isBestseller && !b.product.isBestseller) return -1;
    if (!a.product.isBestseller && b.product.isBestseller) return 1;
    return b.product.rating - a.product.rating;
  });

  // Apply optional limit
  if (options.limit && options.limit > 0) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get suggestions for the autocomplete dropdown as the user types.
 * Returns verified catalogue details: verified price, images, names in both languages, pack size.
 */
export function getProductSuggestions(
  products: Product[],
  query: string,
  limit: number = 6
): SearchSuggestion[] {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) return [];

  const results = searchCatalogProducts(products, cleanQuery, { limit, sortBy: "relevance" });

  return results.map(({ product, score, matches }) => ({
    id: product.id,
    name: product.name,
    nameHindi: product.nameHindi,
    subtitle: product.subtitle,
    category: product.category,
    categoryHindi: product.categoryHindi,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    image: product.image,
    posterImage: product.posterImage,
    packSize: product.packSize,
    inStock: product.inStock,
    score,
    matchedReason: matches[0] || "Matching Product",
  }));
}
