"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ defaultValue = "stars" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(val: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", val);
    params.delete("page");
    router.push(`/projects?${params.toString()}`);
  }

  return (
    <div className="relative">
      <select
        id="sort-select"
        value={defaultValue}
        className="field h-9 text-xs"
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="stars">Most Popular (Stars/Votes)</option>
        <option value="newest">Recently Updated</option>
        <option value="relevance">Relevance</option>
        <option value="title">Alphabetical (A-Z)</option>
      </select>
    </div>
  );
}

