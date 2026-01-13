import { forwardRef, useEffect, useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultCountry?: string;
  className?: string;
}

export const PhoneInputField = forwardRef<HTMLInputElement, PhoneInputFieldProps>(
  ({ value, onChange, placeholder = "Phone number", defaultCountry = "NP", className }, ref) => {
    // Use key to force re-render when defaultCountry changes
    const [key, setKey] = useState(defaultCountry);
    
    useEffect(() => {
      setKey(defaultCountry);
    }, [defaultCountry]);

    return (
      <div className={cn("phone-input-wrapper", className)}>
        <PhoneInput
          key={key}
          international={false}
          withCountryCallingCode={false}
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
