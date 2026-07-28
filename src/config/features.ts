export const features = {
	aiAssist: true,
	publicShare: false,
	coverLetter: false,
	versionHistoryUi: false,
	resumeUpload: true,
} as const;

export type FeatureFlag = keyof typeof features;
