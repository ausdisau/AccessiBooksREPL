import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubjectChipsProps {
  subjects: string[];
  selectedSubject: string | null;
  onSubjectSelect: (subject: string | null) => void;
}

const SUBJECT_LABELS: Record<string, string> = {
  "biography": "Biography",
  "fantasy": "Fantasy",
  "history": "History",
  "disability rights": "Disability Rights",
  "ya": "YA",
  "fiction": "Fiction",
  "non-fiction": "Non-Fiction",
  "romance": "Romance",
  "mystery": "Mystery",
  "science fiction": "Sci-Fi",
  "historical": "Historical",
  "poetry": "Poetry",
  "children": "Children",
};

export function SubjectChips({ subjects, selectedSubject, onSubjectSelect }: SubjectChipsProps) {
  const handleClick = (subject: string) => {
    if (selectedSubject === subject) {
      onSubjectSelect(null);
    } else {
      onSubjectSelect(subject);
    }
  };

  return (
    <section className="py-6" aria-label="Subject filters">
      <div className="flex flex-wrap gap-2 justify-center">
        {subjects.map((subject) => {
          const label = SUBJECT_LABELS[subject.toLowerCase()] || subject;
          const isSelected = selectedSubject === subject;
          return (
            <Button
              key={subject}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleClick(subject)}
              className={cn(
                "rounded-full font-medium",
                isSelected && "bg-primary text-primary-foreground"
              )}
              data-testid={`chip-subject-${subject}`}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
