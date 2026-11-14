export type ProjectCard = {
  id: number;
  slug: string;
  title: string;
  shortDescription: string | null;
  category: string | null;
  categorySlug: string | null;
  projectType: string;
  difficulty: string | null;
  platform: string;
  platformCode: string;
  primaryLanguage: string | null;
  technologies: string[];
  stars: number | null;
  licence: string | null;
  sourceUpdatedAt: string | null;
  featured: boolean;
};

export type PackageOption = {
  type: string;
  title: string;
  priceInr: number;
  originalPriceInr?: number;
  subtitle: string;
  features: string[];
  popular?: boolean;
};

export type ProjectDetail = {
  card: ProjectCard;
  overview: string | null;
  problemStatement: string | null;
  objectives: string[];
  features: string[];
  modules: string[];
  authorName: string | null;
  authorUrl: string | null;
  sourceUrl: string | null;
  sourceGated?: boolean;
  packages?: PackageOption[];
  licenceName: string | null;
  licenceUrl: string | null;
  forks: number | null;
  demoUrl: string | null;
  documentationUrl: string | null;
  screenshots: { url: string; attribution: string | null }[];
  sourceCreatedAt: string | null;
  lastVerifiedAt: string | null;
  publishedAt: string | null;
  similar: ProjectCard[];
};

export type Paged<T> = { items: T[]; total: number; page: number; size: number };
export type Category = { name: string; slug: string; description: string | null; projectCount: number };
export type Facets = {
  languages: { name: string; projectCount: number }[];
  technologies: { name: string; slug: string; projectCount: number }[];
  types: { name: string; projectCount: number }[];
  platforms: { code: string; name: string; projectCount: number }[];
};
export type Home = {
  featured: ProjectCard[];
  recent: ProjectCard[];
  categories: Category[];
  technologies: Facets["technologies"];
  totalPublished: number;
};
export type Me = { authenticated: boolean; id?: number; email?: string; fullName?: string; roles?: string[] };

export const PROJECT_TYPES: Record<string, string> = {
  SOFTWARE_PROJECT: "Software project",
  ML_NOTEBOOK: "ML notebook",
  DATASET: "Dataset",
  MODEL: "Model",
  COMPETITION_SOLUTION: "Competition solution",
  RESEARCH_REFERENCE: "Research reference",
};
export const DIFFICULTIES: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };
export const SERVICES: Record<string, { label: string; blurb: string }> = {
  REQUEST_PROJECT: { label: "Help implementing this project", blurb: "Guidance to set up, run and understand an existing project." },
  CUSTOMIZE: { label: "Customise a project", blurb: "Changes to features, design or technology to fit your brief." },
  SIMILAR_PROJECT: { label: "Build a similar project", blurb: "A new build inspired by a project you like." },
  DOCUMENTATION_PPT: { label: "Documentation and PPT", blurb: "Report, diagrams and slides prepared for your project." },
  GUIDANCE: { label: "Technical guidance", blurb: "Sessions to understand code, architecture or concepts." },
  CONSULTATION: { label: "Consultation", blurb: "Help choosing a topic, scope and technology." },
};
export const ENQUIRY_STATUSES: Record<string, string> = {
  NEW: "Received",
  REVIEWING: "Under review",
  REQUIREMENTS_CLARIFICATION: "Clarifying requirements",
  QUOTATION_PREPARED: "Preparing quotation",
  QUOTATION_SENT: "Quotation sent",
  ACCEPTED: "Accepted",
  REJECTED: "Declined",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CLOSED: "Closed",
};

export type DownloadItem = {
  downloadToken: string;
  fileType: string;
  fileName: string;
  fileSizeBytes: number;
  downloadCount: number;
  maxDownloads: number;
  expiresAt: string;
  downloadUrl: string;
};

export type OrderRecord = {
  id: number;
  orderReference: string;
  projectId: number;
  projectTitle: string;
  projectSlug: string | null;
  packageType: string;
  amountInr: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paymentGateway: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string | null;
  studentCollege: string | null;
  paidAt: string | null;
  createdAt: string;
  downloads: DownloadItem[];
};

