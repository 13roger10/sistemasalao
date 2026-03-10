"use client";

import { createContext, useContext, useState, ReactNode, HTMLAttributes } from "react";

// Context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

// Tabs Root
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = "",
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || "");

  const activeTab = value !== undefined ? value : internalValue;
  const setActiveTab = (tab: string) => {
    if (value === undefined) {
      setInternalValue(tab);
    }
    onValueChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Tabs List
interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "pills" | "underline";
}

export function TabsList({
  variant = "default",
  className = "",
  children,
  ...props
}: TabsListProps) {
  const variantStyles = {
    default:
      "inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400",
    pills: "inline-flex gap-2",
    underline:
      "inline-flex border-b border-gray-200 dark:border-gray-700 -mb-px",
  };

  return (
    <div
      role="tablist"
      className={`${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Tabs Trigger
interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
  variant?: "default" | "pills" | "underline";
}

export function TabsTrigger({
  value,
  disabled = false,
  variant = "default",
  className = "",
  children,
  ...props
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  const variantStyles = {
    default: `
      inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5
      text-sm font-medium ring-offset-white transition-all
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2
      disabled:pointer-events-none disabled:opacity-50
      ${
        isActive
          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      }
    `,
    pills: `
      inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2
      text-sm font-medium transition-all
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
      disabled:pointer-events-none disabled:opacity-50
      ${
        isActive
          ? "bg-violet-500 text-white shadow-sm"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
      }
    `,
    underline: `
      inline-flex items-center justify-center whitespace-nowrap px-4 py-2
      text-sm font-medium transition-all border-b-2 -mb-px
      focus-visible:outline-none
      disabled:pointer-events-none disabled:opacity-50
      ${
        isActive
          ? "border-violet-500 text-violet-600 dark:text-violet-400"
          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
      }
    `,
  };

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={`${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Tabs Content
interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

export function TabsContent({
  value,
  forceMount = false,
  className = "",
  children,
  ...props
}: TabsContentProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      hidden={!isActive}
      className={`
        mt-2 ring-offset-white
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2
        ${isActive ? "animate-in fade-in-0 zoom-in-95" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

// Simple Tab component for basic use cases
interface SimpleTabsProps {
  tabs: {
    id: string;
    label: string;
    content: ReactNode;
    icon?: ReactNode;
    badge?: string | number;
    disabled?: boolean;
  }[];
  defaultTab?: string;
  variant?: "default" | "pills" | "underline";
  className?: string;
}

export function SimpleTabs({
  tabs,
  defaultTab,
  variant = "default",
  className = "",
}: SimpleTabsProps) {
  const defaultValue = defaultTab || tabs[0]?.id;

  return (
    <Tabs defaultValue={defaultValue} className={className}>
      <TabsList variant={variant}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            variant={variant}
            disabled={tab.disabled}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ml-2 rounded-full bg-gray-200 dark:bg-gray-600 px-2 py-0.5 text-xs font-medium">
                {tab.badge}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
