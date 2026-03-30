"use client";

import { motion, AnimatePresence } from "framer-motion";

const SHORTCUTS = [
  { key: "j", action: "Next tweet" },
  { key: "k", action: "Previous tweet" },
  { key: "o", action: "Open tweet" },
  { key: "/", action: "Focus search" },
  { key: "t", action: "Scroll to top" },
  { key: "?", action: "Toggle this help" },
  { key: "Esc", action: "Close / deselect" },
];

interface KeyboardHelpProps {
  show: boolean;
  onClose: () => void;
}

export function KeyboardHelp({ show, onClose }: KeyboardHelpProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-80 rounded-2xl border border-border bg-bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-text-primary">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-text-secondary">
                    {s.action}
                  </span>
                  <kbd className="rounded-md border border-border bg-bg-secondary px-2 py-0.5 font-mono text-xs text-text-primary">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-lg border border-border py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
