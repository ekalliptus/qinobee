export interface Solution {
	slug: string;
	title: string;
	color: "blue" | "green" | "pink" | "purple" | "orange" | "yellow";
	icon: string; // lucide-react icon name, e.g. "Briefcase"
	description: string;
	capabilities: string[];
	href: string;
}

export const solutions: Solution[] = [
	{
		slug: "career-management",
		title: "Career Management",
		color: "blue",
		icon: "Briefcase",
		description:
			"Run the full career journey in one place, from job discovery to placement, with outcomes your team can actually see.",
		capabilities: [
			"Job and opportunity board",
			"Application tracking",
			"Employer relationship records",
			"Placement outcome reporting",
		],
		href: "/solutions/career-management",
	},
	{
		slug: "internship-management",
		title: "Internship Management",
		color: "green",
		icon: "ClipboardList",
		description:
			"Coordinate placements, approvals and progress so every internship stays on track without endless email threads.",
		capabilities: [
			"Placement approval workflows",
			"Supervisor and student check-ins",
			"Progress and hours tracking",
			"Completion status overview",
		],
		href: "/solutions/internship-management",
	},
	{
		slug: "mentoring-management",
		title: "Mentoring Management",
		color: "pink",
		icon: "Users",
		description:
			"Match students with mentors, schedule sessions and keep a clear record of every meaningful conversation.",
		capabilities: [
			"Mentor and mentee matching",
			"Session scheduling",
			"Notes and follow-up tracking",
			"Engagement summaries",
		],
		href: "/solutions/mentoring-management",
	},
	{
		slug: "student-life",
		title: "Student Life",
		color: "purple",
		icon: "CalendarHeart",
		description:
			"Bring events, clubs and activities together so students engage more and staff spend less time on logistics.",
		capabilities: [
			"Event and activity listings",
			"Club and society management",
			"Sign-ups and attendance",
			"Participation records",
		],
		href: "/solutions/student-life",
	},
	{
		slug: "scholarship-management",
		title: "Scholarship Management",
		color: "yellow",
		icon: "Award",
		description:
			"Manage applications, reviews and awards with a transparent process that is fair to students and easy for reviewers.",
		capabilities: [
			"Configurable application forms",
			"Reviewer assignment",
			"Award decision tracking",
			"Disbursement status records",
		],
		href: "/solutions/scholarship-management",
	},
	{
		slug: "international-exchange",
		title: "International Exchange",
		color: "blue",
		icon: "Globe",
		description:
			"Support students moving between institutions and countries with clear steps, documents and status at every stage.",
		capabilities: [
			"Programme and partner listings",
			"Application and eligibility review",
			"Document collection",
			"Placement status tracking",
		],
		href: "/solutions/international-exchange",
	},
	{
		slug: "resume-career-tools",
		title: "Resume & Career Tools",
		color: "orange",
		icon: "FileText",
		description:
			"Give every student a live resume editor with scoring and matching, so they graduate ready to apply with confidence.",
		capabilities: [
			"Live resume editor",
			"Resume scoring feedback",
			"Job description matching",
			"PDF export",
		],
		href: "/app/resume",
	},
	{
		slug: "institutional-analytics",
		title: "Institutional Analytics",
		color: "orange",
		icon: "BarChart3",
		description:
			"See participation and outcomes across every programme in one connected view, ready to share with leadership.",
		capabilities: [
			"Cross-programme dashboards",
			"Participation metrics",
			"Outcome reporting",
			"Exportable reports",
		],
		href: "/features",
	},
];
