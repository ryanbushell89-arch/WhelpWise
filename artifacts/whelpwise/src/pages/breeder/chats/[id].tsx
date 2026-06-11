import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, Dog } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ConversationDetail {
  id: number;
  puppyName: string | null;
  ownerEmail: string | null;
  puppyPhotoUrl: string | null;
}

interface Message {
  id: number;
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

export default function BreederChatDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const convId = parseInt(id ?? "0", 10);

  const { data: conv } = useQuery<ConversationDetail>({
    queryKey: ["chats", convId],
    queryFn: () => apiFetch(`/api/chats/${convId}`),
    enabled: !!convId,
  });

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
      qc.invalidateQueries({ queryKey: ["chats"] });
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

  const puppyName = conv?.puppyName ?? "Puppy";
  const ownerName = conv?.ownerEmail?.split("@")[0] ?? "Owner";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Sub-header */}
      <div className="border-b px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/breeder/chats")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {conv?.puppyPhotoUrl ? (
          <img
            src={conv.puppyPhotoUrl}
            alt={puppyName}
            className="w-9 h-9 rounded-full object-cover border"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Dog className="h-4 w-4 text-primary" />
          </div>
        )}
        <div>
          <p className="font-semibold text-sm leading-none">{puppyName}</p>
          <p className="text-xs text-muted-foreground">{ownerName}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">End-to-end encrypted</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {msgsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Start the conversation with {ownerName}!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} ownerName={ownerName} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t bg-background px-6 py-3 flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${ownerName}… (Enter to send)`}
          className="min-h-[44px] max-h-32 resize-none flex-1"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!draft.trim() || sendMutation.isPending}
          className="flex-shrink-0 h-11 w-11"
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ message, ownerName }: { message: Message; ownerName: string }) {
  const isOwn = message.isOwnMessage;
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && <span className="text-xs text-muted-foreground px-1">{ownerName}</span>}
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
