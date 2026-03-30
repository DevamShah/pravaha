"use client";

import { motion } from "framer-motion";
import type { UserData } from "@/lib/api";
import { formatCount } from "@/lib/utils";

interface ProfileHeaderProps {
  user: UserData;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-b border-border pb-6"
    >
      {/* Banner */}
      {user.bannerUrl && (
        <div className="-mx-4 -mt-6 mb-4 h-36 overflow-hidden bg-bg-secondary sm:h-48">
          <img
            src={user.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className={`h-16 w-16 rounded-full border-2 border-bg-primary bg-bg-secondary object-cover sm:h-20 sm:w-20 ${
              user.bannerUrl ? "-mt-10 sm:-mt-12" : ""
            }`}
          />
        ) : (
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle text-2xl font-bold text-accent sm:h-20 sm:w-20 ${
              user.bannerUrl ? "-mt-10 sm:-mt-12" : ""
            }`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold text-text-primary">
              {user.name}
            </h1>
            {user.verified && (
              <svg className="h-5 w-5 shrink-0 text-accent" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-text-muted">@{user.handle}</p>

          {user.bio && (
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {user.bio}
            </p>
          )}

          {/* Stats */}
          <div className="mt-3 flex gap-4">
            <Stat label="Following" value={user.followingCount} />
            <Stat label="Followers" value={user.followersCount} />
            <Stat label="Tweets" value={user.tweetCount} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-sm font-semibold text-text-primary">
        {formatCount(value)}
      </span>
      <span className="text-sm text-text-muted">{label}</span>
    </div>
  );
}
