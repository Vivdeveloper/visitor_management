import type { VisitorLang } from "@/i18n/visitorJourney";
import { localizeDigits, usesDevanagariDigits } from "@/lib/localize";

function hasIndicScript(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

/** High-quality overrides for common Indian / app names. */
const NAME_MAP: Record<string, string> = {
  vivek: "विवेक",
  viv: "विव",
  ganesh: "गणेश",
  sonawane: "सोनावणे",
  chirag: "चिराग",
  nikhil: "निखिल",
  om: "ओम",
  raj: "राज",
  rahul: "राहुल",
  amit: "अमित",
  priya: "प्रिया",
  anita: "अनिता",
  suresh: "सुरेश",
  ramesh: "रमेश",
  deepak: "दीपक",
  sunil: "सुनिल",
  ajay: "अजय",
  vijay: "विजय",
  meera: "मीरा",
  pooja: "पूजा",
  neha: "नेहा",
  kiran: "किरण",
  sachin: "सचिन",
  rohit: "रोहित",
  ankit: "अंकित",
  prakash: "प्रकाश",
  mahesh: "महेश",
  ashok: "अशोक",
  manoj: "मनोज",
  sanjay: "संजय",
  nisha: "निशा",
  kavita: "कविता",
  shweta: "श्वेता",
  swapnil: "स्वप्निल",
  yogesh: "योगेश",
  tushar: "तुषार",
  akash: "आकाश",
  abhishek: "अभिषेक",
  shubham: "शुभम",
  gaurav: "गौरव",
  harsh: "हर्ष",
  kunal: "कुणाल",
  nilesh: "निलेश",
  prasad: "प्रसाद",
  patil: "पाटील",
  deshmukh: "देशमुख",
  joshi: "जोशी",
  kulkarni: "कुलकर्णी",
  shinde: "शिंदे",
  more: "मोरे",
  jadhav: "जाधव",
  pawar: "पवार",
  sawant: "सावंत",
  chavan: "चव्हाण",
  bhosale: "भोसले",
  kadam: "कदम",
  naire: "नैरे",
  naik: "नाईक",
  mehta: "मेहता",
  shah: "शाह",
  singh: "सिंह",
  kumar: "कुमार",
  sharma: "शर्मा",
  verma: "वर्मा",
  gupta: "गुप्ता",
  pandey: "पाण्डेय",
  mishra: "मिश्रा",
  yadav: "यादव",
  khan: "खान",
  ali: "अली",
  john: "जॉन",
  david: "डेव्हिड",
  michael: "मायकल",
  smith: "स्मिथ",
};

const WORD_MAP_HI: Record<string, string> = {
  ...NAME_MAP,
  administrator: "प्रशासक",
  admin: "एडमिन",
  delivery: "डिलीवरी",
  meeting: "मीटिंग",
  visitor: "विज़िटर",
  host: "होस्ट",
  testing: "टेस्टिंग",
  audit: "ऑडिट",
  maintenance: "मेंटेनेंस",
  interview: "इंटरव्यू",
  vendor: "वेंडर",
  contractor: "कॉन्ट्रैक्टर",
  guest: "अतिथि",
  floor: "मंजिल",
  ground: "ग्राउंड",
  dist: "डिस्ट",
};

const WORD_MAP_MR: Record<string, string> = {
  ...NAME_MAP,
  administrator: "प्रशासक",
  admin: "अॅडमिन",
  delivery: "डिलिव्हरी",
  meeting: "मीटिंग",
  visitor: "अभ्यागत",
  host: "यजमान",
  testing: "टेस्टिंग",
  audit: "ऑडिट",
  maintenance: "मेंटेनन्स",
  interview: "इंटरव्ह्यू",
  vendor: "वेंडर",
  contractor: "कॉन्ट्रॅक्टर",
  guest: "पाहुणा",
  floor: "मजला",
  ground: "ग्राउंड",
  dist: "डिस्ट",
};

/** Longest-first digraph / trigraph consonant map. */
const CONS: Array<[string, string]> = [
  ["shr", "श्र"],
  ["sch", "श"],
  ["tch", "च"],
  ["chh", "छ"],
  ["sh", "श"],
  ["ch", "च"],
  ["th", "थ"],
  ["dh", "ध"],
  ["kh", "ख"],
  ["gh", "घ"],
  ["ph", "फ"],
  ["bh", "भ"],
  ["ng", "ङ"],
  ["ny", "ञ"],
  ["tr", "त्र"],
  ["dr", "द्र"],
  ["b", "ब"],
  ["c", "क"],
  ["d", "द"],
  ["f", "फ"],
  ["g", "ग"],
  ["h", "ह"],
  ["j", "ज"],
  ["k", "क"],
  ["l", "ल"],
  ["m", "म"],
  ["n", "न"],
  ["p", "प"],
  ["q", "क"],
  ["r", "र"],
  ["s", "स"],
  ["t", "त"],
  ["v", "व"],
  ["w", "व"],
  ["x", "क्स"],
  ["y", "य"],
  ["z", "ज़"],
];

const VOWELS: Array<[string, { indep: string; matra: string }]> = [
  ["aa", { indep: "आ", matra: "ा" }],
  ["ee", { indep: "ई", matra: "ी" }],
  ["ii", { indep: "ई", matra: "ी" }],
  ["oo", { indep: "ऊ", matra: "ू" }],
  ["uu", { indep: "ऊ", matra: "ू" }],
  ["ai", { indep: "ऐ", matra: "ै" }],
  ["au", { indep: "औ", matra: "ौ" }],
  ["ou", { indep: "औ", matra: "ौ" }],
  ["a", { indep: "अ", matra: "" }],
  ["i", { indep: "इ", matra: "ि" }],
  ["u", { indep: "उ", matra: "ु" }],
  ["e", { indep: "ए", matra: "े" }],
  ["o", { indep: "ओ", matra: "ो" }],
];

function transliterateToken(raw: string): string {
  const word = raw.trim();
  if (!word) return word;
  if (hasIndicScript(word)) return word;
  if (/^\d+$/.test(word)) return word;

  const lower = word.toLowerCase();
  let i = 0;
  let out = "";
  let pendingConsonant = false;

  const flushVirama = () => {
    if (pendingConsonant) {
      out += "्";
      pendingConsonant = false;
    }
  };

  while (i < lower.length) {
    let matched = false;

    for (const [latin, v] of VOWELS) {
      if (!lower.startsWith(latin, i)) continue;
      if (pendingConsonant) {
        // Inherent 'a' after consonant: just release consonant (no matra)
        if (latin === "a") {
          pendingConsonant = false;
        } else {
          out += v.matra;
          pendingConsonant = false;
        }
      } else {
        out += v.indep;
      }
      i += latin.length;
      matched = true;
      break;
    }
    if (matched) continue;

    for (const [latin, dev] of CONS) {
      if (!lower.startsWith(latin, i)) continue;
      flushVirama();
      out += dev;
      pendingConsonant = true;
      i += latin.length;
      matched = true;
      break;
    }
    if (matched) continue;

    // Unknown / punctuation
    flushVirama();
    out += word[i];
    i += 1;
  }

  // End of word: leave last consonant without virama (विवेक् → विवेक)
  return out || word;
}

function wordTable(lang: VisitorLang): Record<string, string> {
  return lang === "mr" ? WORD_MAP_MR : WORD_MAP_HI;
}

function convertToken(token: string, lang: VisitorLang): string {
  const known = wordTable(lang)[token.toLowerCase()];
  if (known) return known;
  return transliterateToken(token);
}

/**
 * Localize a person name (visitor / host) for hi/mr via Devanagari.
 * Leaves English unchanged for `en`. Keeps text that is already Indic.
 */
export function localizePersonName(name?: string | null, lang: VisitorLang = "en"): string {
  const raw = (name || "").trim();
  if (!raw || raw === "—") return raw || "—";
  if (!usesDevanagariDigits(lang)) return raw;
  if (hasIndicScript(raw)) return raw;

  return raw
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      const m = part.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z']*)([^A-Za-z]*)$/);
      if (!m) return part;
      const [, pre, word, post] = m;
      return `${pre}${convertToken(word, lang)}${post}`;
    })
    .join("");
}

