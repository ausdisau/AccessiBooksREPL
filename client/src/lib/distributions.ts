export type DistributionId =
  | "educate"
  | "libraries"
  | "community"
  | "kids";

export interface DistributionConfig {
  id: DistributionId;
  name: string;
  eyebrow: string;
  headline: string;
  description: string;
  audiences: string[];
  collections: string[];
  formats: string[];
  workflows: string[];
  accessNote: string;
  demoCards: Array<{
    title: string;
    author: string;
    collection: string;
    audience: string;
    formats: string[];
    status: "demo" | "external" | "metadata_only" | "not_verified";
    note: string;
  }>;
}

export const distributions: Record<DistributionId, DistributionConfig> = {
  educate: {
    id: "educate",
    name: "AccessiBooks Educate",
    eyebrow: "Schools, TAFE and higher education",
    headline: "Accessible reading for learning, teaching and participation",
    description:
      "A distribution for educational institutions that combines accessible reading formats, curriculum-oriented discovery and institution-managed access without treating one format as suitable for every learner.",
    audiences: ["Primary", "Secondary", "TAFE", "University", "Educators"],
    collections: [
      "Curriculum reading",
      "Class texts",
      "Study support",
      "Disability voices",
      "Professional learning",
    ],
    formats: ["eBook", "Audio", "Transcript", "DAISY", "Large print", "Easy Read"],
    workflows: [
      "Find a title by ISBN, curriculum topic or reading need",
      "Check institution entitlement separately from catalogue discovery",
      "Assign or recommend an accessible edition",
      "Preserve learner-selected display and playback preferences",
    ],
    accessNote:
      "Prototype data only. A title appearing here does not establish an institution licence, classroom copying permission or accessible-format entitlement.",
    demoCards: [
      {
        title: "Accessible class text",
        author: "Demo catalogue record",
        collection: "Curriculum reading",
        audience: "Secondary",
        formats: ["eBook", "Audio"],
        status: "demo",
        note: "Shows how one class text can expose multiple format choices without claiming live availability.",
      },
      {
        title: "Study support reader",
        author: "Demo catalogue record",
        collection: "Study support",
        audience: "TAFE",
        formats: ["Transcript", "Large print"],
        status: "demo",
        note: "Designed to demonstrate learner-controlled format and reading-support filters.",
      },
    ],
  },

  libraries: {
    id: "libraries",
    name: "AccessiBooks Libraries",
    eyebrow: "Public, community and institutional libraries",
    headline: "Discover first. Borrow through the lawful route.",
    description:
      "A library-facing distribution that separates bibliographic discovery from holdings, borrowing rights and external library access so readers can see what exists without being misled about what they can immediately borrow.",
    audiences: ["Public library", "Hospital library", "University library", "Community library"],
    collections: ["Local holdings", "Accessible editions", "Audiobooks", "eBooks", "Open access"],
    formats: ["eBook", "Audio", "EPUB", "DAISY", "Large print", "Braille"],
    workflows: [
      "Search by title, author, ISBN or subject",
      "Check local or external holdings",
      "Show borrowing/SSO route only when verified",
      "Fall back to another lawful library or open-access source",
    ],
    accessNote:
      "Prototype holdings are illustrative. Metadata, a WorldCat record or a supplier listing is not itself evidence that a reader can borrow the title.",
    demoCards: [
      {
        title: "Library holdings example",
        author: "Demo catalogue record",
        collection: "Local holdings",
        audience: "Public library",
        formats: ["eBook"],
        status: "not_verified",
        note: "Demonstrates the distinction between a catalogue match and a verified holding.",
      },
      {
        title: "Open-access reading example",
        author: "Demo catalogue record",
        collection: "Open access",
        audience: "Community library",
        formats: ["EPUB", "HTML"],
        status: "external",
        note: "Represents a verified external source rather than locally hosted content.",
      },
    ],
  },

  community: {
    id: "community",
    name: "AccessiBooks Community",
    eyebrow: "Disability-led and community reading",
    headline: "Reading shaped around access, identity and community interest",
    description:
      "A disability-led distribution for community groups, social programs and individual readers. It prioritises Easy Read, AAC-friendly presentation and flexible access without medicalising disability or reducing people to diagnoses.",
    audiences: ["Adults", "Young adults", "Community groups", "Supporter-assisted readers"],
    collections: ["Disability voices", "Easy Read", "Community stories", "Independent living", "Social reading"],
    formats: ["Audio", "Transcript", "Easy Read", "Large text", "Plain text", "eBook"],
    workflows: [
      "Choose access preferences before content filtering",
      "Find community-interest and disability-led material",
      "Use supporter-assisted mode without removing reader control",
      "Keep disability-related recommendations non-pitying and non-medicalised",
    ],
    accessNote:
      "Demo catalogue only. Community relevance and accessibility fit are reader-controlled and should not be inferred from diagnosis.",
    demoCards: [
      {
        title: "Disability voices collection",
        author: "Demo catalogue record",
        collection: "Disability voices",
        audience: "Adults",
        formats: ["Audio", "Transcript"],
        status: "demo",
        note: "Shows a disability-led collection without framing disability as tragedy or inspiration.",
      },
      {
        title: "Easy Read community guide",
        author: "Demo catalogue record",
        collection: "Easy Read",
        audience: "Community groups",
        formats: ["Easy Read", "Large text"],
        status: "demo",
        note: "Demonstrates a simplified reading format while preserving adult tone and agency.",
      },
    ],
  },

  kids: {
    id: "kids",
    name: "AccessiBooks Kids",
    eyebrow: "Children and family-supported reading",
    headline: "Big controls, reader-controlled pacing and age-appropriate discovery",
    description:
      "A child-focused distribution with large interaction targets, optional read-aloud, reduced-motion defaults and family/supporter assistance that does not take control away from the child reader.",
    audiences: ["Early readers", "Primary", "Older children", "Family reading"],
    collections: ["Read aloud", "Picture books", "Short reads", "School holiday reading", "Family reading"],
    formats: ["Read aloud", "Audio", "eBook", "Large text", "Transcript"],
    workflows: [
      "Choose age range and interaction mode",
      "Offer read-aloud without forcing autoplay",
      "Use simple, large navigation targets",
      "Allow family/supporter help without hiding reader controls",
    ],
    accessNote:
      "Prototype only. Age suitability, content warnings and availability must come from verified catalogue metadata before production use.",
    demoCards: [
      {
        title: "Read-aloud story example",
        author: "Demo catalogue record",
        collection: "Read aloud",
        audience: "Early readers",
        formats: ["Read aloud", "Audio"],
        status: "demo",
        note: "Demonstrates optional narration with reader-controlled pacing.",
      },
      {
        title: "Family reading example",
        author: "Demo catalogue record",
        collection: "Family reading",
        audience: "Primary",
        formats: ["eBook", "Large text"],
        status: "demo",
        note: "Shows large-text and family-assisted use without forcing one interaction method.",
      },
    ],
  },
};

export function getDistribution(id: DistributionId): DistributionConfig {
  return distributions[id];
}
