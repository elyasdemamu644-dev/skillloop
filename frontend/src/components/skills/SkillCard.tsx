import { GraduationCap, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import type { UserSkill } from "@/types/skill";
import { SKILL_LEVEL_LABELS } from "@/utils/skillValidation";
import { categoryImage } from "@/utils/images";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface SkillCardProps {
  userSkill: UserSkill;
  onEdit: (userSkill: UserSkill) => void;
  onRemove: (userSkill: UserSkill) => void;
  isRemoving: boolean;
}

const LEVEL_TONES: Record<string, "success" | "warning" | "brand" | "slate" | "danger"> = {
  BEGINNER: "success",
  INTERMEDIATE: "warning",
  ADVANCED: "brand",
  EXPERT: "danger",
};

export default function SkillCard({ userSkill, onEdit, onRemove, isRemoving }: SkillCardProps) {
  const { skill } = userSkill;

  return (
    <Card className="overflow-hidden">
      <div className="relative h-28 overflow-hidden">
        <img
          src={categoryImage(skill.category.slug, skill.slug)}
          alt={skill.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
        <h3 className="absolute bottom-3 left-4 font-display text-lg font-bold text-white drop-shadow">
          {skill.name}
        </h3>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {skill.category.name}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(userSkill)}
              aria-label={`Edit ${skill.name}`}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(userSkill)}
              aria-label={`Remove ${skill.name}`}
              disabled={isRemoving}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={LEVEL_TONES[userSkill.level] ?? "slate"}>
            <GraduationCap className="h-3 w-3" />
            {SKILL_LEVEL_LABELS[userSkill.level]}
          </Badge>
          {userSkill.yearsExperience > 0 && (
            <Badge tone="slate">
              {userSkill.yearsExperience} yr{userSkill.yearsExperience > 1 ? "s" : ""}
            </Badge>
          )}
          {userSkill.isVerified && (
            <Badge tone="success">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </div>

        {userSkill.description && (
          <p className="mt-3 text-sm text-slate-600">{userSkill.description}</p>
        )}
      </div>
    </Card>
  );
}