'use client'

import { useState, useMemo, ReactNode } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, item: T) => ReactNode
  width?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  searchKey?: keyof T
  selectable?: boolean
  onSelectChange?: (selectedIds: Set<string>) => void
  selectedIds?: Set<string>
  itemsPerPage?: number
  getRowId?: (item: T) => string
  onRowAction?: (item: T, action: string) => void
  sortKey?: keyof T | null
  sortOrder?: 'asc' | 'desc' | null
  onSortChange?: (key: keyof T | null, order: 'asc' | 'desc' | null) => void
}

const DEFAULT_ITEMS_PER_PAGE = 20

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = '検索...',
  searchKey,
  selectable = false,
  onSelectChange,
  selectedIds = new Set(),
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  getRowId = (item: T) => String(item.id),
  sortKey: externalSortKey,
  sortOrder: externalSortOrder,
  onSortChange,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<keyof T | null>(externalSortKey ?? null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(externalSortOrder ?? null)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredAndSorted = useMemo(() => {
    let result = [...data]

    if (searchable && searchQuery && searchKey) {
      result = result.filter(item => {
        const value = String(item[searchKey]).toLowerCase()
        return value.includes(searchQuery.toLowerCase())
      })
    }

    if (sortKey && sortOrder) {
      result.sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const compare = aVal.localeCompare(bVal)
          return sortOrder === 'asc' ? compare : -compare
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
        }

        return 0
      })
    }

    return result
  }, [data, searchQuery, searchKey, sortKey, sortOrder])

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const toggleSort = (key: keyof T) => {
    let newSortKey: keyof T | null = key
    let newSortOrder: 'asc' | 'desc' | null = 'asc'

    if (sortKey === key) {
      if (sortOrder === 'asc') {
        newSortOrder = 'desc'
      } else if (sortOrder === 'desc') {
        newSortKey = null
        newSortOrder = null
      }
    }

    setSortKey(newSortKey)
    setSortOrder(newSortOrder)

    if (onSortChange) {
      onSortChange(newSortKey, newSortOrder)
    }
  }

  const toggleSelectAll = () => {
    if (onSelectChange) {
      if (selectedIds.size === paginatedData.length) {
        onSelectChange(new Set())
      } else {
        onSelectChange(new Set(paginatedData.map(item => getRowId(item))))
      }
    }
  }

  const toggleSelectItem = (id: string) => {
    if (onSelectChange) {
      const newSelected = new Set(selectedIds)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      onSelectChange(newSelected)
    }
  }

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57606a]" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-[#e2e6ec] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FD7601] focus:ring-offset-0"
          />
        </div>
      )}

      <div className="bg-white border border-[#e2e6ec] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f8fa] border-b border-[#e2e6ec]">
              {selectable && (
                <th className="w-12 px-4 py-1 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === paginatedData.length}
                    onChange={toggleSelectAll}
                    className="accent-[#FD7601] cursor-pointer"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider ${
                    column.width || ''
                  }`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => toggleSort(column.key)}
                      className="flex items-center gap-1.5 hover:text-gray-900"
                    >
                      {column.label}
                      {sortKey === column.key && sortOrder === 'asc' && (
                        <ChevronUp className="w-3 h-3 text-[#FD7601]" />
                      )}
                      {sortKey === column.key && sortOrder === 'desc' && (
                        <ChevronDown className="w-3 h-3 text-[#FD7601]" />
                      )}
                      {sortKey !== column.key && (
                        <ChevronsUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(item => {
              const rowId = getRowId(item)
              return (
                <tr
                  key={rowId}
                  className="bg-white hover:bg-[#f6f8fa] border-b border-[#e2e6ec] transition-colors"
                >
                  {selectable && (
                    <td className="w-12 px-4 py-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rowId)}
                        onChange={() => toggleSelectItem(rowId)}
                        className="accent-[#FD7601] cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td
                      key={String(column.key)}
                      className={`px-4 py-1 text-sm font-medium text-[#24292f] ${
                        column.width || ''
                      }`}
                    >
                      {column.render
                        ? column.render(item[column.key], item)
                        : String(item[column.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredAndSorted.length > itemsPerPage && (
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-[#57606a]">
            全 {filteredAndSorted.length} 件中 {(currentPage - 1) * itemsPerPage + 1} ～{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} 件を表示
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#57606a] border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3" />
              前へ
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 text-xs font-medium rounded-lg border transition-colors ${
                    currentPage === page
                      ? 'bg-[#FD7601] text-white border-[#FD7601]'
                      : 'border-[#e2e6ec] text-[#57606a] hover:bg-[#f6f8fa]'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#57606a] border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
