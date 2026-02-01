import { StyleRecommendation } from "./style";

export interface GenerateRequest {
  topic: string;
  style_id?: string;
  text_labels?: string[];
  aspect_ratio?: string;
}

export interface JobProgress {
  step: string;
  message: string;
  progress: number;
}

export interface JobResult {
  base_image_url: string | null;
  final_image_url: string | null;
  style_id: string | null;
  style_name: string | null;
  analysis: Record<string, unknown> | null;
  recommendations: StyleRecommendation[] | null;
}

export interface JobStatus {
  job_id: string;
  status: string;
  progress: JobProgress | null;
  result: JobResult | null;
  error: string | null;
}

export type WizardStep = "topic" | "style" | "confirm" | "progress" | "result";
