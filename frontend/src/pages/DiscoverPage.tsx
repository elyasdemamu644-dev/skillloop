import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { AxiosError } from "axios";
import { discoverSkills, discoverUsers, fetchCategories } from "@/services/skill.api";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { categoryImage } from "@/utils/images";
import type { Skill, SkillCategory } from "@/types/skill";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "TEACH", label: "Teachers" },
  { value: "LEARN", label: "Learners" },
  { value: "BOTH", label: "Teach and learn" },
];

const LEVEL_OPTIONS = [
  { value: "", label: "All levels" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
];

function ErrorMessage({ error }: { error: unknown }) {
  const message =
    error instanceof AxiosError
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;
  return <p className="text-sm text-red-600">{message ?? "Could not load discovery results."}</p>;
}

function SkillResult({ skill, selected, onSelect }: { skill: Skill; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-xl text-left shadow-sm ring-1 transition ${
        selected
          ? "ring-2 ring-brand-600"
          : "ring-slate-900/5 hover:-translate-y-0.5 hover:shadow-soft"
      }`}
    >
      <div className="flex">
        <img
          src={categoryImage(skill.category.slug, skill.slug)}
          alt=""
          className="h-24 w-24 shrink-0 object-cover"
          loading="lazy"
        />
        <div className={`flex flex-1 items-start justify-between gap-3 p-4 ${selected ? "bg-brand-50/60" : "bg-white"}`}>
          <div>
            <h3 className="font-semibold text-slate-900">{skill.name}</h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-600">
              {skill.category.name}
            </p>
            {skill.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{skill.description}</p>}
          </div>
          <span className="hidden shrink-0 text-xs text-slate-400 sm:block">View people</span>
        </div>
      </div>
    </button>
  );
}

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [skillPage, setSkillPage] = useState(1);
  const [peoplePage, setPeoplePage] = useState(1);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["discovery-categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
  const skillsQuery = useQuery({
    queryKey: ["discovery-skills", submittedSearch, categoryId, skillPage],
    queryFn: () => discoverSkills({ search: submittedSearch || undefined, categoryId: categoryId || undefined, page: skillPage }),
  });
  const peopleQuery = useQuery({
    queryKey: ["discovery-people", selectedSkill?.id, type, level, peoplePage],
    queryFn: () =>
      discoverUsers({
        skillId: selectedSkill?.id,
        type: type || undefined,
        level: level || undefined,
        page: peoplePage,
      }),
    enabled: Boolean(selectedSkill),
  });

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSkillPage(1);
    setSelectedSkill(null);
    setSubmittedSearch(search.trim());
  }

  function selectSkill(skill: Skill) {
    setSelectedSkill(skill);
    setPeoplePage(1);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Discovery</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Find your next skill connection
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Search the catalog, then meet people who teach or want to learn what interests you.
        </p>
      </div>

      <form onSubmit={submitSearch} className="grid gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-900/5 md:grid-cols-[1fr_220px_auto]">
        <label className="relative block">
          <span className="sr-only">Search skills</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search skills or descriptions"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label>
          <span className="sr-only">Filter by category</span>
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setSkillPage(1);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All categories</option>
            {(categoriesQuery.data as SkillCategory[] | undefined)?.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-glow transition hover:brightness-110">
          Search
        </button>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Skills</h2>
              <p className="text-sm text-slate-500">Select a skill to discover people.</p>
            </div>
            {skillsQuery.data && <span className="text-sm text-slate-500">{skillsQuery.data.pagination.total} found</span>}
          </div>
          {skillsQuery.isLoading && <p className="text-sm text-slate-500">Loading skills...</p>}
          {skillsQuery.isError && <ErrorMessage error={skillsQuery.error} />}
          {!skillsQuery.isLoading && !skillsQuery.isError && skillsQuery.data?.items.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">No skills matched your search.</p>
          )}
          <div className="flex flex-col gap-3">
            {skillsQuery.data?.items.map((skill) => (
              <SkillResult key={skill.id} skill={skill} selected={selectedSkill?.id === skill.id} onSelect={() => selectSkill(skill)} />
            ))}
          </div>
          {skillsQuery.data && skillsQuery.data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button disabled={skillPage <= 1} onClick={() => setSkillPage((page) => page - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button>
              <span>Page {skillPage} of {skillsQuery.data.pagination.totalPages}</span>
              <button disabled={skillPage >= skillsQuery.data.pagination.totalPages} onClick={() => setSkillPage((page) => page + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">People</h2>
              <p className="text-sm text-slate-500">{selectedSkill ? `People connected to ${selectedSkill.name}.` : "Choose a skill to see people."}</p>
            </div>
            <Users className="h-5 w-5 text-brand-600" />
          </div>
          {selectedSkill && (
            <div className="mb-4 grid grid-cols-2 gap-3">
              <select value={type} onChange={(event) => { setType(event.target.value); setPeoplePage(1); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={level} onChange={(event) => { setLevel(event.target.value); setPeoplePage(1); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                {LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          )}
          {!selectedSkill && (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500">
              Select a skill to discover teachers and learners.
            </p>
          )}
          {selectedSkill && peopleQuery.isLoading && <p className="text-sm text-slate-500">Loading people...</p>}
          {selectedSkill && peopleQuery.isError && <ErrorMessage error={peopleQuery.error} />}
          {selectedSkill && !peopleQuery.isLoading && !peopleQuery.isError && peopleQuery.data?.items.length === 0 && (
            <EmptyState title="No people found yet" description="Nobody has added this skill — be the first to connect." />
          )}
          <div className="flex flex-col gap-3">
            {peopleQuery.data?.items.map((entry) => (
              <article key={entry.id} className="flex gap-3 rounded-xl bg-white p-4 shadow-soft ring-1 ring-slate-900/5">
                <Avatar src={entry.user.avatar} seed={entry.user.id} firstName={entry.user.firstName} lastName={entry.user.lastName} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {entry.user.firstName} {entry.user.lastName}
                      </h3>
                      <p className="text-xs text-slate-500">@{entry.user.username}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.user.isVerified && <Badge tone="success">Verified</Badge>}
                      <Badge tone={entry.type === "TEACH" ? "brand" : entry.type === "LEARN" ? "warning" : "success"}>
                        {entry.type}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {entry.description || entry.user.bio || `${entry.type === "TEACH" ? "Teaches" : entry.type === "LEARN" ? "Wants to learn" : "Teaches and learns"} ${entry.skill.name}.`}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {entry.skill.name} · {entry.level} · {entry.yearsExperience} yr exp
                  </p>
                </div>
              </article>
            ))}
          </div>
          {peopleQuery.data && peopleQuery.data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button disabled={peoplePage <= 1} onClick={() => setPeoplePage((page) => page - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button>
              <span>Page {peoplePage} of {peopleQuery.data.pagination.totalPages}</span>
              <button disabled={peoplePage >= peopleQuery.data.pagination.totalPages} onClick={() => setPeoplePage((page) => page + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
