export interface JobMatchResult {
  /** 0..100 */
  overall: number;
  /** normalized JD keywords present in resume */
  matched: string[];
  /** normalized JD keywords absent from resume */
  missing: string[];
  /** titles/sections that relate (best-effort) */
  relevantExperience: string[];
  /** same as missing but framed as gaps (top-N) */
  gaps: string[];
  /** e.g. ["skills","summary"] suggestions */
  sectionsToImprove: string[];
}
