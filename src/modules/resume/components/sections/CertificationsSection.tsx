import type { ResumeDocument, Certification } from "@modules/resume/types";
import { TextField } from "./fields";
import { BTN } from "./list-editors";
import { AccordionItem, useAccordion, initialOpenIndex } from "./EntryAccordion";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

export default function CertificationsSection(props: {
  doc: ResumeDocument;
  update: Updater;
}) {
  const items = props.doc.certifications;
  const setItems = (next: Certification[]) =>
    props.update((prev) => ({ ...prev, certifications: next }));
  const patchItem = (i: number, patch: Partial<Certification>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const acc = useAccordion(initialOpenIndex(items.map((c) => !!c.name)));

  return (
    <section aria-labelledby="sec-certs" className="flex flex-col gap-6">
      <h2 id="sec-certs" className="text-xl font-bold">
        Certifications
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => (
          <AccordionItem
            key={i}
            index={i}
            length={items.length}
            title={it.name || `Certification ${i + 1}`}
            open={acc.isOpen(i)}
            onToggle={() => acc.toggle(i)}
            itemLabel="certification"
            onReorder={(fn) => setItems(fn(items) as Certification[])}
            onDuplicate={() =>
              setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])
            }
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
          >
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Name" value={it.name} onChange={(v) => patchItem(i, { name: v })} />
                <TextField label="Issuer" value={it.issuer ?? ""} onChange={(v) => patchItem(i, { issuer: v })} />
                <TextField label="Issue date" value={it.issueDate ?? ""} onChange={(v) => patchItem(i, { issueDate: v })} />
                <TextField label="Expiry date" value={it.expiryDate ?? ""} onChange={(v) => patchItem(i, { expiryDate: v })} />
                <TextField label="Credential ID" value={it.credentialId ?? ""} onChange={(v) => patchItem(i, { credentialId: v })} />
                <TextField label="Credential URL" type="url" value={it.credentialUrl ?? ""} onChange={(v) => patchItem(i, { credentialUrl: v })} />
              </div>
            </div>
          </AccordionItem>
        ))}
      </div>
      <button type="button" className={`${BTN} mt-2`} onClick={() => { setItems([...items, { name: "" }]); acc.open(items.length); }}>
        Add certification
      </button>
    </section>
  );
}
