import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Download, FileText, Link2, Pencil, Trash2, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import {
  createMaterial,
  deleteMaterial,
  downloadMaterialFile,
  fetchLibrary,
  fetchMaterials,
  fetchMyMaterials,
  purchaseMaterial,
  toggleMaterial,
  updateMaterial,
} from "@/services/material.api";
import { fetchMySkills } from "@/services/skill.api";
import { fetchWallet } from "@/services/payment.api";
import { categoryImage } from "@/utils/images";
import { displayFileName } from "@/types/material";
import type { LibraryItem, Material, MyMaterial } from "@/types/material";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type Tab = "browse" | "library" | "manage";

const TABS: { id: Tab; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "library", label: "My library" },
  { id: "manage", label: "Sell materials" },
];

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("browse");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const materials = useQuery({ queryKey: ["materials"], queryFn: () => fetchMaterials() });
  const library = useQuery({ queryKey: ["materials-library"], queryFn: fetchLibrary });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: fetchWallet });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["materials"] });
    queryClient.invalidateQueries({ queryKey: ["materials-library"] });
    queryClient.invalidateQueries({ queryKey: ["materials-mine"] });
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
  };

  const buy = useMutation({
    mutationFn: (id: string) => purchaseMaterial(id),
    onSuccess: () => {
      setMessage({ tone: "success", text: "Purchased! The materials are now in your library." });
      invalidate();
    },
    onError: handleError,
  });

  function handleError(error: unknown) {
    setMessage({
      tone: "error",
      text: error instanceof AxiosError
        ? ((error.response?.data as { message?: string } | undefined)?.message ?? "Something went wrong.")
        : "Something went wrong.",
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        eyebrow="Marketplace"
        title="Materials"
        description="Buy and sell learning resources — files, guides, and links."
        actions={
          wallet.data ? (
            <span className="flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
              <Wallet className="h-4 w-4" />
              {formatCredits(wallet.data.balance)} credits
            </span>
          ) : undefined
        }
      />

      {message && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "browse" && (
        <BrowseTab
          materials={materials}
          walletBalance={wallet.data?.balance ?? 0}
          buying={buy.isPending}
          onBuy={(id) => buy.mutate(id)}
        />
      )}
      {tab === "library" && <LibraryTab library={library} />}
      {tab === "manage" && <ManageTab onSaved={invalidate} onError={handleError} />}
    </main>
  );
}

function BrowseTab({
  materials,
  walletBalance,
  buying,
  onBuy,
}: {
  materials: { data?: { items: Material[] }; isLoading?: boolean; isError?: boolean };
  walletBalance: number;
  buying: boolean;
  onBuy: (id: string) => void;
}) {
  return (
    <>
      {materials.isLoading && <p className="text-sm text-slate-500">Loading materials...</p>}
      {materials.isError && <p className="text-sm text-red-600">Could not load materials.</p>}
      {!materials.isLoading && !materials.isError && materials.data?.items.length === 0 && (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No materials yet"
          description="Teachers can publish their first material from the Sell tab."
        />
      )}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {materials.data?.items.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            walletBalance={walletBalance}
            buying={buying}
            onBuy={() => onBuy(material.id)}
          />
        ))}
      </div>
    </>
  );
}

