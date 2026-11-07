import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, MessageCircle, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { fetchUnreadCount } from "@/services/messaging.api";
import { fetchUnreadNotifications } from "@/services/notification.api";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";

// Kept small so the desktop bar never overflows; the rest live under "More".
const PRIMARY_LINKS = [
  { to: "/discover", label: "Discover" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/offerings", label: "Teach" },
  { to: "/skills", label: "Skills" },
  { to: "/exchanges", label: "Exchanges" },
  { to: "/sessions", label: "Sessions" },
  { to: "/learning", label: "Learning" },
];

const MORE_LINKS = [
  { to: "/availability", label: "Availability" },
  { to: "/materials", label: "Materials" },
  { to: "/reputation", label: "Reputation" },
  { to: "/payments", label: "Payments" },
  { to: "/ai", label: "AI assistant" },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Only subscribe to notifications when signed in.
  useNotificationsRealtime(isAuthenticated);

  const unread = useQuery({
    queryKey: ["unread-count"],
    queryFn: fetchUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const unreadNotifications = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: fetchUnreadNotifications,
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  // Any navigation closes the menus.
  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  const linkClass = (to: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive(to) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const moreActive = MORE_LINKS.some((link) => isActive(link.to));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/5">
      <div className="glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 font-display text-lg font-bold text-white shadow-glow">
              S
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              Skill<span className="text-gradient">Loop</span>
            </span>
          </Link>

          {isAuthenticated ? (
            <>
              <nav className="hidden items-center gap-1 lg:flex">
                {PRIMARY_LINKS.map((link) => (
                  <Link key={link.to} to={link.to} className={linkClass(link.to)}>
                    {link.label}
                  </Link>
                ))}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((value) => !value)}
                    aria-expanded={moreOpen}
                    aria-haspopup="menu"
                    className={`flex items-center gap-1 ${linkClass("__more__")} ${
                      moreActive ? "bg-brand-50 text-brand-700" : ""
                    }`}
                  >
                    More
                    <ChevronDown className={`h-3.5 w-3.5 transition ${moreOpen ? "rotate-180" : ""}`} />
                  </button>

                  {moreOpen && (
                    <>
                      {/* Click-away layer. */}
                      <button
                        type="button"
                        aria-hidden="true"
                        tabIndex={-1}
                        onClick={() => setMoreOpen(false)}
                        className="fixed inset-0 z-10 cursor-default"
                      />
                      <div
                        role="menu"
                        className="absolute right-0 z-20 mt-2 w-52 rounded-xl bg-white p-1.5 shadow-lift ring-1 ring-slate-900/5"
                      >
                        {MORE_LINKS.map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            role="menuitem"
                            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                              isActive(link.to)
                                ? "bg-brand-50 text-brand-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </nav>

              <div className="hidden items-center gap-3 lg:flex">
                <Link
                  to="/notifications"
                  className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Notifications"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {(unreadNotifications.data?.unread ?? 0) > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadNotifications.data!.unread > 9 ? "9+" : unreadNotifications.data!.unread}
                    </span>
                  )}
                </Link>
                <Link
                  to="/messages"
                  className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Messages"
                >
                  <MessageCircle className="h-[18px] w-[18px]" />
                  {unread.data && unread.data.unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                      {unread.data.unread > 9 ? "9+" : unread.data.unread}
                    </span>
                  )}
                </Link>
                <Link to="/dashboard" className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100">
                  <Avatar src={user?.avatar} firstName={user?.firstName} lastName={user?.lastName} size="sm" />
                  <span className="text-sm font-semibold text-slate-700">
                    {user?.firstName} {user?.lastName}
                  </span>
                </Link>
                <Button variant="ghost" onClick={handleLogout} className="!px-3" aria-label="Log out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
                aria-label="Toggle navigation"
                aria-expanded={open}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <nav className="flex items-center gap-2">
              <Link to="/offerings/browse" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">
                Explore
              </Link>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
              >
                Get started
              </Link>
            </nav>
          )}
        </div>
      </div>

      {open && isAuthenticated && (
        <div className="border-b border-slate-900/5 bg-white px-4 py-3 shadow-soft lg:hidden">
          <nav className="flex flex-col gap-1">
            {[...PRIMARY_LINKS, ...MORE_LINKS].map((link) => (
              <Link key={link.to} to={link.to} className={linkClass(link.to)}>
                {link.label}
              </Link>
            ))}
            <Link to="/notifications" className={linkClass("/notifications")}>
              Notifications
            </Link>
            {user?.isAdmin && (
              <Link to="/admin" className={linkClass("/admin")}>
                Admin
              </Link>
            )}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <Avatar src={user?.avatar} firstName={user?.firstName} lastName={user?.lastName} size="sm" />
              <span className="text-sm font-semibold text-slate-700">
                {user?.firstName} {user?.lastName}
              </span>
            </Link>
            <Button variant="ghost" onClick={handleLogout} className="!px-3">
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
