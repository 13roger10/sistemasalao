"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

interface PostPreviewProps {
  imageUrl: string;
  caption: string;
  hashtags: string[];
  username?: string;
  avatarUrl?: string;
  platform?: "instagram" | "facebook";
}

export function PostPreview({
  imageUrl,
  caption,
  hashtags,
  username = "seu_perfil",
  avatarUrl,
  platform: initialPlatform = "instagram",
}: PostPreviewProps) {
  const [platform, setPlatform] = useState<"instagram" | "facebook">(initialPlatform);
  const [showFullCaption, setShowFullCaption] = useState(false);

  // Formatar a legenda com hashtags
  const formattedCaption = useMemo(() => {
    const hashtagsText = hashtags.length > 0 ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ") : "";
    return caption + hashtagsText;
  }, [caption, hashtags]);

  // Truncar legenda para preview
  const truncatedCaption = useMemo(() => {
    const maxLength = platform === "instagram" ? 125 : 200;
    if (formattedCaption.length <= maxLength) return formattedCaption;
    return formattedCaption.substring(0, maxLength);
  }, [formattedCaption, platform]);

  const needsTruncation = formattedCaption.length > (platform === "instagram" ? 125 : 200);

  // Don't render if no valid image
  if (!imageUrl) {
    return null;
  }

  // Renderizar hashtags com estilo
  const renderCaptionWithHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <span key={index} className={platform === "instagram" ? "text-[#00376b] dark:text-blue-400" : "text-blue-600 dark:text-blue-400"}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4">
      {/* Platform Selector */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPlatform("instagram")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            platform === "instagram"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          Instagram
        </button>
        <button
          onClick={() => setPlatform("facebook")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            platform === "facebook"
              ? "bg-[#1877f2] text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>

      {/* Preview Card */}
      <div
        className={`mx-auto overflow-hidden rounded-xl border shadow-lg ${
          platform === "instagram"
            ? "max-w-[400px] border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            : "max-w-[500px] border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 p-3 ${platform === "facebook" ? "border-b border-gray-100 dark:border-gray-700" : ""}`}>
          {/* Avatar */}
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              platform === "instagram"
                ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5"
                : ""
            }`}
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={username}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Username */}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{username}</p>
            {platform === "facebook" && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Agora mesmo · 🌎</p>
            )}
          </div>

          {/* More Button */}
          <button className="p-1 text-gray-600 dark:text-gray-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="6" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="18" r="2" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <div className="relative aspect-square w-full bg-gray-100">
          <Image
            src={imageUrl}
            alt="Post preview"
            fill
            className="object-cover"
          />
        </div>

        {/* Actions */}
        {platform === "instagram" ? (
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-4">
              <button className="text-gray-900 dark:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              <button className="text-gray-900 dark:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
              <button className="text-gray-900 dark:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>
            <button className="text-gray-900 dark:text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-around border-t border-gray-100 dark:border-gray-700 py-2">
            <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              <span className="text-sm font-medium">Curtir</span>
            </button>
            <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="text-sm font-medium">Comentar</span>
            </button>
            <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              <span className="text-sm font-medium">Compartilhar</span>
            </button>
          </div>
        )}

        {/* Likes */}
        {platform === "instagram" && (
          <div className="px-3 pb-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">1.234 curtidas</p>
          </div>
        )}

        {/* Caption */}
        <div className="px-3 pb-3">
          <p className="text-sm text-gray-900 dark:text-white">
            {platform === "instagram" && (
              <span className="font-semibold">{username} </span>
            )}
            <span className="whitespace-pre-wrap">
              {renderCaptionWithHashtags(showFullCaption ? formattedCaption : truncatedCaption)}
            </span>
            {needsTruncation && !showFullCaption && (
              <button
                onClick={() => setShowFullCaption(true)}
                className="text-gray-500 dark:text-gray-400"
              >
                ...mais
              </button>
            )}
          </p>
          {showFullCaption && needsTruncation && (
            <button
              onClick={() => setShowFullCaption(false)}
              className="mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              mostrar menos
            </button>
          )}
        </div>

        {/* Timestamp */}
        {platform === "instagram" && (
          <div className="px-3 pb-3">
            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Agora</p>
          </div>
        )}
      </div>

      {/* Preview Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Este e um preview aproximado. A aparencia real pode variar.
        </p>
      </div>
    </div>
  );
}
