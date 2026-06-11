import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, Dog, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Conversation {
  id: number;
  puppyName: string | null;
  breederEmail: string | null;
  unreadOwner: number;
}

interface Message {
  id: number;
  conversationId: number;
  senderUserId: string;
  senderRole: string;
  content: string;
  sentAt: string;
  isOwnMessage: boolean;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function PuppyOwnerChat() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["chats"],
    queryFn: () => apiFetch("/api/chats"),
  });

  const conversation = conversations[0] ?? null;
  const convId = conversation?.id;

  const { data: messages = [], isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["chats", convId, "messages"],
    queryFn: () => apiFetch(`/api/chats/${convId}/messages`),
    enabled: !!convId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/chats/${convId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chats", convId, "messages"] });
      setDraft("");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const breederName = conversation?.breederEmail?.split("@")[0] ?? "Breeder";
  const puppyName = conversation?.puppyName ?? "Your Puppy";

  if (convsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/puppy-owner")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Dog className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">{breederName}</p>
              <p className="text-xs text-muted-foreground">{puppyName}'s breeder</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">End-to-end encrypted</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {!conversation ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No conversation yet. Your breeder will reach out soon!</p>
            </div>
          ) : msgsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Send a message to {breederName} to get started!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {conversation && (
        <div className="flex-shrink-0 border-t bg-background">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${breederName}… (Enter to send)`}
              className="min-h-[44px] max-h-32 resize-none flex-1"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
              className="flex-shrink-0 h-11 w-11"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOwn = message.isOwnMessage;
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground px-1">Breeder</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground px-1">
          {format(parseISO(message.sentAt), "h:mm a · d MMM")}
        </span>
      </div>
    </div>
  );
}
