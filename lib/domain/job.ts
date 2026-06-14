/** 비동기 추론 작업 종류 (DEVELOPMENT §6). */
export type JobType =
  | "parse"
  | "demo"
  | "critique"
  | "analyze"
  | "improve"
  | "qa_generate"
  | "qa_evaluate"
  | "export";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";
