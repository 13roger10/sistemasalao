import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100">
      <main className="flex flex-col items-center gap-8 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 text-white"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Social Studio IA
          </h1>
          <p className="max-w-md text-lg text-gray-600">
            Crie e publique posts incríveis para suas redes sociais com ajuda da
            Inteligência Artificial
          </p>
        </div>

        <Link
          href="/login"
          className="mt-4 rounded-full bg-violet-500 px-8 py-3 text-lg font-semibold text-white shadow-md transition-all hover:bg-violet-600 hover:shadow-lg active:scale-95"
        >
          Começar Agora
        </Link>

        <div className="mt-8 flex gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-violet-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Instagram</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-violet-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Facebook</span>
          </div>
        </div>
      </main>
    </div>
  );
}
