"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function BookmarkButton({ projectId, title }: { projectId: number; title: string }) {
  const { me, isStudent } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isStudent) return;
    // Check if currently saved
    api.get<number[]>("/student/saved/ids")
      .then((ids) => {
        if (Array.isArray(ids)) {
          setSaved(ids.includes(projectId));
        }
      })
      .catch(() => {});
  }, [isStudent, projectId]);

  async function handleToggle() {
    if (!me?.authenticated) {
      toast.error("Please log in as a student to bookmark projects", {
        action: { label: "Log in", onClick: () => window.location.href = "/login" },
      });
      return;
    }
    if (!isStudent) {
      toast.error("Administrator accounts do not have personal saved projects");
      return;
    }

    setLoading(true);
    const next = !saved;
    setSaved(next);

    try {
      if (next) {
        await api.put(`/student/saved/${projectId}`);
        toast.success(`Saved "${title}" to your bookmarks`);
      } else {
        await api.delete(`/student/saved/${projectId}`);
        toast.info(`Removed "${title}" from bookmarks`);
      }
    } catch (err: any) {
      setSaved(!next);
      toast.error(err.message || "Could not update bookmark");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`btn btn-sm ${
        saved
          ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
          : "btn-outline"
      }`}
      title={saved ? "Saved to your bookmarks" : "Save project"}
    >
      <Bookmark className={`size-4 ${saved ? "fill-primary" : ""}`} />
      <span>{saved ? "Saved" : "Save Project"}</span>
    </button>
  );
}

