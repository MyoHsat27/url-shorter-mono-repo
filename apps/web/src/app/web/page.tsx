import { UrlShortenerForm } from "@/components/url-shortener-form";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 pt-32 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className=" text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl dark:text-neutral-50">
            Shorten your links,{" "}
            <span className="bg-gradient-to-r from-neutral-500 to-neutral-900 bg-clip-text text-transparent dark:from-neutral-400 dark:to-neutral-100">
              amplify your reach
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-neutral-400">
            Transform long, unwieldy URLs into clean, memorable links. Fast,
            reliable, and completely free.
          </p>
        </div>

        {/* URL Shortener Form */}
        <div className="mx-auto mt-12 w-full max-w-2xl">
          <UrlShortenerForm />
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-neutral-100 bg-neutral-50/50 py-20 dark:border-neutral-900 dark:bg-neutral-900/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 dark:bg-neutral-900/50 dark:ring-neutral-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <svg
                  className="h-6 w-6 text-neutral-900 dark:text-neutral-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Lightning Fast
              </h3>
              <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                Generate short links instantly with our optimized infrastructure
                built for speed.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 dark:bg-neutral-900/50 dark:ring-neutral-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <svg
                  className="h-6 w-6 text-neutral-900 dark:text-neutral-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Secure & Reliable
              </h3>
              <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                Your links are safe and always available when you need them,
                with 99.9% uptime.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 sm:col-span-2 lg:col-span-1 dark:bg-neutral-900/50 dark:ring-neutral-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <svg
                  className="h-6 w-6 text-neutral-900 dark:text-neutral-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Simple & Clean
              </h3>
              <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                No clutter, no ads. Just paste your link and go. Simplicity at
                its finest.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
