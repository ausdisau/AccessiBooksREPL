export type DistributionId =
  | "educate"
  | "libraries"
  | "community"
  | "kids"
  | "aged-care"
  | "rehab"
  | "workplace"
  | "justice"
  | "university"
  | "easy-read"
  | "professional";

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

  "aged-care": {
    id: "aged-care",
    name: "AccessiBooks Aged Care",
    eyebrow: "Residential aged care, home care and later-life reading",
    headline: "Accessible reading that respects adulthood, memory, identity and choice",
    description:
      "A later-life distribution for residential aged care, home care and family-supported reading. It prioritises large text, audio, familiar interests and simple navigation without treating older readers as children.",
    audiences: ["Older adults", "Residential aged care", "Home care", "Family-supported readers"],
    collections: ["Large-text favourites", "Audiobooks", "Short reads", "Australian stories", "Family reading"],
    formats: ["Audio", "Large text", "eBook", "Plain text", "Transcript"],
    workflows: [
      "Start with the reader's preferences and established interests",
      "Offer larger text, audio and simplified navigation as optional access modes",
      "Keep supporter assistance visible and revocable",
      "Separate recreation from health or dementia education material",
    ],
    accessNote:
      "Prototype only. Access needs must not be inferred from age, diagnosis or cognitive status, and health information requires separate review.",
    demoCards: [
      {
        title: "Large-text favourites example",
        author: "Demo catalogue record",
        collection: "Large-text favourites",
        audience: "Older adults",
        formats: ["Large text", "Audio"],
        status: "demo",
        note: "Shows optional large-text and audio formats without simplifying the subject matter.",
      },
      {
        title: "Australian stories example",
        author: "Demo catalogue record",
        collection: "Australian stories",
        audience: "Residential aged care",
        formats: ["eBook", "Audio"],
        status: "demo",
        note: "Demonstrates interest-led discovery for shared and individual reading.",
      },
    ],
  },

  rehab: {
    id: "rehab",
    name: "AccessiBooks Rehab",
    eyebrow: "Inpatient, outpatient and community rehabilitation",
    headline: "Reading, communication and learning that continue through rehabilitation",
    description:
      "A rehabilitation distribution that combines leisure reading, accessible learning and patient-selected information without making recovery progress a score or assuming rehabilitation goals from diagnosis.",
    audiences: ["Inpatient rehab", "Outpatient rehab", "Community rehab", "Families and supporters"],
    collections: ["Leisure reading", "Rehabilitation education", "Communication access", "Returning home", "Short reads"],
    formats: ["Audio", "eBook", "Transcript", "Large text", "Easy Read", "Plain text"],
    workflows: [
      "Choose reading and interaction preferences before content",
      "Separate leisure content from rehabilitation education",
      "Allow AAC, switch, keyboard and supporter-assisted interaction",
      "Require review before patient-facing clinical or rehabilitation guidance",
    ],
    accessNote:
      "Prototype only. Rehabilitation goals, capacity and progress are not inferred from disability, diagnosis or communication method.",
    demoCards: [
      {
        title: "Rehab leisure shelf example",
        author: "Demo catalogue record",
        collection: "Leisure reading",
        audience: "Inpatient rehab",
        formats: ["Audio", "eBook"],
        status: "demo",
        note: "Demonstrates non-clinical reading during a rehabilitation admission.",
      },
      {
        title: "Returning home guide example",
        author: "Demo catalogue record",
        collection: "Returning home",
        audience: "Community rehab",
        formats: ["Easy Read", "Large text"],
        status: "not_verified",
        note: "Shows where reviewed discharge or community information could sit once approved.",
      },
    ],
  },

  workplace: {
    id: "workplace",
    name: "AccessiBooks Workplace",
    eyebrow: "Employment, professional development and workplace learning",
    headline: "Accessible workplace reading without lowering professional expectations",
    description:
      "A workplace distribution for employees, employers and training teams that supports accessible documents, professional learning and induction while keeping reasonable adjustment and content entitlement separate from catalogue discovery.",
    audiences: ["Employees", "Managers", "HR teams", "Workplace trainers"],
    collections: ["Professional learning", "Induction", "Leadership", "Workplace rights", "Career development"],
    formats: ["eBook", "Audio", "Transcript", "Large text", "Accessible PDF", "Plain text"],
    workflows: [
      "Discover professional material by role or topic",
      "Apply reader-selected access preferences",
      "Check employer or institution entitlement separately",
      "Keep accessibility adjustments confidential and user-controlled",
    ],
    accessNote:
      "Prototype only. Workplace access preferences are not performance indicators and should not be exposed beyond the scope chosen by the reader.",
    demoCards: [
      {
        title: "Professional learning example",
        author: "Demo catalogue record",
        collection: "Professional learning",
        audience: "Employees",
        formats: ["eBook", "Audio"],
        status: "demo",
        note: "Demonstrates professional content with equivalent accessible formats.",
      },
      {
        title: "Workplace rights guide example",
        author: "Demo catalogue record",
        collection: "Workplace rights",
        audience: "Employees",
        formats: ["Plain text", "Large text"],
        status: "demo",
        note: "Shows an accessible workplace-information collection without inferring legal advice.",
      },
    ],
  },

  justice: {
    id: "justice",
    name: "AccessiBooks Justice",
    eyebrow: "Courts, legal services, detention and justice settings",
    headline: "Accessible information and reading where communication barriers carry real consequences",
    description:
      "A justice-focused distribution for legal information, education and leisure reading across courts, legal services and custodial settings, with strict separation between general information and legal advice.",
    audiences: ["Court users", "Legal-service clients", "People in custody", "Supporters and advocates"],
    collections: ["Legal information", "Rights and procedures", "Education", "Leisure reading", "Re-entry"],
    formats: ["Easy Read", "Plain text", "Audio", "Large text", "eBook", "Transcript"],
    workflows: [
      "Identify the reader's communication and access needs",
      "Distinguish legal information from legal advice",
      "Preserve source, jurisdiction and currency",
      "Support confidential access and supporter involvement only with consent",
    ],
    accessNote:
      "Prototype only. Justice information requires jurisdiction and currency checks and must not be represented as personalised legal advice.",
    demoCards: [
      {
        title: "Court process guide example",
        author: "Demo catalogue record",
        collection: "Rights and procedures",
        audience: "Court users",
        formats: ["Easy Read", "Audio"],
        status: "demo",
        note: "Demonstrates accessible procedural information with a clear non-advice boundary.",
      },
      {
        title: "Justice leisure shelf example",
        author: "Demo catalogue record",
        collection: "Leisure reading",
        audience: "People in custody",
        formats: ["eBook", "Audio"],
        status: "not_verified",
        note: "Shows how leisure reading can remain separate from legal-information workflows.",
      },
    ],
  },

  university: {
    id: "university",
    name: "AccessiBooks University",
    eyebrow: "Higher education, research and academic libraries",
    headline: "Accessible academic reading from discovery through research",
    description:
      "A higher-education distribution for students, researchers and staff, combining accessible texts with DOI research discovery, institutional entitlements and assistive-reading workflows.",
    audiences: ["Undergraduate", "Postgraduate", "Researchers", "Academic staff"],
    collections: ["Course readings", "Research papers", "Open access", "Textbooks", "Academic skills"],
    formats: ["eBook", "EPUB", "Accessible PDF", "Audio", "HTML", "Transcript"],
    workflows: [
      "Search ISBN, DOI, title, author or subject",
      "Resolve institution entitlement and open-access routes",
      "Expose publisher accessibility claims separately from testing",
      "Preserve citations and provenance for research material",
    ],
    accessNote:
      "Prototype only. Discovery does not establish course-reading permission, institutional entitlement or accessibility conformance.",
    demoCards: [
      {
        title: "Course reading example",
        author: "Demo catalogue record",
        collection: "Course readings",
        audience: "Undergraduate",
        formats: ["eBook", "Accessible PDF"],
        status: "demo",
        note: "Demonstrates course-reading discovery with entitlement kept separate.",
      },
      {
        title: "Research article example",
        author: "Demo scholarly record",
        collection: "Research papers",
        audience: "Researchers",
        formats: ["HTML", "Accessible PDF"],
        status: "metadata_only",
        note: "Represents DOI-based research discovery before full-text entitlement is confirmed.",
      },
    ],
  },

  "easy-read": {
    id: "easy-read",
    name: "AccessiBooks Easy Read",
    eyebrow: "Plain-language and cognitively accessible reading",
    headline: "Easy Read as a format choice, not a judgement about the reader",
    description:
      "A dedicated Easy Read distribution for people who prefer simplified language, strong structure, supportive visuals and reduced information density while preserving adult tone, autonomy and access to original material.",
    audiences: ["Adults", "Young adults", "People choosing Easy Read", "Supporter-assisted readers"],
    collections: ["Easy Read books", "Public information", "Rights", "Community", "Health information"],
    formats: ["Easy Read", "Audio", "Large text", "Plain text", "Pictorial support"],
    workflows: [
      "Let the reader choose Easy Read rather than infer need",
      "Show the original/source version where lawful and useful",
      "Use short sections and explicit navigation",
      "Label health, legal or policy information with source and review status",
    ],
    accessNote:
      "Prototype only. Easy Read should be offered as a reader-controlled format and must not be used to infer cognitive capacity.",
    demoCards: [
      {
        title: "Easy Read public information example",
        author: "Demo catalogue record",
        collection: "Public information",
        audience: "Adults",
        formats: ["Easy Read", "Audio"],
        status: "demo",
        note: "Demonstrates structured plain-language information with reader-controlled pacing.",
      },
      {
        title: "Easy Read rights guide example",
        author: "Demo catalogue record",
        collection: "Rights",
        audience: "Young adults",
        formats: ["Easy Read", "Large text"],
        status: "demo",
        note: "Shows rights information without equating accessible language with reduced autonomy.",
      },
    ],
  },

  professional: {
    id: "professional",
    name: "AccessiBooks Professional / Clinical Learning",
    eyebrow: "Clinical, allied-health and professional education",
    headline: "Research-grounded learning with provenance, review and accessibility built in",
    description:
      "A professional learning distribution for clinicians, allied health, disability workers and educators, combining books, standards, research and training material while clearly separating evidence discovery from approved clinical guidance.",
    audiences: ["Doctors", "Nurses", "Allied health", "Disability workers", "Educators"],
    collections: ["Clinical learning", "Disability-informed practice", "Research", "Simulation", "Standards and policy"],
    formats: ["eBook", "HTML", "Accessible PDF", "Audio", "Transcript", "JATS"],
    workflows: [
      "Search books, DOI research and standards",
      "Preserve source provenance and entitlement",
      "Separate citation metrics from evidence quality",
      "Require clinical review before labelling material as guidance",
    ],
    accessNote:
      "Prototype only. Research discovery is not clinical advice; professional guidance requires current source verification and local governance.",
    demoCards: [
      {
        title: "Disability-informed clinical learning example",
        author: "Demo professional record",
        collection: "Disability-informed practice",
        audience: "Doctors",
        formats: ["HTML", "Accessible PDF"],
        status: "demo",
        note: "Demonstrates a professional-learning record with review and provenance fields.",
      },
      {
        title: "Research evidence example",
        author: "Demo DOI record",
        collection: "Research",
        audience: "Allied health",
        formats: ["JATS", "HTML"],
        status: "metadata_only",
        note: "Represents research discovery before evidence appraisal and clinical review.",
      },
    ],
  },

};

export function getDistribution(id: DistributionId): DistributionConfig {
  return distributions[id];
}
