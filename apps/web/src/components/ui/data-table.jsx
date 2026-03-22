import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";
import { Button } from "@components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@components/ui/skeleton";

export function DataTable({ columns, data, rowKey = "id", loading, pagination }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm glass-card">
        <Table>
          <TableHeader className="bg-surface-dim/50">
            <TableRow className="border-b border-line hover:bg-transparent">
              {columns.map((col, index) => (
                <TableHead key={col.key || index} className="font-bold text-label-secondary py-4 px-4">
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pagination?.pageSize || 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="border-b border-line/50">
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex} className="p-4">
                      <Skeleton className="h-6 w-full rounded-md" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length > 0 ? (
              data.map((row, rowIndex) => (
                <TableRow
                  key={row[rowKey] || rowIndex}
                  className="hover:bg-surface-dim/50 transition-colors border-b border-line/50"
                >
                  {columns.map((col, colIndex) => (
                    <TableCell key={col.key || colIndex} className="py-3 px-4 text-label align-middle">
                      {col.render ? col.render(row[col.dataIndex], row, rowIndex) : row[col.dataIndex]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-label-secondary">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-end space-x-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onChange(pagination.current - 1)}
            disabled={pagination.current === 1}
            className="rounded-xl border-line font-medium text-label hover:bg-surface-alt"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="text-sm font-bold text-label-secondary px-2">
            Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onChange(pagination.current + 1)}
            disabled={pagination.current === Math.ceil(pagination.total / pagination.pageSize)}
            className="rounded-xl border-line font-medium text-label hover:bg-surface-alt"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
