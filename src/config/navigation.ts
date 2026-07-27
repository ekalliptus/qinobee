export interface NavLink {
	label: string;
	href: string;
	external?: boolean;
}

export interface NavGroup {
	label: string;
	links: NavLink[];
}

export const solutionsNav: NavLink[] = [
	{ label: "Career Management", href: "/solutions/career-management" },
	{ label: "Internship Management", href: "/solutions/internship-management" },
	{ label: "Mentoring Management", href: "/solutions/mentoring-management" },
	{ label: "Student Life", href: "/solutions/student-life" },
	{ label: "Scholarship Management", href: "/solutions/scholarship-management" },
	{ label: "International Exchange", href: "/solutions/international-exchange" },
];

export const headerNav: NavGroup[] = [
	{ label: "Solutions", links: solutionsNav },
	{
		label: "Product",
		links: [
			{ label: "Features", href: "/features" },
			{ label: "CV Builder", href: "/app/resume" },
		],
	},
	{
		label: "Company",
		links: [
			{ label: "Success Stories", href: "/success-stories" },
			{ label: "Resources", href: "/resources" },
			{ label: "About", href: "/about" },
		],
	},
];

export const footerNav: NavGroup[] = [
	{ label: "Solutions", links: solutionsNav },
	{
		label: "Company",
		links: [
			{ label: "Features", href: "/features" },
			{ label: "Success Stories", href: "/success-stories" },
			{ label: "Resources", href: "/resources" },
			{ label: "About", href: "/about" },
			{ label: "Request Demo", href: "/request-demo" },
		],
	},
	{
		label: "Legal",
		links: [
			{ label: "Privacy", href: "/privacy" },
			{ label: "Terms", href: "/terms" },
		],
	},
];

export const legalNav: NavLink[] = [
	{ label: "Privacy", href: "/privacy" },
	{ label: "Terms", href: "/terms" },
];
