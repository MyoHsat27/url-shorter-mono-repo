"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ExternalLink, Trash2, Copy, Check, LinkIcon } from "lucide-react";

interface UserUrl {
  shortCode: string;
  longUrl: string;
  createdAt: number;
  expiresAt?: number;
}

const URL_SERVICE_API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3100/api";
const SHORTENER_URL =
  process.env.NEXT_PUBLIC_SHORTNER_URL || "http://localhost:3100";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, getAuthHeaders, token } = useAuth();
  const router = useRouter();
  const [urls, setUrls] = useState<UserUrl[]>([]);
  const [urlsLoading, setUrlsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchUrls = useCallback(async () => {
    try {
      const res = await fetch(`${URL_SERVICE_API}/urls`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as { data: UserUrl[] };
        setUrls(data.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setUrlsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      void fetchUrls();
    }
  }, [isAuthenticated, token, fetchUrls]);

  const handleCopy = async (shortCode: string) => {
    await navigator.clipboard.writeText(`${SHORTENER_URL}/${shortCode}`);
    setCopiedCode(shortCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (shortCode: string) => {
    setDeleteLoading(shortCode);
    try {
      const res = await fetch(`${URL_SERVICE_API}/urls/${shortCode}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setUrls((prev) => prev.filter((u) => u.shortCode !== shortCode));
      }
    } catch {
      // silently fail
    } finally {
      setDeleteLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-600 dark:border-t-neutral-100" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Dashboard
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          Welcome back, {user?.name}. Manage your shortened URLs here.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200/60 bg-white p-6 dark:border-neutral-800/60 dark:bg-neutral-900">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Total Links
          </p>
          <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {urls.length}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200/60 bg-white p-6 dark:border-neutral-800/60 dark:bg-neutral-900">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Active Links
          </p>
          <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {
              urls.filter(
                (u) => !u.expiresAt || u.expiresAt * 1000 > Date.now(),
              ).length
            }
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200/60 bg-white p-6 dark:border-neutral-800/60 dark:bg-neutral-900">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Expired Links
          </p>
          <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {
              urls.filter(
                (u) => u.expiresAt && u.expiresAt * 1000 <= Date.now(),
              ).length
            }
          </p>
        </div>
      </div>

      {/* URL List */}
      <div className="rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/60 dark:bg-neutral-900">
        <div className="border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-800/60">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Your Links
          </h2>
        </div>

        {urlsLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-600 dark:border-t-neutral-100" />
          </div>
        ) : urls.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <LinkIcon className="mb-4 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
            <p className="text-lg font-medium text-neutral-500 dark:text-neutral-400">
              No links yet
            </p>
            <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
              Create your first shortened URL from the home page
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
            {urls.map((url) => {
              const isExpired =
                url.expiresAt && url.expiresAt * 1000 <= Date.now();

              return (
                <div
                  key={url.shortCode}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={`${SHORTENER_URL}/${url.shortCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        {SHORTENER_URL}/{url.shortCode}
                      </a>
                      {isExpired && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {url.longUrl}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                      Created {new Date(url.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => void handleCopy(url.shortCode)}
                      className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                      title="Copy short URL"
                    >
                      {copiedCode === url.shortCode ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <a
                      href={url.longUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                      title="Open original URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => void handleDelete(url.shortCode)}
                      disabled={deleteLoading === url.shortCode}
                      className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      title="Delete URL"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
