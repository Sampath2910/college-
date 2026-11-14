import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  if (q) {
    redirect(`/projects?q=${encodeURIComponent(q.trim())}`);
  }
  redirect("/projects");
}

