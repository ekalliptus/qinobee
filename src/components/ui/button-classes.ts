export type ButtonVariant =
  | "primary"
  | "secondary"
  | "dark"
  | "ghost"
  | "danger"
  | "success";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-yellow)] text-[var(--color-ink)]",
  secondary: "bg-[var(--color-white)] text-[var(--color-ink)]",
  dark: "bg-[var(--color-ink)] text-[var(--color-paper)]",
  ghost: "bg-transparent shadow-none text-[var(--color-ink)]",
  danger: "bg-[var(--color-red)] text-[var(--color-ink)]",
  success: "bg-[var(--color-success)] text-[var(--color-white)]",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-[44px] px-3 text-sm",
  md: "min-h-[48px] px-4 text-base",
  lg: "min-h-[56px] px-6 text-lg",
};

export function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
): string {
  return ["neo-button", VARIANT[variant], SIZE[size]].join(" ");
}
