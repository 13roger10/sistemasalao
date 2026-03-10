"use client";

import { ReactNode, useState, createContext, useContext } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "./Button";

// Context para fechar o menu de ações
const ActionMenuContext = createContext<(() => void) | null>(null);

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  // Sorting
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
  // Pagination
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
  // Selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  // Row actions
  rowActions?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  // Styling
  className?: string;
  compact?: boolean;
  striped?: boolean;
  bordered?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyMessage = "Nenhum item encontrado",
  emptyAction,
  sortBy,
  sortOrder,
  onSort,
  pagination,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  rowActions,
  onRowClick,
  className = "",
  compact = false,
  striped = false,
  bordered = false,
}: DataTableProps<T>) {
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  const allSelected = data.length > 0 && data.every((item) => selectedIds.includes(keyExtractor(item)));
  const someSelected = data.some((item) => selectedIds.includes(keyExtractor(item)));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map(keyExtractor));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  const handleSort = (key: string) => {
    if (!onSort) return;

    if (sortBy === key) {
      onSort(key, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSort(key, "asc");
    }
  };

  const cellPadding = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className={`w-full ${className}`}>
      {/* Table Container */}
      <div className={`overflow-x-auto rounded-lg ${bordered ? "border border-gray-200 dark:border-gray-700" : ""}`}>
        <table className="w-full text-left">
          {/* Header */}
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm">
            <tr>
              {/* Selection checkbox */}
              {selectable && (
                <th className={`${cellPadding} w-12`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                  />
                </th>
              )}

              {/* Column headers */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${cellPadding}
                    font-semibold
                    ${column.width ? `w-[${column.width}]` : ""}
                    ${column.align === "center" ? "text-center" : ""}
                    ${column.align === "right" ? "text-right" : ""}
                    ${column.sortable ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none" : ""}
                  `}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={`flex items-center gap-2 ${column.align === "right" ? "justify-end" : ""}`}>
                    {column.header}
                    {column.sortable && (
                      <span className="flex flex-col">
                        <ChevronUp
                          className={`h-3 w-3 -mb-1 ${
                            sortBy === column.key && sortOrder === "asc"
                              ? "text-violet-500"
                              : "text-gray-400"
                          }`}
                        />
                        <ChevronDown
                          className={`h-3 w-3 ${
                            sortBy === column.key && sortOrder === "desc"
                              ? "text-violet-500"
                              : "text-gray-400"
                          }`}
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}

              {/* Actions column */}
              {rowActions && <th className={`${cellPadding} w-12`}></th>}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  {selectable && (
                    <td className={cellPadding}>
                      <div className="h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className={cellPadding}>
                      <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}
                  {rowActions && (
                    <td className={cellPadding}>
                      <div className="h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="py-12 text-center"
                >
                  <p className="text-gray-500 dark:text-gray-400 mb-4">{emptyMessage}</p>
                  {emptyAction && (
                    <Button variant="outline" onClick={emptyAction.onClick}>
                      {emptyAction.label}
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((item, index) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      bg-white dark:bg-gray-900
                      ${striped && index % 2 === 1 ? "bg-gray-50 dark:bg-gray-800/50" : ""}
                      ${onRowClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : ""}
                      ${isSelected ? "bg-violet-50 dark:bg-violet-900/20" : ""}
                    `}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                          className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`
                          ${cellPadding}
                          text-gray-900 dark:text-white
                          ${column.align === "center" ? "text-center" : ""}
                          ${column.align === "right" ? "text-right" : ""}
                        `}
                      >
                        {column.render
                          ? column.render(item, index)
                          : (item as Record<string, unknown>)[column.key] as ReactNode}
                      </td>
                    ))}

                    {/* Actions */}
                    {rowActions && (
                      <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setOpenActionMenu(openActionMenu === id ? null : id)}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <MoreHorizontal className="h-5 w-5 text-gray-400" />
                          </button>
                          {openActionMenu === id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenActionMenu(null)}
                              />
                              <div className={`absolute right-0 z-50 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl ${
                                index < 1 ? "top-full mt-1" : "bottom-full mb-1"
                              }`}>
                                <ActionMenuContext.Provider value={() => setOpenActionMenu(null)}>
                                  {rowActions(item)}
                                </ActionMenuContext.Provider>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando{" "}
            <span className="font-medium">
              {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
            </span>{" "}
            a{" "}
            <span className="font-medium">
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
            </span>{" "}
            de <span className="font-medium">{pagination.totalItems}</span> resultados
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, index) => {
                let pageNumber: number;
                if (pagination.totalPages <= 5) {
                  pageNumber = index + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNumber = index + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNumber = pagination.totalPages - 4 + index;
                } else {
                  pageNumber = pagination.currentPage - 2 + index;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => pagination.onPageChange(pageNumber)}
                    className={`
                      h-8 w-8 rounded-lg text-sm font-medium
                      ${
                        pageNumber === pagination.currentPage
                          ? "bg-violet-500 text-white"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }
                    `}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Action Menu Item helper
interface ActionMenuItemProps {
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
  variant?: "default" | "danger";
}

export function ActionMenuItem({
  onClick,
  icon,
  children,
  variant = "default",
}: ActionMenuItemProps) {
  const closeMenu = useContext(ActionMenuContext);

  const handleClick = () => {
    closeMenu?.();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-full flex items-center gap-2 px-4 py-2 text-sm text-left
        ${
          variant === "danger"
            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
}
