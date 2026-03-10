"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

type ViewType = "feed" | "stories";

interface FacebookPreviewProps {
  imageUrl: string;
  caption: string;
  hashtags: string[];
  username?: string;
  avatarUrl?: string;
  pageName?: string;
  onViewChange?: (view: ViewType) => void;
}

export function FacebookPreview({
  imageUrl,
  caption,
  hashtags,
  username = "Seu Negocio",
  avatarUrl,
  pageName,
  onViewChange,
}: FacebookPreviewProps) {
  const [viewType, setViewType] = useState<ViewType>("feed");
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  const displayName = pageName || username;

  // Formatar a legenda com hashtags
  const formattedCaption = useMemo(() => {
    const hashtagsText = hashtags.length > 0 ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ") : "";
    return caption + hashtagsText;
  }, [caption, hashtags]);

  // Truncar legenda para preview
  const truncatedCaption = useMemo(() => {
    const maxLength = 200;
    if (formattedCaption.length <= maxLength) return formattedCaption;
    return formattedCaption.substring(0, maxLength);
  }, [formattedCaption]);

  const needsTruncation = formattedCaption.length > 200;

  // Don't render if no valid image
  if (!imageUrl) {
    return null;
  }

  // Renderizar hashtags com estilo do Facebook
  const renderCaptionWithHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <span key={index} className="text-[#1877f2] hover:underline cursor-pointer">
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

  const reactions = [
    { emoji: "👍", name: "like", color: "#1877f2" },
    { emoji: "❤️", name: "love", color: "#f33e58" },
    { emoji: "😆", name: "haha", color: "#f7b125" },
    { emoji: "😮", name: "wow", color: "#f7b125" },
    { emoji: "😢", name: "sad", color: "#f7b125" },
    { emoji: "😡", name: "angry", color: "#e9710f" },
  ];

  // Render Feed View
  const renderFeedView = () => (
    <div className="mx-auto max-w-[500px] overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3 p-3">
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[15px] font-semibold text-gray-900 hover:underline cursor-pointer">
              {displayName}
            </p>
            <svg className="h-4 w-4 text-[#1877f2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z" />
            </svg>
          </div>
          <div className="flex items-center gap-1 text-[13px] text-gray-500">
            <span>Agora</span>
            <span>·</span>
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM5 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            </svg>
          </div>
        </div>
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-3 pb-3">
          <p className="text-[15px] text-gray-900 whitespace-pre-wrap">
            {renderCaptionWithHashtags(showFullCaption ? formattedCaption : truncatedCaption)}
            {needsTruncation && !showFullCaption && (
              <button
                onClick={() => setShowFullCaption(true)}
                className="text-gray-500 hover:underline ml-1"
              >
                ...Ver mais
              </button>
            )}
          </p>
          {showFullCaption && needsTruncation && (
            <button
              onClick={() => setShowFullCaption(false)}
              className="text-gray-500 hover:underline text-sm mt-1"
            >
              Ver menos
            </button>
          )}
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square w-full bg-gray-100">
        <Image src={imageUrl} alt="Post preview" fill className="object-cover" />
      </div>

      {/* Reactions Count */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-xs">👍</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f33e58] text-xs">❤️</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f7b125] text-xs">😆</span>
          </div>
          <span className="text-[15px] text-gray-500 ml-1">
            {reaction ? "Voce e outras 1.234 pessoas" : "1.234"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[15px] text-gray-500">
          <span className="hover:underline cursor-pointer">48 comentarios</span>
          <span className="hover:underline cursor-pointer">12 compartilhamentos</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around px-2 py-1 border-b border-gray-200">
        <button
          onClick={() => setReaction(reaction === "like" ? null : "like")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[15px] font-semibold transition-colors hover:bg-gray-100 ${
            reaction ? "text-[#1877f2]" : "text-gray-600"
          }`}
        >
          {reaction ? (
            <span className="text-lg">{reactions.find(r => r.name === reaction)?.emoji || "👍"}</span>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          )}
          <span>Curtir</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[15px] font-semibold text-gray-600 transition-colors hover:bg-gray-100">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Comentar</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[15px] font-semibold text-gray-600 transition-colors hover:bg-gray-100">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Compartilhar</span>
        </button>
      </div>

      {/* Comment Input */}
      <div className="flex items-center gap-2 p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
          V
        </div>
        <div className="flex-1 rounded-full bg-gray-100 px-3 py-2">
          <span className="text-[15px] text-gray-500">Escreva um comentario...</span>
        </div>
      </div>
    </div>
  );

  // Render Stories View
  const renderStoriesView = () => (
    <div className="mx-auto max-w-[280px]">
      {/* Phone Frame */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl">
        {/* Status Bar */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-2 bg-gradient-to-b from-black/50 to-transparent">
          <span className="text-xs font-medium text-white">9:41</span>
          <div className="flex items-center gap-1">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1877f2] p-0.5">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} width={32} height={32} className="rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-white drop-shadow-lg">{displayName}</span>
              <p className="text-xs text-gray-200">1h</p>
            </div>
            <button className="text-white">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
            <button className="text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Caption Overlay */}
          {caption && (
            <div className="absolute bottom-24 left-4 right-4">
              <p className="line-clamp-3 rounded-lg bg-black/40 p-3 text-sm text-white backdrop-blur-sm">
                {caption.length > 100 ? caption.substring(0, 100) + "..." : caption}
              </p>
            </div>
          )}

          {/* Reply Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
            <div className="flex-1 rounded-full border border-white/50 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="text-sm text-white/70">Responder...</span>
            </div>
            <button className="text-white">
              <span className="text-2xl">👍</span>
            </button>
            <button className="text-white">
              <span className="text-2xl">❤️</span>
            </button>
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          )},
          { value: "stories" as ViewType, label: "Stories", icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          )},
        ].map((view) => (
          <button
            key={view.value}
            onClick={() => handleViewChange(view.value)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              viewType === view.value
                ? "bg-[#1877f2] text-white"
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
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Este e um preview aproximado do Facebook. A aparencia real pode variar.
        </p>
      </div>
    </div>
  );
}
