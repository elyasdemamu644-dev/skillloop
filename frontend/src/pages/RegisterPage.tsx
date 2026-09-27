import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { registerFormSchema, type RegisterFormValues } from "@/utils/authValidation";
import FormField from "@/components/ui/FormField";
import { getApiErrorMessage } from "@/utils/apiError";
import Button from "@/components/ui/Button";
import { LOOP_IMAGE } from "@/utils/images";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      await registerUser(values);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-12 px-4 py-12 lg:grid-cols-2 lg:items-center">
      <div className="mx-auto w-full max-w-md">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Join the loop
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-2 text-sm text-slate-500">
          Everyone knows something. Everyone can learn something. Start yours.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="First name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register("firstName")}
            />
            <FormField
              label="Last name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register("lastName")}
            />
          </div>
          <FormField
            label="Username"
            autoComplete="username"
            error={errors.username?.message}
            {...register("username")}
          />
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <FormField
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-8 text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </p>
      </div>

      <div className="relative hidden overflow-hidden rounded-3xl shadow-lift lg:block">
        <img src={LOOP_IMAGE} alt="People collaborating" className="h-[560px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <p className="font-display text-2xl font-bold text-white">
            Learn it today, teach it tomorrow.
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Every skill you master adds one more offering to the catalog —
            that's how the loop pays you back.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-200">
            <li>· Free to join, no credit card needed</li>
            <li>· Real mentors for real sessions</li>
            <li>· Earn credits as you teach</li>
          </ul>
        </div>
      </div>
    </div>
  );
}