"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { siteContent } from "@/lib/site-content";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function pageItemsFor(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 8) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 5) return [1, 2, 3, 4, 5, "ellipsis-start", totalPages - 5, "ellipsis-end", totalPages];
  if (page >= totalPages - 4) {
    return [1, "ellipsis-start", ...Array.from({ length: 6 }, (_, index) => totalPages - 5 + index)];
  }
  return [1, "ellipsis-start", page - 1, page, page + 1, "ellipsis-end", totalPages];
}

export function Pagination({ totalPages = 20 }: { totalPages?: number }) {
  const [page, setPage] = useState(1);
  const items = pageItemsFor(page, totalPages);

  return (
    <div className="pagination-wrap">
      <button
        type="button"
        className="pagination-next"
        disabled={page >= totalPages}
        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
      >
        {siteContent.paginationNextLabel}<ChevronRight size={17} />
      </button>
      <nav className="pagination-pages" aria-label={siteContent.paginationAriaLabel}>
        {items.map((item, index) => (
          typeof item === "number" ? (
            <button
              type="button"
              key={`page-${item}`}
              className={`pagination-page ${item === page ? "pagination-page-active" : ""}`}
              aria-current={item === page ? "page" : undefined}
              aria-label={`${siteContent.paginationPageLabel} ${item}`}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ) : (
            <span className="pagination-ellipsis" key={`${item}-${index}`} aria-hidden="true">…</span>
          )
        ))}
      </nav>
    </div>
  );
}
