import { ArrowRight, Hospital } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { distributions } from "@/lib/distributions";

const hospital = {
  id: "hospitals",
  name: "AccessiBooks @ Hospitals",
  eyebrow: "Hospitals and health services",
  headline: "Bedside reading, rehabilitation and hospital access",
  description:
    "A hospital-focused distribution that separates leisure reading, research and clinical information while preserving rights and access status.",
  path: "/hospitals",
};

export function DistributionHub() {
  const entries = [
    hospital,
    ...Object.values(distributions).map((distribution) => ({
      id: distribution.id,
      name: distribution.name,
      eyebrow: distribution.eyebrow,
      headline: distribution.headline,
      description: distribution.description,
      path: "/" + distribution.id,
    })),
  ];

  return (
    <section aria-labelledby="distribution-hub-heading">
      <div className="mb-8 rounded-2xl border border-border bg-card p-6 md:p-8">
        <p className="text-sm font-semibold text-primary">AccessiBooks distributions</p>
        <h1 id="distribution-hub-heading" className="mt-2 max-w-4xl font-display text-3xl font-bold tracking-tight md:text-4xl">
          One accessible reading platform, adapted to different settings
        </h1>
        <p className="mt-3 max-w-4xl text-muted-foreground">
          Every distribution shares the same core catalogue, rights provenance and accessibility model. The interface, policies and collections change to fit the setting without creating separate copies of the same book.
        </p>
      </div>

      <ul className="grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Card className="h-full rounded-2xl">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{entry.eyebrow}</p>
                <CardTitle className="text-xl">{entry.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex h-full flex-col">
                <h2 className="font-semibold">{entry.headline}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
                <a
                  href={entry.path}
                  className="mt-5 inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Open distribution
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
