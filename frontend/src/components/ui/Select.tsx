"use client";

import { forwardRef, SelectHTMLAttributes, useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      value,
      onChange,
      placeholder = "Selecione...",
      searchable = false,
      clearable = false,
      className = "",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = searchable
      ? options.filter((opt) =>
          opt.label.toLowerCase().includes(search.toLowerCase())
        )
      : options;

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearch("");
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearch("");
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
    };

    return (
      <div className="w-full" ref={containerRef}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        {/* Hidden native select for form compatibility */}
        <select
          ref={ref}
          id={inputId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom select */}
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              w-full flex items-center justify-between
              rounded-lg border bg-white dark:bg-gray-700 px-4 py-2.5
              text-left text-gray-900 dark:text-white
              transition-all duration-200
              focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20
              disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500
              ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600"}
              ${isOpen ? "border-violet-500 ring-2 ring-violet-500/20" : ""}
              ${className}
            `}
          >
            <span className={selectedOption ? "" : "text-gray-400 dark:text-gray-500"}>
              {selectedOption ? (
                <span className="flex items-center gap-2">
                  {selectedOption.icon}
                  {selectedOption.label}
                </span>
              ) : (
                placeholder
              )}
            </span>

            <span className="flex items-center gap-1">
              {clearable && value && (
                <span
                  role="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </span>
              )}
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg animate-in fade-in-0 zoom-in-95">
              {searchable && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    autoFocus
                  />
                </div>
              )}

              <ul className="max-h-60 overflow-auto py-1">
                {filteredOptions.length === 0 ? (
                  <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma opção encontrada
                  </li>
                ) : (
                  filteredOptions.map((option) => (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => !option.disabled && handleSelect(option.value)}
                        disabled={option.disabled}
                        className={`
                          w-full flex items-center justify-between px-4 py-2 text-left text-sm
                          ${
                            option.value === value
                              ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }
                          ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                      >
                        <span className="flex items-center gap-2">
                          {option.icon}
                          <span>
                            {option.label}
                            {option.description && (
                              <span className="block text-xs text-gray-400 dark:text-gray-500">
                                {option.description}
                              </span>
                            )}
                          </span>
                        </span>
                        {option.value === value && (
                          <Check className="h-4 w-4 text-violet-500" />
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        {hint && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

// Multi Select Component
interface MultiSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  maxItems?: number;
}

export function MultiSelect({
  label,
  error,
  hint,
  options,
  value = [],
  onChange,
  placeholder = "Selecione...",
  searchable = false,
  disabled = false,
  maxItems,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else if (!maxItems || value.length < maxItems) {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full min-h-[42px] flex flex-wrap items-center gap-1.5
            rounded-lg border bg-white dark:bg-gray-700 px-3 py-2
            text-left text-gray-900 dark:text-white
            transition-all duration-200
            focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20
            disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800
            ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600"}
            ${isOpen ? "border-violet-500 ring-2 ring-violet-500/20" : ""}
          `}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 text-sm"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => handleRemove(opt.value, e)}
                  className="hover:text-violet-900 dark:hover:text-violet-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
          <ChevronDown
            className={`ml-auto h-5 w-5 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  autoFocus
                />
              </div>
            )}

            <ul className="max-h-60 overflow-auto py-1">
              {filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                const isDisabled = Boolean(
                  option.disabled ||
                  (!isSelected && maxItems && value.length >= maxItems)
                );

                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => !isDisabled && handleToggle(option.value)}
                      disabled={isDisabled}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-left text-sm
                        ${isSelected ? "bg-violet-50 dark:bg-violet-900/20" : ""}
                        ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-700"}
                      `}
                    >
                      <span
                        className={`
                          h-4 w-4 rounded border flex items-center justify-center
                          ${
                            isSelected
                              ? "bg-violet-500 border-violet-500"
                              : "border-gray-300 dark:border-gray-600"
                          }
                        `}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="text-gray-700 dark:text-gray-200">
                        {option.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {hint && !error && (
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}
