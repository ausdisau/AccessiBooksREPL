import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Headphones,
  Hospital,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HospitalCatalogueItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  description: string | null;
  publicationYear: number | null;
  publisher: string | null;
  editionStatement: string | null;
  oclcNumber: string | null;
  isbn10: string | null;
  isbn13: string | null;
  commercialTitle: boolean;
  acquisitionStatus: string;
  language: string;
  audience: string;
  contentKind: string;
  primaryCollection: string;
  genres: string[] | null;
  subjects: string[] | null;
  hospitalTags: string[] | null;
  sourceProvider: string;
  sourceUrl: string;
  rightsStatus: string;
  rightsJurisdiction: string;
  rightsNote: string | null;
  availabilityStatus: string;
  availabilityNote: string | null;
  hasAudio: boolean;
  hasEbook: boolean;
  hasHtml: boolean;
  hasPlainText: boolean;
  hasPdf: boolean;
  hasDaisy: boolean;
  hasLargePrint: boolean;
  hasBraille: boolean;
  transcriptAvailable: boolean;
  ttsFriendly: boolean;
  clinicalInformation: boolean;
  clinicalReviewStatus: string;
  clinicalReviewNote: string | null;
}

interface HospitalCatalogueFacets {
  audiences: string[];
  collections: string[];
  languages: string[];
  rightsStatuses: string[];
  availabilityStatuses: string[];
  formats: string[];
}

const humanise = (value: string) =>
  value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function HospitalCatalogue() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState("all");
  const [collection, setCollection] = useState("all");
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState("title");

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (query.trim()) search.set("q", query.trim());
    if (audience !== "all") search.set("audience", audience);
    if (collection !== "all") search.set("collection", collection);
    if (format !== "all") search.set("format", format);
    search.set("sort", sort);
    return search.toString();
  }, [query, audience, collection, format, sort]);

  const { data: items = [], isLoading, error } = useQuery<HospitalCatalogueItem[]>({
    queryKey: [`/api/hospitals/catalogue?${params}`],
  });

  const { data: facets } = useQuery<HospitalCatalogueFacets>({
    queryKey: ["/api/hospitals/catalogue/facets"],
  });

  return (
    <section aria-labelledby="hospital-catalogue-heading">
      <div className="mb-8 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Hospital className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold">AccessiBooks @ Hospitals</span>
            </div>
            <h1 id="hospital-catalogue-heading" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Searchable bedside reading catalogue
            </h1>
            <p className="mt-3 text-muted-foreground">
              Discover leisure reading and accessible formats for hospital stays. Catalogue inclusion does not mean
              AccessiBooks hosts the file or that clinical material has been medically reviewed.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4 text-sm md:max-w-sm">
            <div className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p>
                Rights, format and clinical-review status are shown separately so availability is not overstated.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative md:col-span-2">
            <label htmlFor="hospital-catalogue-search" className="sr-only">Search hospital catalogue</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="hospital-catalogue-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, author, topic or hospital tag"
              className="pl-10"
            />
          </div>

          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger aria-label="Filter by audience"><SelectValue placeholder="Audience" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audiences</SelectItem>
              {facets?.audiences.map((value) => (
                <SelectItem key={value} value={value}>{humanise(value)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={collection} onValueChange={setCollection}>
            <SelectTrigger aria-label="Filter by collection"><SelectValue placeholder="Collection" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All collections</SelectItem>
              {facets?.collections.map((value) => (
                <SelectItem key={value} value={value}>{humanise(value)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger aria-label="Filter by format"><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              {facets?.formats.map((value) => (
                <SelectItem key={value} value={value}>{humanise(value)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isLoading ? "Searching catalogue…" : `${items.length} title${items.length === 1 ? "" : "s"} shown`}
          </p>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40" aria-label="Sort catalogue"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="recent">Publication year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 p-6" role="alert">
          The hospital catalogue could not be loaded.
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading hospital catalogue" role="status">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center" role="status">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No matching titles</h2>
          <p className="mt-1 text-muted-foreground">Try a broader search or remove one of the filters.</p>
        </div>
      ) : (
        <ul className="grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label="Hospital catalogue results">
          {items.map((item) => {
            const formats = [
              item.hasAudio && "Audio",
              item.hasEbook && "eBook",
              item.hasHtml && "HTML",
              item.hasPlainText && "Plain text",
              item.hasPdf && "PDF",
              item.hasDaisy && "DAISY",
              item.hasLargePrint && "Large print",
              item.hasBraille && "Braille",
              item.transcriptAvailable && "Transcript",
            ].filter(Boolean) as string[];

            return (
              <li key={item.id}>
                <Card className="h-full rounded-2xl">
                  <CardHeader>
                    <div className="mb-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2.5 py-1">{humanise(item.primaryCollection)}</span>
                      <span className="rounded-full bg-muted px-2.5 py-1">{humanise(item.audience)}</span>
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription>
                      {item.author}{item.publicationYear ? ` · ${item.publicationYear}` : ""}
                      {item.publisher ? ` · ${item.publisher}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex h-full flex-col">
                    {item.description && <p className="mb-4 text-sm text-muted-foreground">{item.description}</p>}

                    <dl className="mb-5 space-y-2 text-sm">
                      <div>
                        <dt className="font-medium">Formats</dt>
                        <dd className="text-muted-foreground">{formats.length ? formats.join(", ") : "Metadata only"}</dd>
                      </div>
                      {item.editionStatement && (
                        <div>
                          <dt className="font-medium">Edition</dt>
                          <dd className="text-muted-foreground">{item.editionStatement}</dd>
                        </div>
                      )}
                      {(item.isbn13 || item.isbn10) && (
                        <div>
                          <dt className="font-medium">ISBN</dt>
                          <dd className="text-muted-foreground">{item.isbn13 || item.isbn10}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="font-medium">Availability</dt>
                        <dd className="text-muted-foreground">{humanise(item.availabilityStatus)}</dd>
                      </div>
                      {item.commercialTitle && (
                        <div>
                          <dt className="font-medium">AccessiBooks acquisition</dt>
                          <dd className="text-muted-foreground">{humanise(item.acquisitionStatus)}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="font-medium">Rights status</dt>
                        <dd className="text-muted-foreground">{humanise(item.rightsStatus)}</dd>
                      </div>
                      {item.clinicalInformation && (
                        <div>
                          <dt className="font-medium">Clinical review</dt>
                          <dd className="text-muted-foreground">{humanise(item.clinicalReviewStatus)}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <Button asChild>
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                          Read at source
                        </a>
                      </Button>
                      {item.hasAudio && (
                        <span className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm">
                          <Headphones className="mr-2 h-4 w-4" aria-hidden="true" /> Audio listed
                        </span>
                      )}
                      {item.ttsFriendly && (
                        <span className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm">
                          <FileText className="mr-2 h-4 w-4" aria-hidden="true" /> Text-to-speech friendly
                        </span>
                      )}
                    </div>

                    {(item.rightsNote || item.availabilityNote) && (
                      <details className="mt-4 text-sm">
                        <summary className="cursor-pointer font-medium">Catalogue notes</summary>
                        {item.availabilityNote && <p className="mt-2 text-muted-foreground">{item.availabilityNote}</p>}
                        {item.rightsNote && <p className="mt-2 text-muted-foreground">{item.rightsNote}</p>}
                      </details>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
