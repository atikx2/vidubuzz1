"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Pagination() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const pageNumbers = [1, 2, 3, 5, 15, 20];

  const jump = () => {
    const requestedPage = Number.parseInt(inputValue, 10);
    if (Number.isFinite(requestedPage)) {
      setPage(Math.min(20, Math.max(1, requestedPage)));
      setInputValue("");
    }
  };

  return (
    <div className="pagination-wrap">
      <div className="pagination-note">
        <span className="pagination-pulse" /> Page {page} <span className="pagination-note-muted">of 20</span>
      </div>
      <nav className="pagination" aria-label="Video pages">
        <Button
          variant="outline"
          size="icon"
          className="pagination-arrow"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="page-number-list">
          {pageNumbers.map((number, index) => (
            <span className="page-number-group" key={number}>
              {index >= 3 && <span className="page-ellipsis">···</span>}
              <button
                type="button"
                className={`page-number ${page === number ? "page-number-active" : ""}`}
                aria-current={page === number ? "page" : undefined}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            </span>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="pagination-arrow"
          onClick={() => setPage(Math.min(20, page + 1))}
          disabled={page === 20}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </Button>
        <span className="pagination-divider" />
        <label className="page-jump-label" htmlFor="page-jump">Go to</label>
        <Input
          id="page-jump"
          type="number"
          min={1}
          max={20}
          inputMode="numeric"
          placeholder="#"
          className="page-jump-input"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") jump();
          }}
          aria-label="Enter page number"
        />
        <Button variant="secondary" size="sm" onClick={jump} className="page-jump-button">Go</Button>
      </nav>
    </div>
  );
}
