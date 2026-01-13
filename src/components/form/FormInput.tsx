import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email" | "time";
  multiline?: boolean;
  maxLength?: number;
  className?: string;
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
  multiline = false,
  maxLength,
  className,
}: FormInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="min-h-24 text-base"
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="h-12 text-base"
        />
      )}
      {maxLength && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
