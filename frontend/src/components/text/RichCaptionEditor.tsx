"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { EmojiPicker } from "./EmojiPicker";
import type { PlatformLimits } from "@/types";
import { PLATFORM_LIMITS } from "@/types";

interface RichCaptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  platform: "instagram" | "facebook" | "both";
  placeholder?: string;
  maxLength?: number;
  onGenerateWithAI?: () => void;
}

export function RichCaptionEditor({
  value,
  onChange,
  platform,
  placeholder = "Escreva uma legenda para seu post...",
  maxLength,
  onGenerateWithAI,
}: RichCaptionEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [_cursorPosition, setCursorPosition] = useState(0);
  const [bulletModeActive, setBulletModeActive] = useState(false);
  const [pendingBulletInsert, setPendingBulletInsert] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const limits: PlatformLimits =
    platform === "both"
      ? PLATFORM_LIMITS.instagram
      : PLATFORM_LIMITS[platform];

  const effectiveMaxLength = maxLength || limits.maxCaptionLength;

  // Character count stats
  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const lineCount = value.split("\n").length;

  // Character limit status
  const isNearLimit = charCount > effectiveMaxLength * 0.9;
  const isAtLimit = charCount >= effectiveMaxLength;

  // Close emoji picker on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Insert emoji at cursor position
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + emoji + value.substring(end);

      onChange(newValue);

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    },
    [value, onChange]
  );

  // Handle textarea change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (newValue.length <= effectiveMaxLength) {
        onChange(newValue);
      }
    },
    [onChange, effectiveMaxLength]
  );

  // Track cursor position
  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      setCursorPosition(textarea.selectionStart);
    }
  }, []);

  // Insert text at cursor position
  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // If textarea is not focused, insert at the end
      const isFocused = document.activeElement === textarea;
      const start = isFocused ? textarea.selectionStart : value.length;
      const end = isFocused ? textarea.selectionEnd : value.length;
      const newValue = value.substring(0, start) + text + value.substring(end);

      if (newValue.length <= effectiveMaxLength) {
        onChange(newValue);
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + text.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    },
    [value, onChange, effectiveMaxLength]
  );

  // Format helpers
  const insertLineBreak = useCallback(() => {
    insertAtCursor("\n\n");
  }, [insertAtCursor]);

  // Toggle bullet point mode
  const toggleBulletMode = useCallback(() => {
    if (!bulletModeActive) {
      // Activating: set flag to insert bullet on next effect
      setPendingBulletInsert(true);
    }
    setBulletModeActive((prev) => !prev);
  }, [bulletModeActive]);

  // Effect to insert bullet point when mode is activated
  useEffect(() => {
    if (pendingBulletInsert && bulletModeActive) {
      setPendingBulletInsert(false);

      const textarea = textareaRef.current;
      if (!textarea) return;

      const isFocused = document.activeElement === textarea;
      const start = isFocused ? textarea.selectionStart : value.length;
      const end = isFocused ? textarea.selectionEnd : value.length;
      const newValue = value.substring(0, start) + "\n• " + value.substring(end);

      if (newValue.length <= effectiveMaxLength) {
        onChange(newValue);
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + 3;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    }
  }, [pendingBulletInsert, bulletModeActive, value, onChange, effectiveMaxLength]);

  // Handle keydown for bullet point continuation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && bulletModeActive) {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentLine = value.substring(0, start).split("\n").pop() || "";

        // Check if current line is empty bullet (just "• ")
        if (currentLine.trim() === "•") {
          // Remove empty bullet and deactivate bullet mode
          const lineStart = start - currentLine.length;
          const newValue = value.substring(0, lineStart) + value.substring(end);
          onChange(newValue);
          setBulletModeActive(false);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
        } else {
          // Add new bullet point
          const newValue = value.substring(0, start) + "\n• " + value.substring(end);
          onChange(newValue);
          setTimeout(() => {
            textarea.focus();
            const newPos = start + 3; // "\n• " = 3 characters
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
        }
      }
    },
    [bulletModeActive, value, onChange]
  );

  // Quick text inserts
  const quickInserts = [
    { label: "📍", text: "\n\n📍 Localização: ", title: "Localização" },
    { label: "🔗", text: "\n\n🔗 Link na bio", title: "Link na bio" },
    { label: "📱", text: "\n\n📱 Agende pelo WhatsApp", title: "WhatsApp" },
    { label: "📞", text: "\n\n📞 Contato: ", title: "Contato" },
    { label: "⏰", text: "\n\n⏰ Horário: ", title: "Horário" },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Emoji Button */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`rounded-lg p-2 transition-colors ${
                showEmojiPicker
                  ? "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Inserir emoji"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-full z-50 mt-1">
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Line Break Button */}
          <button
            type="button"
            onClick={insertLineBreak}
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
            title="Inserir quebra de linha"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a4 4 0 014 4v2m0 0l-3-3m3 3l-3 3"
              />
            </svg>
          </button>

          {/* Bullet Point Button */}
          <button
            type="button"
            onClick={toggleBulletMode}
            className={`rounded-lg p-2 transition-colors ${
              bulletModeActive
                ? "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            title={bulletModeActive ? "Desativar bullet points" : "Ativar bullet points"}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>

          <div className="mx-2 h-6 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Quick Inserts */}
          {quickInserts.map((insert) => (
            <button
              key={insert.label}
              type="button"
              onClick={() => insertAtCursor(insert.text)}
              className="rounded-lg px-2 py-1 text-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              title={insert.title}
            >
              {insert.label}
            </button>
          ))}
        </div>

        {/* AI Generate Button */}
        {onGenerateWithAI && (
          <button
            type="button"
            onClick={onGenerateWithAI}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Gerar com IA
          </button>
        )}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`min-h-[180px] w-full resize-none rounded-xl border p-4 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 ${
            isAtLimit
              ? "border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20"
              : isNearLimit
              ? "border-yellow-300 dark:border-yellow-600 focus:border-yellow-500 focus:ring-yellow-500/20"
              : "border-gray-200 dark:border-gray-600 focus:border-violet-500 focus:ring-violet-500/20"
          }`}
          maxLength={effectiveMaxLength}
        />

        {/* Character Count Badge */}
        <div
          className={`absolute bottom-3 right-3 rounded-full px-2 py-0.5 text-xs font-medium ${
            isAtLimit
              ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400"
              : isNearLimit
              ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {charCount}/{effectiveMaxLength}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>{wordCount} palavras</span>
          <span>{lineCount} linhas</span>
        </div>
        <div className="flex items-center gap-2">
          {platform !== "both" && (
            <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
              {platform === "instagram" ? "Instagram" : "Facebook"}
            </span>
          )}
          {platform === "both" && (
            <>
              <span className="rounded-full bg-pink-100 dark:bg-pink-900/50 px-2 py-0.5 text-pink-700 dark:text-pink-400">
                Instagram
              </span>
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-blue-700 dark:text-blue-400">
                Facebook
              </span>
            </>
          )}
        </div>
      </div>

      {/* Platform specific tips */}
      {isNearLimit && (
        <div className={`rounded-lg p-3 ${isAtLimit ? "bg-red-50 dark:bg-red-900/20" : "bg-yellow-50 dark:bg-yellow-900/20"}`}>
          <div className="flex items-start gap-2">
            <svg
              className={`h-4 w-4 mt-0.5 ${isAtLimit ? "text-red-500 dark:text-red-400" : "text-yellow-500 dark:text-yellow-400"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className={`text-sm ${isAtLimit ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}>
              {isAtLimit
                ? "Limite de caracteres atingido. Remova texto para continuar."
                : `Aproximando-se do limite de ${effectiveMaxLength} caracteres.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
