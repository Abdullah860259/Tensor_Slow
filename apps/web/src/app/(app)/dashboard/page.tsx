import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  Sparkles,
  Plus,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle,
  Tag,
  FolderOpen,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { connectToDatabase, connectMongoose } from "@/lib/db";
import { ItemModel } from "@/lib/models";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

async function createItemAction(formData: FormData) {
  "use server";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  const title = formData.get("title")?.toString().trim();
  const content = formData.get("content")?.toString().trim() || "";

  if (!title) {
    return;
  }

  await connectToDatabase();
  await connectMongoose();
  const newItem = await ItemModel.create({
    ownerId: session.user.id,
    title,
    content,
    status: "pending",
    aiTags: [],
  });

  revalidatePath("/dashboard");
  redirect(`/items/${newItem._id.toString()}`);
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  await connectToDatabase();
  await connectMongoose();
  const rawItems = await ItemModel.find({ ownerId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const items = rawItems.map((item) => ({
    _id: item._id.toString(),
    title: item.title,
    content: item.content || "",
    status: item.status || "pending",
    aiSummary: item.aiSummary,
    aiTags: item.aiTags || [],
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
  }));

  const processedCount = items.filter((i) => i.status === "processed").length;
  const totalTags = new Set(items.flatMap((i) => i.aiTags)).size;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Workspace Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your artifacts, run AI structured extraction, and converse via RAG.
          </p>
        </div>

        {items.length > 0 && (
          <details className="group relative">
            <summary className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer list-none select-none">
              <Plus className="h-4 w-4" />
              <span>Create Item</span>
            </summary>
            <div className="absolute right-0 top-full mt-2 z-30 w-80 sm:w-96 rounded-xl border border-border bg-card p-4 shadow-xl">
              <form action={createItemAction} className="space-y-3">
                <h3 className="font-semibold text-sm text-foreground">New Item</h3>
                <div className="space-y-1">
                  <label htmlFor="top-title" className="text-xs font-medium text-muted-foreground">
                    Title
                  </label>
                  <Input
                    id="top-title"
                    name="title"
                    required
                    placeholder="e.g. Project Architecture Plan"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="top-content"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Content / Notes
                  </label>
                  <Textarea
                    id="top-content"
                    name="content"
                    placeholder="Paste text or notes to be analyzed..."
                    className="text-sm min-h-[90px]"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" className="gap-1.5 cursor-pointer">
                    <Sparkles className="h-3.5 w-3.5" />
                    Save & Open
                  </Button>
                </div>
              </form>
            </div>
          </details>
        )}
      </div>

      {/* Metrics Banner */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Items</p>
                <p className="text-xl font-bold text-foreground">{items.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Processed with AI</p>
                <p className="text-xl font-bold text-foreground">{processedCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Distinct AI Tags</p>
                <p className="text-xl font-bold text-foreground">{totalTags}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Area: Items or Empty State */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 sm:p-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary mb-4">
            <FolderOpen className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">No Items Found</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            Your workspace is empty. Create your first item below to test structured AI extraction,
            vector embeddings, and conversational RAG chat.
          </p>

          {/* Creation form inviting first action */}
          <div className="mt-6 w-full max-w-lg text-left">
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Create Your First Item</span>
                </CardTitle>
              </CardHeader>
              <form action={createItemAction}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="first-title" className="text-xs font-semibold text-foreground">
                      Item Title <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="first-title"
                      name="title"
                      required
                      placeholder="e.g. Q3 Strategic Planning Overview"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="first-content"
                      className="text-xs font-semibold text-foreground"
                    >
                      Item Content <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <Textarea
                      id="first-content"
                      name="content"
                      placeholder="Enter meeting notes, product specifications, or raw text to extract..."
                      className="min-h-[110px]"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-2">
                  <Button type="submit" className="gap-2 cursor-pointer">
                    <Sparkles className="h-4 w-4" />
                    <span>Create & Launch Analysis</span>
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Artifacts</h2>
            <span className="text-xs text-muted-foreground">{items.length} total</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card
                key={item._id}
                className="flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-snug line-clamp-1">
                      {item.title}
                    </CardTitle>
                    <Badge
                      variant={
                        item.status === "processed"
                          ? "default"
                          : item.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] px-1.5 py-0 capitalize shrink-0"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{item.createdAt.toLocaleDateString()}</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  {item.aiSummary ? (
                    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {item.aiSummary}
                    </p>
                  ) : item.content ? (
                    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {item.content}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No content</p>
                  )}

                  {item.aiTags && item.aiTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.aiTags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 text-muted-foreground"
                        >
                          #{tag}
                        </Badge>
                      ))}
                      {item.aiTags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{item.aiTags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3 border-t border-border/40">
                  <Link href={`/items/${item._id}`} className="w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between text-xs cursor-pointer group"
                    >
                      <span>View Details & Chat</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}





