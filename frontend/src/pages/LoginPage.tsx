import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loginFormSchema, type LoginFormValues } from "@/utils/authValidation";
import FormField from "@/components/ui/FormField";
import { getApiErrorMessage } from "@/utils/apiError";
import Button from "@/components/ui/Button";
import { AUTH_IMAGE } from "@/utils/images";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values);
      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-12 px-4 py-12 lg:grid-cols-2 lg:items-center">
      <div className="relative hidden overflow-hidden rounded-3xl shadow-lift lg:block">
        <img src={AUTH_IMAGE} alt="People learning together" className="h-[560px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <p className="font-display text-2xl font-bold text-white">
            "Everyone you will ever meet knows something you don't."
          </p>
          <p className="mt-2 text-sm text-slate-300">— Carl Sagan, favorite of the SkillLoop community</p>
          <div className="mt-6 flex gap-2">
            <span className="h-1.5 w-8 rounded-full bg-white/70" />
            <span className="h-1.5 w-8 rounded-full bg-brand-400/70" />
            <span className="h-1.5 w-8 rounded-full bg-accent-400/70" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Welcome back
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Log in to SkillLoop</h1>
        <p className="mt-2 text-sm text-slate-500">Pick up right where you left off.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
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
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
            Log in
          </Button>
        </form>

        <p className="mt-8 text-sm text-slate-500">
          New to SkillLoop?{" "}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}