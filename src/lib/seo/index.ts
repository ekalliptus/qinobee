import { siteConfig } from "@/config/site";

export interface MetaInput {
	title: string;
	description?: string;
	canonical?: string; // absolute or path
	ogImage?: string;
	noindex?: boolean;
	type?: "website" | "article";
}

export interface MetaOutput {
	title: string;
	description: string;
	canonical?: string;
	ogImage: string;
	robots: string;
	type: string;
}

function resolveSiteUrl(siteUrl?: string): string {
	const url = siteUrl || import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321";
	return url.replace(/\/+$/, "");
}

function resolveUrl(pathOrUrl: string, base: string): string {
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function buildMeta(input: MetaInput, siteUrl?: string): MetaOutput {
	const base = resolveSiteUrl(siteUrl);
	const brand = siteConfig.name;
	const endsWithBrand = input.title.trim().toLowerCase().endsWith(brand.toLowerCase());
	const title = endsWithBrand ? input.title : `${input.title} — ${brand}`;
	const description = input.description ?? siteConfig.description;
	const robots = input.noindex ? "noindex,nofollow" : "index,follow";
	const canonical = input.canonical ? resolveUrl(input.canonical, base) : undefined;
	// SVG fallback (original branded card). PNG is generally preferred for OG,
	// but authoring a rasterized card here is out of scope; SVG is acceptable.
	const ogImage = resolveUrl(input.ogImage ?? "/og-default.svg", base);
	const type = input.type ?? "website";
	return { title, description, canonical, ogImage, robots, type };
}

export function organizationLd(siteUrl?: string) {
	const base = resolveSiteUrl(siteUrl);
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: siteConfig.name,
		url: base,
		description: siteConfig.description,
		email: siteConfig.email,
	};
}

export function websiteLd(siteUrl?: string) {
	const base = resolveSiteUrl(siteUrl);
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: siteConfig.name,
		url: base,
		description: siteConfig.description,
	};
}

export function softwareApplicationLd(siteUrl?: string) {
	const base = resolveSiteUrl(siteUrl);
	return {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: siteConfig.name,
		url: base,
		description: siteConfig.description,
		applicationCategory: "EducationalApplication",
		operatingSystem: "Web",
	};
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}

export interface ArticleLdInput {
	title: string;
	description: string;
	publishedAt: string | Date;
	updatedAt?: string | Date;
	author: string;
	url: string; // absolute or path
	image?: string; // absolute or path
}

export function articleLd(input: ArticleLdInput, siteUrl?: string) {
	const base = resolveSiteUrl(siteUrl);
	const toIso = (d: string | Date) => (d instanceof Date ? d.toISOString() : d);
	return {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: input.title,
		description: input.description,
		datePublished: toIso(input.publishedAt),
		...(input.updatedAt ? { dateModified: toIso(input.updatedAt) } : {}),
		author: { "@type": "Person", name: input.author },
		publisher: { "@type": "Organization", name: siteConfig.name },
		mainEntityOfPage: resolveUrl(input.url, base),
		image: resolveUrl(input.image ?? "/og-default.svg", base),
	};
}

export function contactPageLd(url: string, siteUrl?: string) {
	const base = resolveSiteUrl(siteUrl);
	return {
		"@context": "https://schema.org",
		"@type": "ContactPage",
		name: `Contact ${siteConfig.name}`,
		description: siteConfig.description,
		url: resolveUrl(url, base),
	};
}

export function faqLd(items: { question: string; answer: string }[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	};
}
