import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useChatSocket } from "@/hooks/useChatSocket";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import {
  fetchMessages,
  fetchMyConversations,
  getOrCreateConversation,
  markConversationRead,
  sendMessage,
} from "@/services/messaging.api";
import type { Conversation, Message } from "@/types/messaging";

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const myId = user?.id;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchMyConversations,
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const activeConversation: Conversation | undefined = conversations.data?.find(
    (conversation) => conversation.id === activeId
  );

  const loader = useCallback(
    (payload: { conversationId: string; message: Message }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessages((current) =>
        current.some((m) => m.id === payload.message.id)
          ? current
          : [...current, payload.message]
      );
      if (activeConversation?.id === payload.conversationId) {
        markConversationRead(payload.conversationId).catch(() => undefined);
      }
    },
    [activeConversation?.id, queryClient]
  );

  useChatSocket(isAuthenticated, {
    onMessageNew: loader,
    onConversationUpdate: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (payload.conversationId === activeConversation?.id && payload.message && !messages.some((m) => m.id === payload.message?.id)) {
        setMessages((current) => [...current, payload.message as Message]);
      }
    },
    onRead: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  // Auto-open a thread when arriving with ?user=<id>.
  useEffect(() => {
    const userId = searchParams.get("user");
    if (!userId || activeId) return;
    let cancelled = false;
    (async () => {
      try {
        const conversation = await getOrCreateConversation({ participantId: userId });
        if (!cancelled) {
          setActiveId(conversation.id);
          setSearchParams({}, { replace: true });
        }
      } catch {
        if (!cancelled) setErrorMessage("Could not open that conversation.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, activeId, setSearchParams]);

  // Load the thread + mark read when the active conversation changes.
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessages([]);
    setErrorMessage(null);
    markConversationRead(activeId).catch(() => undefined);
    fetchMessages(activeId)
      .then((result) => {
        if (!cancelled) setMessages(result.items);
      })
      .catch(() => {
        if (!cancelled) setErrorMessage("Could not load messages.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages.length, activeId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId || !draft.trim() || !activeConversation) return;
    const input = draft.trim();
    setDraft("");
    try {
      const message = await sendMessage(activeId, { body: input });
      setMessages((current) => [...current, message]);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      setErrorMessage(
        err instanceof AxiosError
          ? ((err.response?.data as { message?: string } | undefined)?.message ?? "Could not send message.")
          : "Could not send message."
      );
      setDraft(input);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4 py-10 md:grid-cols-[300px_minmax(0,1fr)]">
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Inbox</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">
            Messages
          </h1>
          <p className="mt-1 text-sm text-slate-600">Conversations with your skill connections.</p>
        </div>

        {conversations.isLoading && <p className="text-sm text-slate-500">Loading conversations...</p>}
        {conversations.isError && (
          <p className="text-sm text-red-600">Could not load conversations.</p>
        )}
        {!conversations.isLoading && !conversations.isError && conversations.data?.length === 0 && (
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No conversations yet"
            description="Open one from an offering or exchange."
          />
        )}

        <div className="flex flex-col gap-2">
          {conversations.data?.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setActiveId(conversation.id)}
              className={`rounded-xl p-3 text-left shadow-sm ring-1 transition ${
                activeId === conversation.id
                  ? "bg-gradient-to-br from-brand-50 to-accent-50 ring-2 ring-brand-500"
                  : "bg-white ring-slate-900/5 hover:-translate-y-0.5 hover:shadow-soft"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Avatar seed={conversation.otherUser.id} firstName={conversation.otherUser.firstName} lastName={conversation.otherUser.lastName} size="sm" />
                <span className="flex-1 truncate font-semibold text-slate-900">
                  {conversation.otherUser.firstName} {conversation.otherUser.lastName}
                </span>
                {conversation.unreadCount > 0 && (
                  <span className="rounded-full bg-gradient-to-r from-brand-600 to-accent-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              {conversation.exchange?.offering.skill.name && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {conversation.exchange.offering.skill.name}
                </p>
              )}
              <p className="mt-1 truncate text-sm text-slate-500">
                {conversation.lastMessage?.body ?? "Start the conversation"}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5">
        {!activeConversation ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              icon={<MessageSquare className="h-5 w-5" />}
              title="Select a conversation"
              description="Pick a thread to start chatting."
            />
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Avatar seed={activeConversation.otherUser.id} firstName={activeConversation.otherUser.firstName} lastName={activeConversation.otherUser.lastName} size="sm" />
              <div>
                <h2 className="font-semibold text-slate-900">
                  {activeConversation.otherUser.firstName} {activeConversation.otherUser.lastName}
                </h2>
                <p className="text-xs text-slate-500">@{activeConversation.otherUser.username}</p>
              </div>
            </header>

            {errorMessage && (
              <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto bg-brand-50/40 p-4">
              {messages.length === 0 && (
                <p className="text-center text-sm text-slate-400">No messages yet — say hello!</p>
              )}
              {messages.map((message) => {
                const own = message.senderId === myId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${own ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        own ? "rounded-br-md bg-gradient-to-r from-brand-600 to-accent-600 text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-900/5"
                      }`}
                    >
                      <p>{message.body}</p>
                      <p className={`mt-1 text-xs ${own ? "text-brand-100" : "text-slate-400"}`}>
                        {new Date(message.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}