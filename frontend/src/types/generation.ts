import { CombinationRecommendation } from "./style";

export interface GenerateRequest {
  topic: string;
  style_id?: string;
  layout_id?: string;
  text_labels?: string[];
  aspect_ratio?: string;
  language?: string;
}

export interface JobProgress {
  step: string;
  message: string;
  progress: number;
}

export interface JobResult {
  image_url: string | null;
  layout_id: string | null;
  layout_name: string | null;
  style_id: string | null;
  style_name: string | null;
  analysis: Record<string, unknown> | null;
  recommendations: CombinationRecommendation[] | null;
}

export interface JobStatus {
  job_id: string;
  status: string;
  progress: JobProgress | null;
  result: JobResult | null;
  error: string | null;
}

export type WizardStep = "topic" | "style" | "confirm" | "progress" | "result";
