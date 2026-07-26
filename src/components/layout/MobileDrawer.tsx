import { useEffect, useRef, useState } from "react";
import type { NavGroup } from "@/config/navigation";

interface Props {
	nav: NavGroup[];
	demoUrl: string;
	signInHref: string;
}

const ink = "var(--color-ink)";
const paper = "var(--color-paper)";
const white = "var(--color-white)";
const yellow = "var(--color-yellow)";

export default function MobileDrawer({ nav, demoUrl, signInHref }: Props) {
	const [open, setOpen] = useState(false);
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	// Body scroll lock while open.
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	// Move focus into the drawer on open; restore to trigger on close.
	useEffect(() => {
		if (open) {
			const first = panelRef.current?.querySelector<HTMLElement>(
				'a, button, [tabindex]:not([tabindex="-1"])',
			);
			first?.focus();
		}
	}, [open]);

	// Escape to close + focus trap while open. Cleaned up on unmount/close.
	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				setOpen(false);
				triggerRef.current?.focus();
				return;
			}
			if (e.key !== "Tab") return;
			const panel = panelRef.current;
			if (!panel) return;
			const focusables = panel.querySelectorAll<HTMLElement>(
				'a, button, [tabindex]:not([tabindex="-1"])',
			);
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open]);

	const close = () => {
		setOpen(false);
		triggerRef.current?.focus();
	};

	const linkStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		minHeight: 44,
		padding: "0 16px",
		fontWeight: 600,
		color: ink,
		textDecoration: "none",
	};

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				aria-label="Open menu"
				aria-expanded={open}
				aria-controls="mobile-drawer"
				onClick={() => setOpen(true)}
				style={{
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					height: 44,
					width: 44,
					border: `2px solid ${ink}`,
					background: white,
					color: ink,
					cursor: "pointer",
				}}
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M4 6h16M4 12h16M4 18h16"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
					/>
				</svg>
			</button>

			{open && (
				<div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
					{/* Overlay */}
					<button
						type="button"
						aria-label="Close menu"
						onClick={close}
						style={{
							position: "absolute",
							inset: 0,
							background: "rgba(23,23,23,0.5)",
							border: 0,
							cursor: "pointer",
						}}
					/>
					{/* Drawer panel */}
					<div
						id="mobile-drawer"
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						aria-label="Menu"
						style={{
							position: "absolute",
							top: 0,
							right: 0,
							height: "100%",
							width: "min(20rem, 85vw)",
							background: paper,
							borderLeft: `2px solid ${ink}`,
							display: "flex",
							flexDirection: "column",
							overflowY: "auto",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "12px 16px",
								borderBottom: `2px solid ${ink}`,
							}}
						>
							<span style={{ fontWeight: 800, color: ink }}>Menu</span>
							<button
								type="button"
								aria-label="Close menu"
								onClick={close}
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									height: 44,
									width: 44,
									border: `2px solid ${ink}`,
									background: white,
									color: ink,
									cursor: "pointer",
								}}
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<path
										d="M6 6l12 12M18 6L6 18"
										stroke="currentColor"
										strokeWidth="2.5"
										strokeLinecap="round"
									/>
								</svg>
							</button>
						</div>

						<nav aria-label="Mobile" style={{ flex: 1, padding: "8px 0" }}>
							<ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
								{nav.map((group) => {
									const isOpen = !!openGroups[group.label];
									return (
										<li key={group.label} style={{ borderBottom: `2px solid ${ink}` }}>
											<button
												type="button"
												aria-expanded={isOpen}
												onClick={() =>
													setOpenGroups((g) => ({ ...g, [group.label]: !g[group.label] }))
												}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													width: "100%",
													minHeight: 44,
													padding: "0 16px",
													background: "transparent",
													border: 0,
													fontWeight: 700,
													color: ink,
													cursor: "pointer",
												}}
											>
												{group.label}
												<svg
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													aria-hidden="true"
													style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
												>
													<path
														d="M6 9l6 6 6-6"
														stroke="currentColor"
														strokeWidth="2.5"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											</button>
											{isOpen && (
												<ul style={{ listStyle: "none", margin: 0, padding: 0, background: white }}>
													{group.links.map((link) => (
														<li key={link.href}>
															<a
																href={link.href}
																style={{ ...linkStyle, paddingLeft: 28 }}
																{...(link.external
																	? { target: "_blank", rel: "noopener noreferrer" }
																	: {})}
															>
																{link.label}
															</a>
														</li>
													))}
												</ul>
											)}
										</li>
									);
								})}
							</ul>
						</nav>

						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 8,
								padding: 16,
								borderTop: `2px solid ${ink}`,
							}}
						>
							<a
								href={signInHref}
								style={{
									...linkStyle,
									justifyContent: "center",
									border: `2px solid ${ink}`,
									background: white,
								}}
							>
								Sign In
							</a>
							<a
								href={demoUrl}
								style={{
									...linkStyle,
									justifyContent: "center",
									border: `2px solid ${ink}`,
									background: yellow,
									boxShadow: "5px 5px 0 var(--color-ink)",
								}}
							>
								Request Demo
							</a>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
