"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Keyboard navigation for tweet feeds.
 * j/k — navigate between tweets
 * o/Enter — open selected tweet
 * / — focus search
 * ? — show shortcuts help
 * t — scroll to top
 */
export function useKeyboardNav(tweetCount: number) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);

  const scrollToTweet = useCallback((index: number) => {
    const tweets = document.querySelectorAll("[data-tweet-index]");
    if (tweets[index]) {
      tweets[index].scrollIntoView({ behavior: "smooth", block: "center" });
      (tweets[index] as HTMLElement).focus();
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't interfere with input fields
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "j": {
          e.preventDefault();
          const next = Math.min(selectedIndex + 1, tweetCount - 1);
          setSelectedIndex(next);
          scrollToTweet(next);
          break;
        }
        case "k": {
          e.preventDefault();
          const prev = Math.max(selectedIndex - 1, 0);
          setSelectedIndex(prev);
          scrollToTweet(prev);
          break;
        }
        case "o":
        case "Enter": {
          if (selectedIndex >= 0) {
            const tweets = document.querySelectorAll("[data-tweet-index]");
            const link = tweets[selectedIndex]?.querySelector("a[href*='/status/']") as HTMLAnchorElement;
            if (link) link.click();
          }
          break;
        }
        case "/": {
          e.preventDefault();
          const searchInput = document.querySelector("header input") as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;
        }
        case "?": {
          e.preventDefault();
          setShowHelp((s) => !s);
          break;
        }
        case "t": {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          setSelectedIndex(-1);
          break;
        }
        case "Escape": {
          setShowHelp(false);
          setSelectedIndex(-1);
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, tweetCount, scrollToTweet]);

  return { selectedIndex, showHelp, setShowHelp };
}
