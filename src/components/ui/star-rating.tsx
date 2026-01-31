import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;           // 0-5
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StarRating({ value, onChange, readonly = true, size = 'sm', className }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  const handleClick = (star: number) => {
    if (readonly || !onChange) return;
    // Toggle off if clicking the same star, otherwise set to that star
    onChange(star === value ? 0 : star);
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => handleClick(star)}
          className={cn(
            "transition-all",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= value 
                ? "fill-amber-400 text-amber-400" 
                : "fill-transparent text-gray-300 dark:text-gray-600"
            )}
          />
        </button>
      ))}
    </div>
  );
}
