import { useMemo, useState } from "react";
import { BookOpen, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDistribution, type DistributionId } from "@/lib/distributions";

function humanise(value: string) {
  return value.replace(/_/g, " ").replace(/-/g, " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}

export function DistributionPage({ distributionId }: { distributionId: DistributionId }) {
  const config = getDistribution(distributionId);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState("all");
  const [collection, setCollection] = useState("all");
  const [format, setFormat] = useState("all");

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return config.demoCards.filter((card) => {
      if (audience !== "all" && card.audience !== audience) return false;
      if (collection !== "all" && card.collection !== collection) return false;
      if (format !== "all" && !card.formats.includes(format)) return false;
      if (!q) return true;
      return [card.title, card.author, card.collection, card.audience, card.note, ...card.formats]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [audience, collection, config.demoCards, format, query]);

  const headingId = distributionId + "-heading";
  const searchId = distributionId + "-search";

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-8 rounded-2xl border border-border bg-card p-6 md:p-8">
        <p className="text-sm font-semibold text-primary">{config.name}</p>
        <h1 id={headingId} className="mt-2 max-w-4xl font-display text-3xl font-bold tracking-tight md:text-4xl">
          {config.headline}
        </h1>
        <p className="mt-3 max-w-4xl text-muted-foreground">{config.description}</p>
        <div className="mt-5 flex gap-2 rounded-xl border border-border bg-background p-4 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p>{config.accessNote}</p>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">Search {config.name}</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this distribution" className="pl-10" />
          </div>

          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger aria-label="Filter by audience"><SelectValue placeholder="Audience" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audiences</SelectItem>
              {config.audiences.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={collection} onValueChange={setCollection}>
            <SelectTrigger aria-label="Filter by collection"><SelectValue placeholder="Collection" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All collections</SelectItem>
              {config.collections.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger aria-label="Filter by format"><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              {config.formats.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {cards.length} prototype item{cards.length === 1 ? "" : "s"} shown
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          {cards.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center" role="status">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold">No matching prototype items</h2>
              <p className="mt-1 text-muted-foreground">Try removing a filter.</p>
            </div>
          ) : (
            <ul className="grid list-none gap-4 p-0 md:grid-cols-2">
              {cards.map((card) => (
                <li key={card.title + "-" + card.collection}>
                  <Card className="h-full rounded-2xl">
                    <CardHeader>
                      <div className="mb-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-muted px-2.5 py-1">{card.collection}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1">{humanise(card.status)}</span>
                      </div>
                      <CardTitle className="text-xl">{card.title}</CardTitle>
                      <CardDescription>{card.author}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2 text-sm">
                        <div><dt className="font-medium">Audience</dt><dd className="text-muted-foreground">{card.audience}</dd></div>
                        <div><dt className="font-medium">Formats</dt><dd className="text-muted-foreground">{card.formats.join(", ")}</dd></div>
                      </dl>
                      <p className="mt-4 text-sm text-muted-foreground">{card.note}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-4" aria-label={config.name + " workflow"}>
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-lg">Typical workflow</CardTitle></CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {config.workflows.map((workflow) => <li key={workflow}>{workflow}</li>)}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}