import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { GraduationCap, Plus, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import SkillCard from "@/components/skills/SkillCard";
import SkillFormModal from "@/components/skills/SkillFormModal";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { fetchMySkills, removeMySkill } from "@/services/skill.api";
import type { UserSkill } from "@/types/skill";

function Section({
  title,
  subtitle,
  skills,
  onEdit,
  onRemove,
  removingId,
}: {
  title: string;
  subtitle: string;
  skills: UserSkill[];
  onEdit: (s: UserSkill) => void;
  onRemove: (s: UserSkill) => void;
  removingId: string | null;
}) {
  const teaching = title.startsWith("Skills I teach");
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${teaching ? "bg-brand-50 text-brand-600" : "bg-amber-50 text-amber-500"}`}>
          {teaching ? <GraduationCap className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          title={teaching ? "Nothing to teach yet" : "Nothing in your wishlist"}
          description={
            teaching
              ? "Add a skill you can teach and start offering it to the community."
              : "Add a skill you'd love to learn and we'll connect you with mentors."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <SkillCard
              key={s.id}
              userSkill={s}
              onEdit={onEdit}
              onRemove={onRemove}
              isRemoving={removingId === s.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function MySkillsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [skillToEdit, setSkillToEdit] = useState<UserSkill | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: userSkills = [], isLoading } = useQuery({
    queryKey: ["my-skills"],
    queryFn: fetchMySkills,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeMySkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-skills"] });
      setRemovingId(null);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : undefined;
      setErrorMessage(message ?? "Could not remove skill. Please try again.");
      setRemovingId(null);
    },
  });

  const teachSkills = useMemo(
    () => userSkills.filter((s) => s.type === "TEACH" || s.type === "BOTH"),
    [userSkills]
  );
  const learnSkills = useMemo(
    () => userSkills.filter((s) => s.type === "LEARN" || s.type === "BOTH"),
    [userSkills]
  );

  function openAdd() {
    setSkillToEdit(null);
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function openEdit(s: UserSkill) {
    setSkillToEdit(s);
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function handleRemoved(s: UserSkill) {
    setRemovingId(s.id);
    setErrorMessage(null);
    removeMutation.mutate(s.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        eyebrow="Your profile"
        title="My Skills"
        description="Tell people what you can teach and what you want to learn."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add skill
          </Button>
        }
      />

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-500">Loading your skills…</p>
      ) : (
        <div className="flex flex-col gap-10">
          <Section
            title="Skills I teach"
            subtitle="Help others learn these"
            skills={teachSkills}
            onEdit={openEdit}
            onRemove={handleRemoved}
            removingId={removingId}
          />
          <Section
            title="Skills I want to learn"
            subtitle="Find people who can teach these"
            skills={learnSkills}
            onEdit={openEdit}
            onRemove={handleRemoved}
            removingId={removingId}
          />
        </div>
      )}

      <SkillFormModal
        isOpen={isModalOpen}
        skillToEdit={skillToEdit}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["my-skills"] })}
        onError={setErrorMessage}
      />
    </div>
  );
}