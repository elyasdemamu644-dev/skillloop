import { forwardRef, type InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, id, ...inputProps },
  ref
) {
  const fieldId = id ?? inputProps.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className={`rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-brand-500/40 ${
          error ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-brand-500"
        }`}
        aria-invalid={Boolean(error)}
        {...inputProps}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
});

FormField.displayName = "FormField";

export default FormField;
