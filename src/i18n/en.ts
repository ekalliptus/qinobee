// English UI dictionary (source of truth / fallback locale).
// UI locale is SEPARATE from CV `language` used by resume template formatters.
export const en = {
  nav: {
    solutions: "Solutions",
    features: "Features",
    resources: "Resources",
    successStories: "Success Stories",
    about: "About",
    pricing: "Pricing",
    login: "Log in",
  },
  cta: {
    requestDemo: "Request a Demo",
    exploreSolutions: "Explore Solutions",
    getStarted: "Get Started",
    learnMore: "Learn More",
    contactSales: "Contact Sales",
  },
  footer: {
    product: "Product",
    company: "Company",
    resources: "Resources",
    legal: "Legal",
    rights: "All rights reserved.",
  },
  common: {
    home: "Home",
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    search: "Search",
  },
  form: {
    fullName: "Full name",
    workEmail: "Work email",
    institution: "Institution",
    jobTitle: "Job title",
    country: "Country",
    submit: "Submit",
    required: "This field is required.",
  },
  save: {
    saving: "Saving…",
    saved: "All changes saved",
    error: "Could not save",
    unsaved: "Unsaved changes",
  },
  editor: {
    title: "Editor",
    addSection: "Add section",
    preview: "Preview",
    export: "Export",
    template: "Template",
  },
  empty: {
    noResumes: "No resumes yet. Create your first one to get started.",
    noResults: "No results found.",
    noData: "Nothing here yet.",
  },
};

export type Dict = typeof en;
