"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Sparkles, Target, XCircle } from "lucide-react";
import { toast } from "sonner";
import { optimizeResumeForJob } from "@/actions/resume";
import { resumeOptimizationSchema } from "@/app/lib/schema";
import useFetch from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function KeywordOptimizer({
  getResumeContent,
  onApplyOptimized,
  initialAnalysis,
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis ?? null);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      resumeOptimizationSchema.omit({ resumeContent: true })
    ),
  });

  const {
    loading: optimizing,
    fn: optimizeFn,
    data: optimizationResult,
    error: optimizationError,
    reset: resetOptimization,
  } = useFetch(optimizeResumeForJob);

  useEffect(() => {
    if (optimizationResult) {
      setAnalysis(optimizationResult);
      toast.success("Resume analyzed and optimized!");
    }
  }, [optimizationResult]);

  useEffect(() => {
    if (optimizationError) {
      toast.error(
        optimizationError.message || "Failed to optimize resume for this job"
      );
    }
  }, [optimizationError]);

  const onSubmit = async (data) => {
    const resumeContent = getResumeContent()?.trim();
    if (!resumeContent) {
      toast.error("Add resume content before optimizing for a job");
      return;
    }

    await optimizeFn({
      ...data,
      resumeContent,
    });
  };

  const handleResetAnalysis = () => {
    if (analysis && !window.confirm("Existing ATS results will be cleared. Continue?")) {
      return;
    }

    setAnalysis(null);
    reset({ jobTitle: "", companyName: "", jobDescription: "" });
    resetOptimization();
  };

  const handleApply = () => {
    if (!analysis?.optimizedContent) return;
    onApplyOptimized(analysis.optimizedContent);
    toast.success("Optimized resume applied to preview");
  };

  const scoreColor =
    analysis?.atsScore >= 75
      ? "text-green-500"
      : analysis?.atsScore >= 50
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Keyword Optimization
        </CardTitle>
        <CardDescription>
          Paste a job description to analyze keyword match and get an
          ATS-optimized version of your resume
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title (optional)</Label>
              <Input
                id="jobTitle"
                placeholder="e.g. Frontend Developer"
                {...register("jobTitle")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company (optional)</Label>
              <Input
                id="companyName"
                placeholder="e.g. Google"
                {...register("companyName")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description</Label>
            <Textarea
              id="jobDescription"
              className="min-h-[160px]"
              placeholder="Paste the full job description here..."
              {...register("jobDescription")}
            />
            {errors.jobDescription && (
              <p className="text-sm text-red-500">
                {errors.jobDescription.message}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={optimizing}>
              {optimizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze & Optimize
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetAnalysis}
              disabled={optimizing}
            >
              Refresh
            </Button>
          </div>
        </form>

        {analysis && (
          <div className="space-y-5 border-t pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ATS Match Score</span>
                <span className={`text-2xl font-bold ${scoreColor}`}>
                  {Math.round(analysis.atsScore)}%
                </span>
              </div>
              <Progress value={analysis.atsScore} className="h-2" />
            </div>

            {analysis.matchedKeywords?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Matched Keywords
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.matchedKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      className="bg-green-500/10 text-green-700 border-green-500/20"
                      variant="outline"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.missingKeywords?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <XCircle className="h-4 w-4" />
                  Missing Keywords
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.missingKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      className="bg-red-500/10 text-red-700 border-red-500/20"
                      variant="outline"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.suggestions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Suggestions</p>
                <ul className="space-y-2">
                  {analysis.suggestions.map((item, index) => (
                    <li
                      key={`${item.section}-${index}`}
                      className="rounded-lg border bg-muted/40 p-3 text-sm"
                    >
                      <span className="font-medium">{item.section}: </span>
                      {item.recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.optimizedContent && (
              <Button onClick={handleApply} variant="secondary">
                Apply Optimized Resume
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
