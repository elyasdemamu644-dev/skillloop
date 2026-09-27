import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarClock,
  Compass,
  GraduationCap,
  MessagesSquare,
  Rocket,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { categoryImage, HERO_IMAGE } from "@/utils/images";

const STATS = [
  { value: "65+", label: "Skills in the catalog" },
  { value: "1:1", label: "Real people, real lessons" },
  { value: "14", label: "Phases — fully built out" },
];

const STEPS = [
  {
    icon: <Compass className="h-6 w-6" />,
    title: "Discover a skill",
    text: "Search the catalog and explore teachers for anything on your learning list.",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Match & exchange",
    text: "Request an exchange, get matched with a mentor, and agree on an offering.",
  },
  {
    icon: <CalendarClock className="h-6 w-6" />,
    title: "Learn together",
    text: "Book sessions, chat live, work through challenges, and build real projects.",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Grow the loop",
    text: "Earn credits, rise in reputation, and pay it forward by teaching too.",
  },
];

const CATEGORIES = [
  { name: "Technology", caption: "Code, data & AI", category: "technology" },
  { name: "Languages", caption: "Speak the world", category: "languages" },
  { name: "Photography", caption: "Frame your vision", category: "photography" },
  { name: "Music", caption: "Find the rhythm", category: "music" },
  { name: "Cooking", caption: "Taste better skills", category: "cooking" },
  { name: "Fitness", caption: "Stronger every day", category: "fitness" },
];

const FEATURES = [
  { icon: <Wallet className="h-5 w-5" />, title: "Credits & payments", text: "A built-in credits wallet for lessons. Top up, pay mentors, refund anytime." },
  { icon: <Award className="h-5 w-5" />, title: "Reputation & badges", text: "Ratings, reviews, and achievements that make great teachers shine." },
  { icon: <MessagesSquare className="h-5 w-5" />, title: "Live messaging", text: "Real-time socket chat plus instant notifications — never miss a beat." },
  { icon: <Rocket className="h-5 w-5" />, title: "AI assistant", text: "Personalized recommendations, generated learning plans, and smart matching." },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-ink" />
        <div className="absolute inset-0 bg-hero-grid opacity-40" />
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent-500/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:py-28 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200">
              <Sparkles className="h-3.5 w-3.5" />
              Learn from people. Teach what you know.
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              The skill loop that
              <span className="block bg-gradient-to-r from-brand-300 via-accent-400 to-fuchsia-300 bg-clip-text text-transparent">
                keeps everyone growing.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              SkillLoop connects you with real mentors for anything you want to
              learn — and gives you a chance to teach what you already know.
              Sessions, challenges, payments, and reputation in one loop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Start learning free
              </Link>
              <Link
                to="/offerings/browse"
                className="rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Explore offerings
              </Link>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
                  <p className="mt-1 text-xs leading-snug text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="animate-float overflow-hidden rounded-3xl shadow-lift ring-1 ring-white/20">
              <img src={HERO_IMAGE} alt="People learning together" className="h-[520px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/12 p-4 backdrop-blur-md">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Users className="h-4 w-4 text-brand-300" />
                  "Michael taught me JavaScript in 6 weeks. Now I help others."
                </p>
                <p className="mt-1 text-xs text-slate-300">— Alex, SkillLoop learner → teacher</p>
              </div>
            </div>
            <div className="absolute -left-10 top-10 animate-float rounded-2xl bg-white p-3 shadow-lift" style={{ animationDelay: "1.2s" }}>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">Lesson confirmed</p>
                  <p className="text-[10px] text-slate-500">Photography · Today 3 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">How it works</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From curious to confident, <span className="text-gradient">together</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="group relative rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-900/5 transition hover:-translate-y-1 hover:shadow-lift">
              <span className="absolute right-5 top-4 font-display text-4xl font-extrabold text-slate-100 transition group-hover:text-brand-100">
                {index + 1}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-glow">
                {step.icon}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Explore by interest</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What do you want to learn?</h2>
            </div>
            <Link to="/discover" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Browse the full catalog →
            </Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((item) => (
              <Link
                key={item.name}
                to="/discover"
                className="group relative overflow-hidden rounded-2xl shadow-soft ring-1 ring-slate-900/5 transition hover:-translate-y-1 hover:shadow-lift"
              >
                <img
                  src={categoryImage(item.category, item.category)}
                  alt={item.name}
                  className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display text-lg font-bold text-white">{item.name}</h3>
                  <p className="text-sm text-slate-300">{item.caption}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="rounded-3xl bg-gradient-brand-soft p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Everything in the loop</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Not just lessons — <span className="text-gradient">a whole ecosystem</span>
              </h2>
              <p className="mt-3 max-w-md text-slate-600">
                Every part of the teaching and learning journey is baked in, so
                the loop never breaks.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">{feature.icon}</span>
                  <h3 className="mt-3 font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-ink px-6 py-14 text-center sm:px-12">
          <div className="absolute inset-0 bg-hero-grid opacity-40" />
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-accent-500/25 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to start your <span className="text-gradient">loop?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Join SkillLoop free today — learn a new skill, meet a mentor, and
              keep the loop going for the next person.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-7 py-3 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Create free account
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-white/15 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}