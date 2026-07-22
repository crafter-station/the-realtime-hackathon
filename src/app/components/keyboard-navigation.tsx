"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useEffect } from "react";

const slideSelector = "#main-content > section";

function moveBetweenSlides(direction: -1 | 1) {
  const slides = Array.from(
    document.querySelectorAll<HTMLElement>(slideSelector),
  );
  if (slides.length === 0) return;

  const viewportAnchor = window.innerHeight / 2;
  let currentIndex = slides.findIndex((slide) => {
    const bounds = slide.getBoundingClientRect();
    return bounds.top <= viewportAnchor && bounds.bottom > viewportAnchor;
  });

  if (currentIndex === -1) {
    currentIndex = slides.reduce((closestIndex, slide, index) => {
      const closestDistance = Math.abs(
        slides[closestIndex].getBoundingClientRect().top,
      );
      const distance = Math.abs(slide.getBoundingClientRect().top);
      return distance < closestDistance ? index : closestIndex;
    }, 0);
  }

  const nextIndex = Math.max(
    0,
    Math.min(slides.length - 1, currentIndex + direction),
  );
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  const targetTop =
    window.scrollY + slides[nextIndex].getBoundingClientRect().top;
  window.scrollTo({ top: targetTop, behavior });
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest(
      'a, button, input, select, textarea, summary, [contenteditable="true"], [role="button"]',
    ) !== null
  );
}

export function KeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      const direction =
        event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowDown" ||
              event.key === "ArrowRight" ||
              event.key === " "
            ? 1
            : 0;

      if (direction === 0) return;
      event.preventDefault();
      moveBetweenSlides(direction);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <nav className="keyboard-navigation" aria-label="Section navigation">
      <button
        type="button"
        aria-label="Previous section"
        aria-keyshortcuts="ArrowUp ArrowLeft"
        onClick={() => moveBetweenSlides(-1)}
      >
        <ArrowUpIcon aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Next section"
        aria-keyshortcuts="ArrowDown ArrowRight Space"
        onClick={() => moveBetweenSlides(1)}
      >
        <ArrowDownIcon aria-hidden="true" />
      </button>
    </nav>
  );
}
