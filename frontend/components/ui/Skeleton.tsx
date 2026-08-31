interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-shimmer rounded-lg ${className}`} />
  );
}
