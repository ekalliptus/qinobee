import { useId, useRef, useState, type KeyboardEvent } from "react";

interface TabPanel {
	label: string;
	items: string[];
}

const TABS: TabPanel[] = [
	{
		label: "Administrators",
		items: [
			"Work through the approval queue in one clear list",
			"See participation across every programme",
			"Track the status of each programme at a glance",
			"Export reports to share with committees",
		],
	},
	{
		label: "Students",
		items: [
			"Check your resume score and suggestions",
			"Browse jobs and opportunities",
			"Book and manage mentoring sessions",
			"Complete internship tasks on time",
			"See upcoming events and activities",
		],
	},
	{
		label: "Employers",
		items: [
			"Post jobs and internship openings",
			"Review applicants in one place",
			"Track hiring KPIs across postings",
			"Stay connected with the careers team",
		],
	},
	{
		label: "Mentors",
		items: [
			"View your assigned mentees",
			"Schedule and confirm sessions",
			"Record notes and follow-ups",
			"Track mentee progress over time",
		],
	},
	{
		label: "Leadership",
		items: [
			"See institution-wide participation trends",
			"Review outcomes across all programmes",
			"Compare engagement between departments",
			"Export summaries for board reporting",
		],
	},
];

export default function ProductTabs() {
	const [active, setActive] = useState(0);
	const baseId = useId();
	const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

	const focusTab = (index: number) => {
		setActive(index);
		tabRefs.current[index]?.focus();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		const last = TABS.length - 1;
		if (event.key === "ArrowRight") {
			event.preventDefault();
			focusTab(active === last ? 0 : active + 1);
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			focusTab(active === 0 ? last : active - 1);
		} else if (event.key === "Home") {
			event.preventDefault();
			focusTab(0);
		} else if (event.key === "End") {
			event.preventDefault();
			focusTab(last);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div
				role="tablist"
				aria-label="Explore the platform by role"
				className="flex flex-wrap gap-2"
			>
				{TABS.map((tab, index) => {
					const selected = index === active;
					return (
						<button
							key={tab.label}
							ref={(el) => {
								tabRefs.current[index] = el;
							}}
							type="button"
							role="tab"
							id={`${baseId}-tab-${index}`}
							aria-selected={selected}
							aria-controls={`${baseId}-panel-${index}`}
							tabIndex={selected ? 0 : -1}
							onClick={() => setActive(index)}
							onKeyDown={onKeyDown}
							className={`neo-button min-h-[44px] px-4 text-base ${
								selected
									? "bg-[var(--color-ink)] text-[var(--color-paper)]"
									: "bg-[var(--color-white)] text-[var(--color-ink)]"
							}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{TABS.map((tab, index) => (
				<div
					key={tab.label}
					role="tabpanel"
					id={`${baseId}-panel-${index}`}
					aria-labelledby={`${baseId}-tab-${index}`}
					hidden={index !== active}
					tabIndex={0}
					className="neo-card"
				>
					<ul className="flex flex-col gap-3">
						{tab.items.map((item) => (
							<li key={item} className="flex items-start gap-3">
								<span
									aria-hidden="true"
									className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-2 border-[var(--color-ink)] bg-[var(--color-yellow)] font-mono text-xs font-bold"
								>
									✓
								</span>
								<span className="text-[var(--color-ink)]">{item}</span>
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}
