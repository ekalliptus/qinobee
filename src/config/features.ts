export const features = {
	aiAssist: true,
	publicShare: false,
	coverLetter: false,
	versionHistoryUi: false,
	resumeUpload: false,
} as const;

export type FeatureFlag = keyof typeof features;
