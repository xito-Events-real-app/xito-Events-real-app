import { forwardRef } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { priorityCountries } from "@/lib/form-data";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultCountry?: string;
  className?: string;
}

export const PhoneInputField = forwardRef<HTMLInputElement, PhoneInputFieldProps>(
  ({ value, onChange, placeholder = "Phone number", defaultCountry = "NP", className }, ref) => {
    return (
      <div className={cn("phone-input-wrapper", className)}>
        <PhoneInput
          international
          defaultCountry={defaultCountry as any}
          value={value}
          onChange={(val) => onChange(val || "")}
          placeholder={placeholder}
          className="flex"
        />
      </div>
    );
  }
);

PhoneInputField.displayName = "PhoneInputField";
