"use client";

// Community Feed - Main social feed for community engagement

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  FileText,
  Pin,
  Sparkles,
  TrendingUp,
  Clock,
  Hash,
  Send,
  Trophy,
  Calendar,
  Users,
  Play,
  Mic,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  createdAt: string;
  likes: number;
  comments: number;
  isPinned?: boolean;
  category?: "update" | "gem" | "fun" | "discussion";
  attachments?: Array<{
    type: "image" | "video" | "document";
    url: string;
    name?: string;
  }>;
}

interface LiveSession {
  id: string;
  title: string;
  host: {
    name: string;
    image: string | null;
  };
  scheduledAt: string;
  attendees: number;
  isLive: boolean;
}

const categoryConfig = {
  update: { label: "Update", color: "bg-blue-500", icon: Clock },
  gem: { label: "Gem", color: "bg-amber-500", icon: Sparkles },
  fun: { label: "Fun", color: "bg-pink-500", icon: TrendingUp },
  discussion: { label: "Discussion", color: "bg-purple-500", icon: MessageCircle },
};

// Mock data - replace with actual API calls
const mockPosts: Post[] = [
  {
    id: "1",
    content: "Just launched our new course module! 🚀 Check out the Library for the updated content. Would love to hear your thoughts!",
    author: {
      id: "1",
      name: "Sarah Chen",
      image: null,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    likes: 24,
    comments: 8,
    isPinned: true,
    category: "update",
  },
  {
    id: "2",
    content: "Here's a gem I found today: The key to community growth isn't just content—it's genuine connections. Reply with your biggest win this week! 💎",
    author: {
      id: "2",
      name: "Alex Rivera",
      image: null,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    likes: 47,
    comments: 23,
    category: "gem",
  },
  {
    id: "3",
    content: "Who's ready for tonight's live Q&A? Drop your questions below! 🎥",
    author: {
      id: "1",
      name: "Sarah Chen",
      image: null,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    likes: 18,
    comments: 12,
    category: "discussion",
  },
];

const mockLiveSessions: LiveSession[] = [
  {
    id: "1",
    title: "Weekly Community Q&A",
    host: { name: "Sarah Chen", image: null },
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours from now
    attendees: 47,
    isLive: false,
  },
  {
    id: "2",
    title: "Live Coaching Session",
    host: { name: "Alex Rivera", image: null },
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
    attendees: 128,
    isLive: false,
  },
];

export default function CommunityFeedPage() {
  // const params = useParams();
  // const _slug = params?.slug as string; // Available for future API calls
  // TODO: Use slug for API calls when backend is ready
  const { user } = useCurrentUser();
  
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [liveSessions] = useState<LiveSession[]>(mockLiveSessions);
  const [activeFilter, setActiveFilter] = useState<"all" | "updates" | "gems" | "fun" | "discussion">("all");
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Post["category"]>("discussion");

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    
    setIsPosting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newPost: Post = {
      id: Date.now().toString(),
      content: newPostContent,
      author: {
        id: user?.id || "unknown",
        name: user?.name || "You",
        image: user?.image || null,
      },
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
      category: selectedCategory,
    };
    
    setPosts([newPost, ...posts]);
    setNewPostContent("");
    setIsPosting(false);
    toast.success("Post created!");
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  const filteredPosts = posts.filter(post => {
    if (activeFilter === "all") return true;
    if (activeFilter === "updates") return post.category === "update";
    if (activeFilter === "gems") return post.category === "gem";
    if (activeFilter === "fun") return post.category === "fun";
    if (activeFilter === "discussion") return post.category === "discussion";
    return true;
  });

  // Sort: pinned first, then by date
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR - Navigation & Stats */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            {/* Create Post Card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500 mb-3">Create post</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={() => setSelectedCategory("discussion")}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Text
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Photo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <h3 className="font-semibold text-sm">Filters</h3>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1">
                  {[
                    { id: "all", label: "All Posts", icon: Hash },
                    { id: "updates", label: "Updates", icon: Clock, color: "text-blue-500" },
                    { id: "gems", label: "Gems", icon: Sparkles, color: "text-amber-500" },
                    { id: "fun", label: "Fun", icon: TrendingUp, color: "text-pink-500" },
                    { id: "discussion", label: "Discussion", icon: MessageCircle, color: "text-purple-500" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeFilter === filter.id
                          ? "bg-purple-50 text-purple-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <filter.icon className={`w-4 h-4 ${filter.color || ""}`} />
                      {filter.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5" />
                  <span className="font-semibold">Top Contributors</span>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Alex R.", points: 2450 },
                    { name: "Sarah C.", points: 1890 },
                    { name: "Mike T.", points: 1340 },
                  ].map((user, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="flex-1">{user.name}</span>
                      <span className="text-white/80">{user.points} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MAIN FEED */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* MOBILE FILTER TABS */}
            <div className="lg:hidden">
              <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="updates">Updates</TabsTrigger>
                  <TabsTrigger value="gems">Gems</TabsTrigger>
                  <TabsTrigger value="fun">Fun</TabsTrigger>
                  <TabsTrigger value="discussion">Chat</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* CREATE POST - Main Composer */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="relative">
                      <Input
                        placeholder="Share something with the community..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="pr-20 py-3 h-auto min-h-[80px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.metaKey) {
                            handleCreatePost();
                          }
                        }}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                        {newPostContent.length}/500
                      </div>
                    </div>
                    
                    {/* Category Selector */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-gray-500">Post as:</span>
                      <div className="flex gap-1">
                        {Object.entries(categoryConfig).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => setSelectedCategory(key as Post["category"])}
                            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                              selectedCategory === key
                                ? `${config.color} text-white`
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
                          <ImageIcon className="w-4 h-4" />
                          <span className="hidden sm:inline">Photo</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
                          <Video className="w-4 h-4" />
                          <span className="hidden sm:inline">Video</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
                          <FileText className="w-4 h-4" />
                          <span className="hidden sm:inline">Document</span>
                        </Button>
                      </div>
                      <Button 
                        onClick={handleCreatePost}
                        disabled={!newPostContent.trim() || isPosting}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 gap-2"
                      >
                        {isPosting ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* POSTS FEED */}
            <AnimatePresence mode="popLayout">
              {sortedPosts.map((post, index) => {
                const category = post.category ? categoryConfig[post.category] : null;
                
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`border-0 shadow-sm ${post.isPinned ? "ring-2 ring-purple-200" : ""}`}>
                      <CardContent className="p-4">
                        {/* Pinned Badge */}
                        {post.isPinned && (
                          <div className="flex items-center gap-2 mb-3 text-purple-600">
                            <Pin className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">Pinned</span>
                          </div>
                        )}

                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={post.author.image || undefined} />
                              <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{post.author.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {category && (
                              <Badge className={`${category.color} text-white text-xs`}>
                                {category.label}
                              </Badge>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-gray-800 whitespace-pre-wrap mb-4">{post.content}</p>

                        {/* Attachments */}
                        {post.attachments && post.attachments.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {post.attachments.map((att, i) => (
                              <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                {att.type === "image" && (
                                  <img src={att.url} alt="" className="w-full h-full object-cover" />
                                )}
                                {att.type === "video" && (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                    <Play className="w-8 h-8 text-white" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-4 pt-3 border-t">
                          <button
                            onClick={() => handleLike(post.id)}
                            className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <Heart className={`w-4 h-4 ${post.likes > 0 ? "fill-current" : ""}`} />
                            <span className="text-sm">{post.likes}</span>
                          </button>
                          
                          <button className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm">{post.comments}</span>
                          </button>
                          
                          <button className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors ml-auto">
                            <Share2 className="w-4 h-4" />
                            <span className="text-sm hidden sm:inline">Share</span>
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty State */}
            {sortedPosts.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Hash className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
                  <p className="text-gray-500 text-sm">
                    Be the first to share something with the community!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT SIDEBAR - Live Sessions & Activity */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            
            {/* UPCOMING LIVE SESSIONS */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Live Sessions</h3>
                    <p className="text-xs text-gray-500">Upcoming events</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {liveSessions.map((session) => (
                    <div 
                      key={session.id} 
                      className="group p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{session.title}</h4>
                          <p className="text-xs text-gray-500">with {session.host.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDistanceToNow(new Date(session.scheduledAt), { addSuffix: true })}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          <Users className="w-3 h-3 inline mr-1" />
                          {session.attendees} attending
                        </span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          Remind me
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button className="w-full mt-3 gap-2" variant="outline">
                  <Calendar className="w-4 h-4" />
                  View all events
                </Button>
              </CardContent>
            </Card>

            {/* START LIVE NOW */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-600 to-pink-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Go Live</h3>
                    <p className="text-xs text-white/80">Start a session now</p>
                  </div>
                </div>
                <Button className="w-full bg-white text-purple-600 hover:bg-white/90">
                  <Play className="w-4 h-4 mr-2" />
                  Start Live Session
                </Button>
              </CardContent>
            </Card>

            {/* TRENDING TOPICS */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <h3 className="font-semibold text-sm">Trending Topics</h3>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  {["#communitygrowth", "#livecoaching", "#casestudies", "#qanda", "#resources"].map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-purple-100 transition-colors">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
