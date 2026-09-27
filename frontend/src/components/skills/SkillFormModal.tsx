import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { addMySkill, fetchSkills, updateMySkill } from "@/services/skill.api";
import type { Skill, SkillType, UserSkill } from "@/types/skill";
import { SKILL_LEVEL_LABELS, SKILL_TYPE_LABELS, userSkillFormSchema, type UserSkillFormValues } from "@/utils/skillValidation";

interface SkillFormModalProps {
  isOpen: boolean;
  skillToEdit: UserSkill | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

const LEVELS: Array<keyof typeof SKILL_LEVEL_LABELS> = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

function TypePicker({
  value,
  onChange,
}: {
  value: SkillType | undefined;
  onChange: (value: SkillType) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {(["TEACH", "LEARN", "BOTH"] as const).map((type) => {
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              active
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
            aria-pressed={active}
          >
            {SKILL_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

export default function SkillFormModal({
  isOpen,
  skillToEdit,
  onClose,
  onSaved,
  onError,
}: SkillFormModalProps) {
  const [skillQuery, setSkillQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => fetchSkills(),
    enabled: isOpen && !skillToEdit,
    staleTime: 5 * 60 * 1000,
  });

  const isEditing = Boolean(skillToEdit);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserSkillFormValues>({
    resolver: zodResolver(userSkillFormSchema),
    defaultValues: {
      skillId: "",
      type: "LEARN",
      level: "BEGINNER",
      yearsExperience: 0,
      description: "",
    },
  });

  // Re-populate the form every time the modal opens / target changes.
  useEffect(() => {
    if (!isOpen) return;
    reset(
      skillToEdit
        ? {
            skillId: skillToEdit.skill.id,
            type: skillToEdit.type,
            level: skillToEdit.level,
            yearsExperience: skillToEdit.yearsExperience,
            description: skillToEdit.description ?? "",
          }
        : {
            skillId: "",
            type: "LEARN",
            level: "BEGINNER",
            yearsExperience: 0,
            description: "",
          }
    );
    setSkillQuery("");
  }, [isOpen, skillToEdit, reset]);

  const selectedType = watch("type");

  const availableSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    const filtered = q ? catalog.filter((s: Skill) => s.name.toLowerCase().includes(q)) : catalog;
    const grouped = new Map<string, Skill[]>();
    for (const skill of filtered) {
      const key = skill.category.name;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(skill);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog, skillQuery]);

  const selectedSkill = catalog.find((s: Skill) => s.id === watch("skillId"));

  if (!isOpen) return null;

  async function onSubmit(values: UserSkillFormValues) {
    setSubmitting(true);
    try {
      if (skillToEdit) {
        await updateMySkill(skillToEdit.id, {
          type: values.type,
          level: values.level,
          yearsExperience: values.yearsExperience,
          description: values.description?.trim() || null,
        });
      } else {
        await addMySkill({
          skillId: values.skillId,
          type: values.type,
          level: values.level,
          yearsExperience: values.yearsExperience,
          description: values.description?.trim() || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : undefined;
      onError(message ?? "Could not save skill. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? `Edit ${skillToEdit!.skill.name}` : "Add a skill"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-4">
          {isEditing ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Skill</label>
              <input
                value={skillToEdit!.skill.name}
                disabled
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Skill<span className="text-red-500">*</span>
              </label>
              <input
                type="search"
                placeholder="Search the catalog…"
                value={skillQuery}
                onChange={(e) => setSkillQuery(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
              />

              {catalogLoading ? (
                <p className="px-1 py-2 text-sm text-slate-500">Loading skills…</p>
              ) : (
                <select
                  {...register("skillId")}
                  className="h-40 w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
                  aria-label="Choose a skill"
                >
                  <option value="">Choose a skill…</option>
                  {availableSkills.map(([categoryName, skills]) => (
                    <optgroup key={categoryName} label={categoryName}>
                      {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              {selectedSkill && (
                <p className="px-1 text-sm text-slate-500">
                  Selected:{" "}
                  <span className="font-medium text-slate-700">{selectedSkill.name}</span>
                </p>
              )}
              {errors.skillId && <p className="text-sm text-red-600">{errors.skillId.message}</p>}
              {availableSkills.length === 0 && !catalogLoading && (
                <p className="px-1 text-sm text-slate-500">
                  No skills match “{skillQuery}”. Try a different search.
                </p>
              )}
            </div>
          )}
<div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Relationship<span className="text-red-500">*</span>
            </label>
            <TypePicker
              value={selectedType}
              onChange={(value) => setValue("type", value, { shouldValidate: true })}
            />
            {errors.type && <p className="text-sm text-red-600">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="level" className="text-sm font-medium text-slate-700">
                Level
              </label>
              <select
                id="level"
                {...register("level")}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {SKILL_LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>
              {errors.level && <p className="text-sm text-red-600">{errors.level.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="yearsExperience" className="text-sm font-medium text-slate-700">
                Years of experience
              </label>
              <input
                id="yearsExperience"
                type="number"
                min={0}
                max={100}
                {...register("yearsExperience", { valueAsNumber: true })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
              />
              {errors.yearsExperience && (
                <p className="text-sm text-red-600">{errors.yearsExperience.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-700">
              Description <span className="text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder={
                selectedType === "TEACH"
                  ? "What can you help people with?"
                  : "What do you want to learn and why?"
              }
              {...register("description")}
              className="resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              onClick={onClose}
              className="!bg-slate-100 !text-slate-700 hover:!bg-slate-200"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {isEditing ? "Save changes" : "Add skill"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}