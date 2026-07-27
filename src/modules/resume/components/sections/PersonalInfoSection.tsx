import type { ResumeDocument, PersonalInformation, Link } from "@modules/resume/types";
import { TextField } from "./fields";
import { SelectField } from "./fields";
import { ItemToolbar, BTN } from "./list-editors";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

const LINK_TYPES = [
  "linkedin",
  "github",
  "portfolio",
  "behance",
  "dribbble",
  "website",
  "other",
] as const;

export default function PersonalInfoSection(props: { doc: ResumeDocument; update: Updater }) {
  const pi = props.doc.personalInformation;
  const set = (patch: Partial<PersonalInformation>) =>
    props.update((prev) => ({
      ...prev,
      personalInformation: { ...prev.personalInformation, ...patch },
    }));
  const setLinks = (links: Link[]) => set({ links });

  return (
    <section aria-labelledby="sec-personal" className="flex flex-col gap-4">
      <h2 id="sec-personal" className="text-xl font-bold">
        Personal information
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" value={pi.firstName ?? ""} onChange={(v) => set({ firstName: v })} />
        <TextField label="Last name" value={pi.lastName ?? ""} onChange={(v) => set({ lastName: v })} />
        <TextField label="Email" type="email" value={pi.email ?? ""} onChange={(v) => set({ email: v })} />
        <TextField label="Phone" value={pi.phone ?? ""} onChange={(v) => set({ phone: v })} />
        <TextField label="Headline" value={pi.headline ?? ""} onChange={(v) => set({ headline: v })} />
        <TextField label="City" value={pi.city ?? ""} onChange={(v) => set({ city: v })} />
        <TextField label="Country" value={pi.country ?? ""} onChange={(v) => set({ country: v })} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">Links</h3>
        {pi.links.map((link, i) => (
          <div key={i} className="flex flex-col gap-2 border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-3">
            <SelectField
              label="Type"
              value={link.type}
              options={LINK_TYPES.map((t) => ({ value: t, label: t }))}
              onChange={(v) => setLinks(pi.links.map((l, j) => (j === i ? { ...l, type: v as Link["type"] } : l)))}
            />
            <TextField
              label="URL"
              type="url"
              value={link.url}
              error={link.url && !/^https?:\/\//i.test(link.url) ? "Must start with http:// or https://" : undefined}
              onChange={(v) => setLinks(pi.links.map((l, j) => (j === i ? { ...l, url: v } : l)))}
            />
            <TextField
              label="Label (optional)"
              value={link.label ?? ""}
              onChange={(v) => setLinks(pi.links.map((l, j) => (j === i ? { ...l, label: v } : l)))}
            />
            <ItemToolbar
              index={i}
              length={pi.links.length}
              label="link"
              onReorder={(fn) => setLinks(fn(pi.links) as Link[])}
              onDuplicate={() => setLinks([...pi.links.slice(0, i + 1), { ...link }, ...pi.links.slice(i + 1)])}
              onDelete={() => setLinks(pi.links.filter((_, j) => j !== i))}
            />
          </div>
        ))}
        <button
          type="button"
          className={BTN}
          onClick={() => setLinks([...pi.links, { type: "website", url: "" } as Link])}
        >
          Add link
        </button>
      </div>
    </section>
  );
}