/** Localize floor labels like "3rd Floor" / "2nd Floor" / "Floor 3". */
export function localizeFloorLabel(floor?: string | null, lang: VisitorLang = "en"): string {
  const raw = (floor || "").trim();
  if (!raw) return "";
  if (!usesDevanagariDigits(lang)) return raw;

  const floorWord = lang === "mr" ? "मजला" : "मंजिल";

  const ordinal = raw.match(/^(\d+)\s*(st|nd|rd|th)?\s*floor$/i);
  if (ordinal) {
    return `${localizeDigits(ordinal[1], lang)} ${floorWord}`;
  }

  const prefixed = raw.match(/^floor\s*[-:]?\s*(\d+)$/i);
  if (prefixed) {
    return `${floorWord} ${localizeDigits(prefixed[1], lang)}`;
  }

  if (/^\d+$/.test(raw)) {
    return `${localizeDigits(raw, lang)} ${floorWord}`;
  }

  let out = raw.replace(/\bfloor\b/gi, floorWord);
  out = localizeDigits(out, lang);
  if (/[A-Za-z]/.test(out)) {
    out = localizePersonName(out, lang);
  }
  return out;
}

/** Host line value (name · floor) localized for display. */
export function localizeHostDisplay(
  host?: string | null,
  floor?: string | null,
  lang: VisitorLang = "en",
): string {
  const hostLabel = localizePersonName((host || "").trim() || "—", lang);
  const floorLabel = localizeFloorLabel(floor, lang);
  if (!floorLabel) return hostLabel;
  return `${hostLabel} · ${floorLabel}`;
}
