"use client";

import React from "react";
import { Sparkles, RotateCcw, AlertCircle, Tag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export interface StructuredResultProps {
  summary?: string;
  tags?: string[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function StructuredResult({
  summary,
  tags = [],
  isLoading = false,
  error = null,
  onRetry,
}: StructuredResultProps): React.JSX.Element {
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-spin text-primary" />
            <CardTitle className="text-base font-medium">Extracting AI Insights...</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <CardTitle className="text-base font-medium">Extraction Failed</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive/90">{error}</p>
        </CardContent>
        {onRetry && (
          <CardFooter className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry Extraction
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  const hasData = Boolean(summary || (tags && tags.length > 0));

  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <CardTitle className="text-base font-medium">Structured AI Extraction</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No structured summary or tags extracted yet.
          </p>
        </CardContent>
        {onRetry && (
          <CardFooter className="pt-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Run Extraction
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-medium">AI Insights</CardTitle>
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Re-run extraction"
          >
            <RotateCcw className="h-3 w-3" />
            Re-run
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Summary
            </h4>
            <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
          </div>
        )}
        {tags && tags.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

