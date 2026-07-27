import { useId } from "react";
import type { ChangeEvent, ReactNode } from "react";

const INPUT = "neo-input w-full min-h-[44px]";

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
}

function Describers(id: string, hint?: string, error?: string) {
  const ids: string[] = [];
  if (hint) ids.push(`${id}-hint`);
  if (error) ids.push(`${id}-err`);
  return {
    describedBy: ids.length ? ids.join(" ") : undefined,
    node: (
      <>
        {hint ? (
          <span id={`${id}-hint`} className="text-sm text-[var(--color-ink)]/70">
            {hint}
          </span>
        ) : null}
        {error ? (
          <span id={`${id}-err`} role="alert" className="text-sm text-[var(--color-red)]">
            {error}
          </span>
        ) : null}
      </>
    ) as ReactNode,
  };
}

export function TextField(
  props: BaseProps & {
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
  },
) {
  const id = useId();
  const { describedBy, node } = Describers(id, props.hint, props.error);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium text-[var(--color-ink)]">
        {props.label}
      </label>
      <input
        id={id}
        type={props.type ?? "text"}
        className={INPUT}
        value={props.value}
        placeholder={props.placeholder}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onChange(e.target.value)}
      />
      {node}
    </div>
  );
}

export function TextArea(
  props: BaseProps & {
    value: string;
    onChange: (v: string) => void;
    rows?: number;
    placeholder?: string;
  },
) {
  const id = useId();
  const { describedBy, node } = Describers(id, props.hint, props.error);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium text-[var(--color-ink)]">
        {props.label}
      </label>
      <textarea
        id={id}
        className={`${INPUT} py-2`}
        rows={props.rows ?? 4}
        value={props.value}
        placeholder={props.placeholder}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => props.onChange(e.target.value)}
      />
      {node}
    </div>
  );
}

export function SelectField(
  props: BaseProps & {
    value: string;
    onChange: (v: string) => void;
    options: ReadonlyArray<{ value: string; label: string }>;
  },
) {
  const id = useId();
  const { describedBy, node } = Describers(id, props.hint, props.error);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium text-[var(--color-ink)]">
        {props.label}
      </label>
      <select
        id={id}
        className={INPUT}
        value={props.value}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => props.onChange(e.target.value)}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {node}
    </div>
  );
}

export function CheckboxField(
  props: BaseProps & { checked: boolean; onChange: (v: boolean) => void },
) {
  const id = useId();
  const { describedBy, node } = Describers(id, props.hint, props.error);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 min-h-[44px]">
        <input
          id={id}
          type="checkbox"
          className="h-5 w-5"
          checked={props.checked}
          aria-invalid={props.error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e: ChangeEvent<HTMLInputElement>) => props.onChange(e.target.checked)}
        />
        <label htmlFor={id} className="font-medium text-[var(--color-ink)]">
          {props.label}
        </label>
      </div>
      {node}
    </div>
  );
}