function MaterialCard({
  material,
  walletBalance,
  buying,
  onBuy,
}: {
  material: Material;
  walletBalance: number;
  buying: boolean;
  onBuy: () => void;
}) {
  const cover = categoryImage(material.skill?.category.slug ?? "other", material.title);
  const canAfford = walletBalance >= material.price;

  return (
    <Card interactive className="flex flex-col overflow-hidden">
      <div className="relative h-36 overflow-hidden">
        <img src={cover} alt={material.title} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
        <div className="absolute bottom-3 left-4 flex flex-wrap gap-2">
          {material.skill ? (
            <>
              <Badge tone="slate">{material.skill.category.name}</Badge>
              <Badge>{material.skill.name}</Badge>
            </>
          ) : (
            <Badge tone="slate">General</Badge>
          )}
        </div>
        <div className="absolute right-3 top-3">
          <span className="rounded-full bg-gradient-to-r from-brand-600 to-accent-600 px-3 py-1 text-xs font-bold text-white shadow-glow">
            {formatCredits(material.price)} credits
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-lg font-bold leading-snug text-slate-900">{material.title}</h2>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">{material.description}</p>

        <div className="mt-4 flex items-center gap-2.5">
          <Avatar seed={material.teacher.id} firstName={material.teacher.firstName} lastName={material.teacher.lastName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {material.teacher.firstName} {material.teacher.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {material.teacher.username} · {material.purchaseCount ?? 0} sold
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {material.fileNames.length} files
          </span>
          <span className="inline-flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" />
            {material.links.length} links
          </span>
        </div>

        <div className="mt-4">
          {material.own ? (
            <Badge tone="brand">Your material</Badge>
          ) : material.purchased ? (
            <Badge tone="success">In your library</Badge>
          ) : (
            <Button onClick={onBuy} disabled={buying || !canAfford} className="w-full" isLoading={buying}>
              <Wallet className="h-4 w-4" />
              {canAfford ? `Buy for ${formatCredits(material.price)} credits` : "Insufficient credits"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function LibraryTab({ library }: { library: { data?: LibraryItem[]; isLoading?: boolean } }) {
  return (
    <>
      {library.isLoading && <p className="text-sm text-slate-500">Loading your library...</p>}
      {!library.isLoading && library.data?.length === 0 && (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Your library is empty"
          description="Buy a material from the Browse tab to unlock its files and links here."
        />
      )}
      <div className="flex flex-col gap-4">
        {library.data?.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">{item.material.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Bought {new Date(item.createdAt).toLocaleDateString()} for {formatCredits(item.pricePaid)} credits · from{" "}
                  <span className="font-semibold text-slate-700">
                    {item.material.teacher.firstName} {item.material.teacher.lastName}
                  </span>
                </p>
              </div>
              <Badge tone="success">Active</Badge>
            </div>

            {item.material.fileNames.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Files</p>
                <div className="flex flex-wrap gap-2">
                  {item.material.fileNames.map((fileName) => (
                    <button
                      key={fileName}
                      type="button"
                      onClick={() => void downloadMaterialFile(item.material.id, fileName)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <FileText className="h-4 w-4 text-brand-600" />
                      {displayFileName(fileName)}
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item.material.links.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Links</p>
                <ul className="flex flex-col gap-1.5">
                  {item.material.links.map((link) => (
                    <li key={link}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

function ManageTab({ onSaved, onError }: { onSaved: () => void; onError: (error: unknown) => void }) {
  const queryClient = useQueryClient();
  const mine = useQuery({ queryKey: ["materials-mine"], queryFn: fetchMyMaterials });
  const mySkills = useQuery({ queryKey: ["my-skills"], queryFn: fetchMySkills });
  const teachSkills = (mySkills.data ?? []).filter((skill) => skill.type !== "LEARN");

  const [editing, setEditing] = useState<MyMaterial | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [skillId, setSkillId] = useState("");
  const [linksText, setLinksText] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [clearFiles, setClearFiles] = useState(false);

  const save = useMutation({
    mutationFn: (form: FormData) =>
      editing ? updateMaterial(editing.id, form) : createMaterial(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials-mine"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setMessage({ tone: "success", text: editing ? "Material updated." : "Material published." });
      resetForm();
    },
    onError: onError,
  });

  const publish = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleMaterial(id, isActive),
    onSuccess: () => onSaved(),
    onError: onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onSuccess: () => onSaved(),
    onError: onError,
  });

  function resetForm() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setSkillId("");
    setLinksText("");
    setFiles(null);
    setClearFiles(false);
  }

  function startEdit(material: MyMaterial) {
    setEditing(material);
    setTitle(material.title);
    setDescription(material.description);
    setPrice(String(material.price));
    setSkillId(material.skill?.id ?? "");
    setLinksText(material.links.join("\n"));
    setFiles(null);
    setClearFiles(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const links = linksText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("price", price);
    form.append("skillId", skillId);
    form.append("links", JSON.stringify(links));
    if (clearFiles) form.append("clearFiles", "1");
    if (files) {
      for (const file of Array.from(files)) form.append("files", file);
    }
    save.mutate(form);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {editing ? `Edit "${editing.title}"` : "Publish a new material"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Price it in credits, attach files and links. Buyers pay from their wallet and get instant access.
          </p>

          {message && (
            <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {message.text}
            </p>
          )}

          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={120} className={INPUT_CLASS} placeholder="e.g. Photography Field Notes" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} rows={3} className={INPUT_CLASS} placeholder="What will the buyer learn or receive?" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Price (credits)</label>
                <input type="number" min={1} required value={price} onChange={(event) => setPrice(event.target.value)} className={INPUT_CLASS} placeholder="40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Related skill (optional)</label>
                <select value={skillId} onChange={(event) => setSkillId(event.target.value)} className={INPUT_CLASS}>
                  <option value="">General</option>
                  {teachSkills.map((skill) => (
                    <option key={skill.id} value={skill.skill.id}>
                      {skill.skill.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Links (one per line)</label>
              <textarea
                value={linksText}
                onChange={(event) => setLinksText(event.target.value)}
                rows={3}
                className={INPUT_CLASS}
                placeholder={"https://example.com/guide\nhttps://example.com/cheatsheet"}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Files (max 8, up to 10 MB each)</label>
              <input
                type="file"
                multiple
                onChange={(event) => setFiles(event.target.files)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              {editing && editing.fileNames.length > 0 && (
                <>
                  <p className="mt-2 text-xs text-slate-500">
                    Current files: {editing.fileNames.map(displayFileName).join(", ")}
                  </p>
                  <label className="mt-1 inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={clearFiles}
                      onChange={(event) => setClearFiles(event.target.checked)}
                    />
                    Remove all current files (or choose new ones to replace them)
                  </label>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" isLoading={save.isPending}>
                {editing ? "Save changes" : "Publish material"}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-slate-900">Your materials</h2>
        {mine.isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {!mine.isLoading && mine.data?.length === 0 && (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="Nothing published yet"
            description="Create your first material on the left to start selling."
          />
        )}
        <div className="flex flex-col gap-3">
          {mine.data?.map((material) => (
            <Card key={material.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{material.title}</h3>
                    <Badge tone={material.isActive ? "success" : "slate"}>
                      {material.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {material.skill?.name ?? "General"} · {material.fileNames.length} files · {material.links.length} links
                  </p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                  {formatCredits(material.price)} credits
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{material.purchaseCount} sold · {formatCredits(material.revenue)} earned</span>
                {material.buyers.length > 0 && (
                  <span className="flex items-center gap-1">
                    Recent buyers: {material.buyers.slice(0, 3).map((s) => s.buyer.firstName).join(", ")}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => publish.mutate({ id: material.id, isActive: !material.isActive })}
                  isLoading={publish.isPending}
                >
                  {material.isActive ? "Hide" : "Publish"}
                </Button>
                <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => startEdit(material)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="danger"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    if (window.confirm(`Delete "${material.title}"? Buyers lose access and refunds stop.`)) {
                      remove.mutate(material.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value ?? 0);
}