import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Upload, Trash2, ArrowLeft } from "lucide-react";
import { Loader } from "@/components/loader";
import { useToast } from "@/hooks/use-toast";

interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
  contentType?: string;
}

async function fetchStorage(prefix: string): Promise<{ objects: StorageObject[] }> {
  const url = prefix ? `/api/admin/storage?prefix=${encodeURIComponent(prefix)}` : "/api/admin/storage";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function AdminStoragePage() {
  const [prefix, setPrefix] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-storage", prefix],
    queryFn: () => fetchStorage(prefix),
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select a file");
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);
      if (author) formData.append("author", author);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Uploaded", description: "Audiobook added to catalog." });
      setFile(null);
      setTitle("");
      setAuthor("");
      queryClient.invalidateQueries({ queryKey: ["admin-storage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch(`/api/admin/storage/${encodeURIComponent(key)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Object removed from storage." });
      queryClient.invalidateQueries({ queryKey: ["admin-storage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      uploadMutation.mutate();
    },
    [uploadMutation]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <a href="/">
            <Button variant="ghost" size="sm" aria-label="Back to library">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </a>
          <h1 className="text-2xl font-semibold">Admin – Storage (S3/GCS)</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload audiobook</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-title">Title</Label>
                  <Input
                    id="admin-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Book title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-author">Author</Label>
                  <Input
                    id="admin-author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-file">Audio file</Label>
                <Input
                  id="admin-file"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button type="submit" disabled={!file || uploadMutation.isPending}>
                {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objects in storage</CardTitle>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Filter by prefix (e.g. uploads/)"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader variant="inline" message="Loading storage…" />
              </div>
            )}
            {error && (
              <p className="text-destructive py-4">
                {error instanceof Error ? error.message : "Failed to load storage"}
              </p>
            )}
            {data && !isLoading && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Last modified</TableHead>
                    <TableHead aria-label="Actions" className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.objects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground text-center py-8">
                        No objects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.objects.map((obj) => (
                      <TableRow key={obj.key}>
                        <TableCell className="font-mono text-sm">{obj.key}</TableCell>
                        <TableCell>{formatSize(obj.size)}</TableCell>
                        <TableCell>{new Date(obj.lastModified).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(obj.key)}
                            disabled={deleteMutation.isPending}
                            aria-label={`Delete ${obj.key}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
