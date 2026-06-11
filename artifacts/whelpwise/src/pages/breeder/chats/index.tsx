import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Dog, Loader2, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Conversation {
  id: number;
  puppyId: number;
  puppyName: string | null;
  puppyPhotoUrl: string | null;
  ownerUserId: string;
  ownerEmail: string | null;
  unreadBreeder: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export default function BreederChats() {
  const [, setLocation] = useLocation();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await fetch("/api/chats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load chats");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadBreeder ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif">Puppy Owner Chats</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Private conversations with your puppy owners
          </p>
        </div>
        {totalUnread > 0 && (
          <Badge className="bg-primary text-primary-foreground">
            {totalUnread} unread
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conversations appear here when you invite puppy owners. Go to a puppy profile to send an invite.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setLocation(`/breeder/chats/${conv.id}`)}
              className="w-full text-left"
            >
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${conv.unreadBreeder > 0 ? "border-primary/40 bg-primary/2" : ""}`}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    {conv.puppyPhotoUrl ? (
                      <img
                        src={conv.puppyPhotoUrl}
                        alt={conv.puppyName ?? "Puppy"}
                        className="w-12 h-12 rounded-full object-cover border flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Dog className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{conv.puppyName ?? "Puppy"}</p>
                        {conv.unreadBreeder > 0 && (
                          <Badge className="h-5 text-xs bg-primary text-primary-foreground flex-shrink-0">
                            {conv.unreadBreeder}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.ownerEmail ?? "Owner"}
                      </p>
                      {conv.lastMessageAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last message {format(parseISO(conv.lastMessageAt), "d MMM · h:mm a")}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
