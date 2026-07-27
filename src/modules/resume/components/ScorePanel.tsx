import { useCallback, useEffect, useState } from "react";
import type { ResumeScore, Severity } from "@modules/resume/scoring/types";

const BTN = "neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  important: "Important",
  suggestion: "Suggestion",
  passed: "Passed",
};
// Text icon so severity is never conveyed by color alone.
const SEVERITY_ICON: Record<Severity, string> = {
  critical: "✕",
  important: "!",
  suggestion: "•",
  passed: "✓",
};

/** Small React scoring ring. Always shows the number + label (not color-only). */
function Ring(props: { score: number }) {
  const size = 96;
  const stroke = 8;
  const clamped = Math.max(0, Math.min(100, Math.round(props.score)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const band = clamped < 50 ? "Needs work" : clamped < 75 ? "Fair" : "Strong";
  const color =
    clamped < 50 ? "var(--color-red)" : clamped < 75 ? "var(--color-orange)" : "var(--color-success)";
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Overall score ${clamped} out of 100, ${band}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontWeight="700" fontSize={size * 0.28} fill="var(--color-ink)">
          {clamped}
        </text>
      </svg>
      <div>
        <p className="text-2xl font-bold">{clamped}/100</p>
        <p className="text-sm">{band}</p>
      </div>
    </div>
  );
}

export default function ScorePanel(props: { resumeId: string }) {
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resume/${props.resumeId}/score`);
      if (!res.ok) throw new Error("Could not compute score.");
      const data = (await res.json()) as { score: ResumeScore };
      setScore(data.score);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [props.resumeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section aria-labelledby="score-title" className="neo-card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="score-title" className="text-lg font-bold">
          ATS Score
        </h2>
        <button type="button" className={BTN} onClick={() => void load()} disabled={loading}>
          {loading ? "Computing…" : "Recompute"}
        </button>
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-sm font-semibold text-[var(--color-red)]">
            {error}
          </p>
        ) : null}

        {score ? (
          <>
            <Ring score={score.overall} />
            <ul className="flex flex-col gap-3">
              {score.categories.map((cat) => (
                <li key={cat.id} className="border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{cat.label}</span>
                    <span>{cat.score}/100</span>
                  </div>
                  {cat.issues.filter((i) => i.severity !== "passed").length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-1 text-sm">
                      {cat.issues
                        .filter((i) => i.severity !== "passed")
                        .map((issue, i) => (
                          <li key={i}>
                            <span aria-hidden="true">{SEVERITY_ICON[issue.severity]} </span>
                            <span className="font-medium">[{SEVERITY_LABEL[issue.severity]}]</span>{" "}
                            {issue.message}
                            {issue.recommendation ? (
                              <span className="block text-[var(--color-ink)]">→ {issue.recommendation}</span>
                            ) : null}
                            {issue.sectionId ? (
                              <span className="block italic">Section: {issue.sectionId}</span>
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm">✓ No issues found.</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs italic">{score.disclaimer}</p>
          </>
        ) : !error ? (
          <p className="text-sm">Loading score…</p>
        ) : null}
      </div>
    </section>
  );
}
