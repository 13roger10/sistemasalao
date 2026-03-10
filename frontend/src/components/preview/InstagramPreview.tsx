"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

type ViewType = "feed" | "stories" | "reels";

interface InstagramPreviewProps {
  imageUrl: string;
  caption: string;
  hashtags: string[];
  username?: string;
  avatarUrl?: string;
  onViewChange?: (view: ViewType) => void;
}

export function InstagramPreview({
  imageUrl,
  caption,
  hashtags,
  username = "seu_perfil",
  avatarUrl,
  onViewChange,
}: InstagramPreviewProps) {
  const [viewType, setViewType] = useState<ViewType>("feed");
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Formatar a legenda com hashtags
  const formattedCaption = useMemo(() => {
    const hashtagsText = hashtags.length > 0 ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ") : "";
    return caption + hashtagsText;
  }, [caption, hashtags]);

  // Truncar legenda para preview
  const truncatedCaption = useMemo(() => {
    const maxLength = 125;
    if (formattedCaption.length <= maxLength) return formattedCaption;
    return formattedCaption.substring(0, maxLength);
  }, [formattedCaption]);

  const needsTruncation = formattedCaption.length > 125;

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
          <span key={index} className="text-[#00376b]">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleViewChange = (view: ViewType) => {
    setViewType(view);
    onViewChange?.(view);
  };

  // Render Feed View
  const renderFeedView = () => (
    <div className="mx-auto max-w-[400px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
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
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{username}</p>
        </div>
        <button className="p-1 text-gray-600">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="18" r="2" />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div className="relative aspect-square w-full bg-gray-100">
        <Image src={imageUrl} alt="Post preview" fill className="object-cover" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsLiked(!isLiked)} className="text-gray-900 transition-transform active:scale-125">
            {isLiked ? (
              <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
          <button className="text-gray-900">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button className="text-gray-900">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
        <button onClick={() => setIsSaved(!isSaved)} className="text-gray-900">
          {isSaved ? (
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <p className="text-sm font-semibold text-gray-900">{isLiked ? "1.235" : "1.234"} curtidas</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm text-gray-900">
          <span className="font-semibold">{username} </span>
          <span className="whitespace-pre-wrap">
            {renderCaptionWithHashtags(showFullCaption ? formattedCaption : truncatedCaption)}
          </span>
          {needsTruncation && !showFullCaption && (
            <button onClick={() => setShowFullCaption(true)} className="text-gray-500">
              ...mais
            </button>
          )}
        </p>
        {showFullCaption && needsTruncation && (
          <button onClick={() => setShowFullCaption(false)} className="mt-1 text-sm text-gray-500">
            mostrar menos
          </button>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-3 pb-3">
        <p className="text-xs uppercase text-gray-500">Agora</p>
      </div>
    </div>
  );

  // Render Stories View
  const renderStoriesView = () => (
    <div className="mx-auto max-w-[280px]">
      {/* Phone Frame */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl">
        {/* Status Bar */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-2">
          <span className="text-xs font-medium text-white">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" />
            </svg>
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 17h20v2H2zm1.15-4.05L4 11.47l.85 1.48H7l-.85-1.48L7 10l.85 1.47 1.7 0-.85-1.47.85-1.47H7.85L7 10l-.85-1.47H4.45l.85 1.47-.85 1.47L4 10l-.85 1.47-.85-1.47H.6l.85 1.47-.85 1.48H2.3l.85-1.48z" />
            </svg>
            <div className="h-3 w-6 rounded-full bg-white" />
          </div>
        </div>

        {/* Story Content */}
        <div className="relative aspect-[9/16] w-full">
          <Image src={imageUrl} alt="Story preview" fill className="object-cover" />

          {/* Progress Bar */}
          <div className="absolute left-2 right-2 top-8 flex gap-1">
            <div className="h-0.5 flex-1 rounded-full bg-white" />
          </div>

          {/* Header */}
          <div className="absolute left-4 right-4 top-12 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={username} width={28} height={28} className="rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold text-white drop-shadow-lg">{username}</span>
            <span className="text-sm text-gray-200">1h</span>
            <div className="flex-1" />
            <button className="text-white">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="18" r="2" />
              </svg>
            </button>
          </div>

          {/* Caption Overlay */}
          {caption && (
            <div className="absolute bottom-20 left-4 right-4">
              <p className="line-clamp-3 rounded-lg bg-black/40 p-3 text-sm text-white backdrop-blur-sm">
                {caption.length > 100 ? caption.substring(0, 100) + "..." : caption}
              </p>
            </div>
          )}

          {/* Reply Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
            <div className="flex-1 rounded-full border border-white/50 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="text-sm text-white/70">Enviar mensagem</span>
            </div>
            <button className="text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button className="text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Reels View
  const renderReelsView = () => (
    <div className="mx-auto max-w-[280px]">
      {/* Phone Frame */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl">
        {/* Status Bar */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-2">
          <span className="text-xs font-medium text-white">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-3 w-6 rounded-full bg-white" />
          </div>
        </div>

        {/* Reels Content */}
        <div className="relative aspect-[9/16] w-full">
          <Image src={imageUrl} alt="Reels preview" fill className="object-cover" />

          {/* Reels Header */}
          <div className="absolute left-4 right-4 top-12 flex items-center justify-between">
            <span className="text-lg font-bold text-white drop-shadow-lg">Reels</span>
            <button className="text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Side Actions */}
          <div className="absolute bottom-24 right-4 flex flex-col items-center gap-6">
            <button className="flex flex-col items-center gap-1">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-xs font-semibold text-white">1.2K</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs font-semibold text-white">48</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button className="flex flex-col items-center gap-1">
              <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="18" r="2" />
              </svg>
            </button>
            <div className="h-8 w-8 rotate-6 rounded-md border-2 border-white overflow-hidden">
              <Image src={imageUrl} alt="Audio" width={32} height={32} className="object-cover" />
            </div>
          </div>

          {/* Bottom Info */}
          <div className="absolute bottom-4 left-4 right-16">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={username} width={28} height={28} className="rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold text-white drop-shadow-lg">{username}</span>
              <button className="rounded-md border border-white px-2 py-0.5 text-xs font-semibold text-white">
                Seguir
              </button>
            </div>
            <p className="text-sm text-white drop-shadow-lg line-clamp-2">
              {caption.length > 60 ? caption.substring(0, 60) + "..." : caption}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19V6l12-3v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span className="text-xs text-white">Som original - {username}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* View Type Selector */}
      <div className="flex justify-center gap-2">
        {[
          { value: "feed" as ViewType, label: "Feed", icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          )},
          { value: "stories" as ViewType, label: "Stories", icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          )},
          { value: "reels" as ViewType, label: "Reels", icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )},
        ].map((view) => (
          <button
            key={view.value}
            onClick={() => handleViewChange(view.value)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              viewType === view.value
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="flex justify-center py-4">
        {viewType === "feed" && renderFeedView()}
        {viewType === "stories" && renderStoriesView()}
        {viewType === "reels" && renderReelsView()}
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Este e um preview aproximado do Instagram. A aparencia real pode variar.
        </p>
      </div>
    </div>
  );
}
