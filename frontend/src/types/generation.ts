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
}

export interface StepDataMap {
  analyzing?: {
    title?: string;
    data_type?: string;
    complexity?: string;
    preview?: string;
  };
  structuring?: {
    preview?: string;
  };
  selection?: {
    style_id?: string;
    style_name?: string;
    layout_id?: string;
    layout_name?: string;
  };
  crafting?: {
    preview?: string;
  };
}

export interface JobStatus {
  job_id: string;
  status: string;
  progress: JobProgress | null;
  result: JobResult | null;
  error: string | null;
  step_data: StepDataMap | null;
  topic: string | null;
}

export type WizardStep = "topic" | "style" | "confirm" | "progress" | "result";

export interface GenerationHistoryItem {
  id: string;
  topic: string;
  style_id: string | null;
  style_name: string | null;
  layout_id: string | null;
  layout_name: string | null;
  image_url: string | null;
  aspect_ratio: string;
  created_at: string;
}
