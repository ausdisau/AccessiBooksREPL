import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, ListMusic } from "lucide-react";

interface Chapter {
  id: string;
  title: string;
  audioUrl: string;
  duration: string;
  chapterNumber: number;
}

interface ChapterListProps {
  bookId: string;
  onChapterSelect: (chapter: Chapter) => void;
  currentChapterId?: string;
}

export function ChapterList({ bookId, onChapterSelect, currentChapterId }: ChapterListProps) {
  const { data: chapters = [], isLoading } = useQuery<Chapter[]>({
    queryKey: [`/api/books/${bookId}/chapters`],
    enabled: !!bookId && bookId.startsWith("librivox-"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListMusic className="h-5 w-5" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chapters.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListMusic className="h-5 w-5" />
          Chapters ({chapters.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-1 pr-4">
            {chapters.map((chapter) => {
              const isCurrentChapter = chapter.id === currentChapterId;
              
              return (
                <Button
                  key={chapter.id}
                  variant={isCurrentChapter ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-3 px-3"
                  onClick={() => onChapterSelect(chapter)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {isCurrentChapter ? (
                        <Play className="h-4 w-4 text-primary fill-primary" />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {chapter.chapterNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-sm truncate ${isCurrentChapter ? "font-medium" : ""}`}>
                        {chapter.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chapter.duration}
                      </p>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
