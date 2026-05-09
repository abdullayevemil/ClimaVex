"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

export function GenerateAssessmentButton({
  regionId,
  isGenerating,
  onGenerate,
}: {
  regionId: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const { dictionary } = useI18n();

  return (
    <Button
      onClick={onGenerate}
      disabled={!regionId || isGenerating}
      className="w-full sm:w-auto"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {dictionary.generate.label}
    </Button>
  );
}
