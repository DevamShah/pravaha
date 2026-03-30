"use client";

export function TweetSkeleton() {
  return (
    <div className="animate-pulse border-b border-border px-4 py-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-bg-secondary" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-4 w-24 rounded bg-bg-secondary" />
            <div className="h-4 w-16 rounded bg-bg-secondary" />
            <div className="h-4 w-8 rounded bg-bg-secondary" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-bg-secondary" />
            <div className="h-4 w-4/5 rounded bg-bg-secondary" />
          </div>
          <div className="flex gap-8">
            <div className="h-4 w-10 rounded bg-bg-secondary" />
            <div className="h-4 w-10 rounded bg-bg-secondary" />
            <div className="h-4 w-10 rounded bg-bg-secondary" />
            <div className="h-4 w-10 rounded bg-bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse border-b border-border pb-6">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-full bg-bg-secondary sm:h-20 sm:w-20" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-40 rounded bg-bg-secondary" />
          <div className="h-4 w-24 rounded bg-bg-secondary" />
          <div className="h-4 w-64 rounded bg-bg-secondary" />
          <div className="flex gap-4">
            <div className="h-4 w-20 rounded bg-bg-secondary" />
            <div className="h-4 w-20 rounded bg-bg-secondary" />
            <div className="h-4 w-20 rounded bg-bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div>
      <ProfileSkeleton />
      {Array.from({ length: 5 }).map((_, i) => (
        <TweetSkeleton key={i} />
      ))}
    </div>
  );
}
