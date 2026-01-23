"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Link2,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  QrCode,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createShortUrl, getShortUrl } from "@/lib/api";

const urlSchema = z.object({
  longUrl: z.string().url("Please enter a valid URL"),
});

type UrlFormData = z.infer<typeof urlSchema>;

interface ShortenedUrl {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
}

export function UrlShortenerForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shortenedUrl, setShortenedUrl] = React.useState<ShortenedUrl | null>(
    null,
  );
  const [copied, setCopied] = React.useState(false);
  const [showQRCode, setShowQRCode] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UrlFormData>({
    resolver: zodResolver(urlSchema),
  });

  const onSubmit = async (data: UrlFormData) => {
    setIsLoading(true);
    setError(null);
    setShortenedUrl(null);

    try {
      const response = await createShortUrl({ longUrl: data.longUrl });
      setShortenedUrl({
        shortCode: response.data.shortCode,
        shortUrl: getShortUrl(response.data.shortCode),
        longUrl: response.data.longUrl,
      });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (shortenedUrl) {
      await navigator.clipboard.writeText(shortenedUrl.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQRCode = () => {
    if (!shortenedUrl) return;

    const svg = document.getElementById("qr-code-svg") as unknown as SVGElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `qr-code-${shortenedUrl.shortCode}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Link2 className="h-7 w-7 text-neutral-900 dark:text-neutral-100" />
        </div>
        <CardTitle className="text-2xl">Shorten Your URL</CardTitle>
        <CardDescription>
          Paste your long URL below and get a short, shareable link instantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-8">
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="longUrl">Enter your URL</Label>
            <Input
              id="longUrl"
              type="url"
              placeholder="https://example.com/your-very-long-url-here"
              {...register("longUrl")}
              disabled={isLoading}
              aria-describedby={errors.longUrl ? "url-error" : undefined}
            />
            {errors.longUrl && (
              <p id="url-error" className="text-sm text-red-500">
                {errors.longUrl.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Shortening...
              </>
            ) : (
              "Shorten URL"
            )}
          </Button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        {shortenedUrl && (
          <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Your shortened URL is ready!
              </p>
              <div className="flex gap-1 rounded-lg bg-neutral-200 p-1 dark:bg-neutral-800">
                <button
                  onClick={() => setShowQRCode(false)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    !showQRCode
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                  }`}
                >
                  <Link2 className="inline h-3.5 w-3.5 mr-1" />
                  Link
                </button>
                <button
                  onClick={() => setShowQRCode(true)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    showQRCode
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                  }`}
                >
                  <QrCode className="inline h-3.5 w-3.5 mr-1" />
                  QR Code
                </button>
              </div>
            </div>

            {!showQRCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                  <a
                    href={shortenedUrl.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                  >
                    <span className="truncate">{shortenedUrl.shortUrl}</span>
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    void copyToClipboard();
                  }}
                  className="flex-shrink-0"
                  aria-label="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-neutral-900">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={shortenedUrl.shortUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <Button
                  onClick={() => {
                    downloadQRCode();
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            )}

            <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
              Original: {shortenedUrl.longUrl}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
