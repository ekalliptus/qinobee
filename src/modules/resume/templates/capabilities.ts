import type { TemplateCapabilities } from "@modules/resume/components/PreviewAppearance";

const MAP: Record<string, TemplateCapabilities> = {
  essential: { divider: true, alignment: true },
  modern: { divider: false, alignment: true },
  executive: { divider: true, alignment: false },
  graduate: { divider: false, alignment: true },
  technical: { divider: false, alignment: false },
  academic: { divider: true, alignment: true },
};

export function templateCapabilities(id: string): TemplateCapabilities {
  return MAP[id] ?? { divider: false, alignment: false };
}
