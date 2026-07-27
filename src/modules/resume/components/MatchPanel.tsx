import { useState } from "react";
import type { JobMatchResult } from "@modules/resume/matcher/types";

const BTN = "neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";

interface MatchResponse {
  ok: boolean;
  result?: JobMatchResult;
  tailoredId?: string;
}

function StringList(props: { label: string; items: string[]; empty: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold">{props.label}</h3>
      {props.items.length > 0 ? (
        <ul className="list-disc pl-5 text-sm">
          {props.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic">{props.empty}</p>
      )}
    </div>
  );
}

export default function MatchPanel(props: { resumeId: string }) {
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobMatchResult | null>(null);
  const [tailoredId, setTailoredId] = useState<string | null>(null);

  async function run(saveTailored: boolean) {
    setLoading(true);
    setError(null);
    if (!saveTailored) setTailoredId(null);
    try {
      const res = await fetch(`/api/resume/${props.resumeId}/match`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobDescription: jd, saveTailored }),
      });
      if (!res.ok) throw new Error("Could not match this job description.");
      const data = (await res.json()) as MatchResponse;
      if (data.result) setResult(data.result);
      if (data.tailoredId) setTailoredId(data.tailoredId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="match-title" className="neo-card flex flex-col gap-4">
      <h2 id="match-title" className="text-lg font-bold">
        Match With a Job
      </h2>
      <p className="text-sm">
        Paste a job description to see how your resume aligns. Your master CV is never
        modified — saving a tailored copy creates a new resume.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Job description</span>
        <textarea
          className="neo-input min-h-[120px]"
          rows={6}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the job description here…"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${BTN} bg-[var(--color-ink)] text-[var(--color-paper)]`}
          disabled={loading || jd.trim().length === 0}
          onClick={() => void run(false)}
        >
          {loading ? "Matching…" : "Match With a Job"}
        </button>
        {result ? (
          <button type="button" className={BTN} disabled={loading} onClick={() => void run(true)}>
            Save tailored copy
          </button>
        ) : null}
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-sm font-semibold text-[var(--color-red)]">
            {error}
          </p>
        ) : null}

        {tailoredId ? (
          <p className="text-sm font-semibold">
            Tailored copy created.{" "}
            <a className="underline" href={`/app/resume/${tailoredId}/edit`}>
              Open the tailored resume
            </a>
            . Your master CV is unchanged.
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-3">
            <p className="text-lg font-bold">Overall match: {result.overall}%</p>
            <StringList label="Matched skills" items={result.matched} empty="No overlapping keywords yet." />
            <StringList label="Missing keywords" items={result.missing} empty="Nothing missing — great coverage." />
            <StringList label="Relevant experience" items={result.relevantExperience} empty="No directly relevant experience detected." />
            <StringList label="Gaps to address" items={result.gaps} empty="No major gaps." />
            <StringList label="Sections to improve" items={result.sectionsToImprove} empty="No section changes suggested." />
          </div>
        ) : null}
      </div>
    </section>
  );
}
