import type { CSSProperties, ReactNode } from "react";
import type { ResumeDocument, SkillGroup, Link } from "@modules/resume/types";
import { linkLabel } from "./format";

const SKILL_CATEGORY_LABEL: Record<SkillGroup["category"], string> = {
  technical: "Technical",
  tools: "Tools",
  soft: "Soft Skills",
  industry: "Industry",
  languages: "Languages",
  custom: "Skills",
};

export function SectionHeading({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <h2 className={className} style={style}>
      {children}
    </h2>
  );
}

export function BulletList({
  items,
  style,
  itemStyle,
}: {
  items: readonly string[];
  style?: CSSProperties;
  itemStyle?: CSSProperties;
}) {
  const visible = items.filter((i) => i && i.trim());
  if (visible.length === 0) return null;
  return (
    <ul style={{ margin: "2mm 0 0", paddingLeft: "5mm", ...style }}>
      {visible.map((it, i) => (
        <li key={i} style={{ marginBottom: "1mm", ...itemStyle }}>
          {it}
        </li>
      ))}
    </ul>
  );
}

/** Renders contact metadata as selectable text, separated by a divider glyph. */
export function ContactLine({
  resume,
  showLinks,
  separator = " · ",
  style,
}: {
  resume: ResumeDocument;
  showLinks: boolean;
  separator?: string;
  style?: CSSProperties;
}) {
  const pi = resume.personalInformation;
  const parts: ReactNode[] = [];
  if (pi.email) parts.push(pi.email);
  if (pi.phone) parts.push(pi.phone);
  const location = [pi.city, pi.country].filter(Boolean).join(", ");
  if (location) parts.push(location);
  if (pi.address) parts.push(pi.address);
  if (showLinks) {
    for (const link of pi.links ?? []) parts.push(renderLink(link));
  }
  if (parts.length === 0) return null;
  return (
    <div style={style}>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden>{separator}</span>}
          {p}
        </span>
      ))}
    </div>
  );
}

function renderLink(link: Link) {
  return (
    <a href={link.url} style={{ color: "inherit", textDecoration: "none" }}>
      {linkLabel(link)}
    </a>
  );
}

/** Skill groups as "Label: a, b, c" lines. */
export function SkillGroupList({
  groups,
  style,
  labelStyle,
  as = "inline",
}: {
  groups: readonly SkillGroup[];
  style?: CSSProperties;
  labelStyle?: CSSProperties;
  as?: "inline" | "block";
}) {
  const visible = groups.filter((g) => g.skills.some((s) => s && s.trim()));
  if (visible.length === 0) return null;
  return (
    <div style={style}>
      {visible.map((g, i) => {
        const label = g.label?.trim() || SKILL_CATEGORY_LABEL[g.category];
        const skills = g.skills.filter((s) => s && s.trim()).join(", ");
        return (
          <div
            key={i}
            style={{ marginBottom: "1.5mm", display: as === "block" ? "block" : undefined }}
          >
            <span style={{ fontWeight: 600, ...labelStyle }}>{label}: </span>
            <span>{skills}</span>
          </div>
        );
      })}
    </div>
  );
}

export function skillCategoryLabel(category: SkillGroup["category"]): string {
  return SKILL_CATEGORY_LABEL[category];
}
