export const siteConfig = {
	name: "Qinobee",
	shortName: "QB",
	description:
		"An integrated student success and career development platform for modern educational institutions.",
	email: "hello@example.com",
	demoUrl: "/request-demo",
	appUrl: "/app",
	defaultLocale: "en",
	supportedLocales: ["en", "id"] as const,
} as const;

export type SupportedLocale = (typeof siteConfig.supportedLocales)[number];
