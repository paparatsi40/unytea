"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  username: string | null;
};

type NewMessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string, user: User) => void;
};

export function NewMessageModal({ isOpen, onClose, onSelectUser }: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Search users when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectUser = async (user: User) => {
    setIsLoading(true);
    try {
      // Create or get existing conversation
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: user.id }),
      });

      if (res.ok) {
        const data = await res.json();
        onSelectUser(data.conversationId, user);
        onClose();
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">New Message</h2>
              <p className="text-sm text-white/60">Search for someone to message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
            )}
          </div>
        </div>

        {/* User List */}
        <div className="max-h-[400px] overflow-y-auto">
          {!searchQuery.trim() ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/60">
                Start typing to search for users
              </p>
            </div>
          ) : isSearching ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-purple-400 animate-spin mb-4" />
              <p className="text-white/60">Searching...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/60">
                No users found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">
                      {user.name || "Unnamed User"}
                    </p>
                    <p className="text-sm text-white/60">
                      {user.username ? `@${user.username}` : user.email}
                    </p>
                  </div>
                  {isLoading && (
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <p className="text-xs text-white/40 text-center">
            💡 Tip: You can also start a conversation from a user's profile
          </p>
        </div>
      </div>
    </div>
  );
}
