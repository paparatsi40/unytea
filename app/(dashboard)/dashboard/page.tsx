"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  BookOpen,
  Video,
  Calendar,
  TrendingUp,
  Award,
  Plus,
  MessageSquare,
  Heart,
  Share2,
  MoreHorizontal,
  Clock,
  Play,
  CheckCircle,
  CreditCard,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Types
interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    role: string;
    community?: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  isLiked: boolean;
  tags?: string[];
}

interface CourseProgress {
  id: string;
  title: string;
  progress: number;
  imageUrl?: string;
  totalLessons: number;
  completedLessons: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  type: "session" | "live" | "deadline";
  time: string;
  community?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load feed posts
      const postsRes = await fetch("/api/feed/posts");
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }

      // Load course progress
      const coursesRes = await fetch("/api/courses/progress");
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
      }

      // Load upcoming events
      const eventsRes = await fetch("/api/events/upcoming");
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }

      // Load recent achievements
      const achievementsRes = await fetch("/api/achievements/recent");
      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        setAchievements(achievementsData.achievements || []);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent }),
      });

      if (res.ok) {
        setNewPostContent("");
        toast({
          title: "Post created!",
          description: "Your post has been published to the community.",
        });
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      ));
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's what's happening in your communities today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Quick Actions & Navigation */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/communities">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Create Post
                </Button>
              </Link>
              <Link href="/dashboard/courses">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Play className="h-4 w-4" />
                  Continue Learning
                </Button>
              </Link>
              <Link href="/dashboard/messages">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </Button>
              </Link>
              <Link href="/dashboard/sessions">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Video className="h-4 w-4" />
                  Start Session
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Course Progress Widget */}
          {courses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Continue Learning</h3>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {courses.slice(0, 3).map((course) => (
                  <div key={course.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{course.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.completedLessons}/{course.totalLessons} lessons
                        </p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/courses">
                  <Button variant="ghost" size="sm" className="w-full text-primary">
                    View All Courses
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Recent Achievements */}
          {achievements.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Recent Achievements</h3>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.slice(0, 3).map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-lg">
                      {achievement.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/achievements">
                  <Button variant="ghost" size="sm" className="w-full text-primary">
                    View All
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Feed */}
        <div className="space-y-6">
          {/* Create Post */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <textarea
                    placeholder="What's on your mind? Share with your community..."
                    className="w-full p-3 rounded-lg border border-border bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <Button 
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim()}
                      size="sm"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feed Posts */}
          {posts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-4">
                Join communities to see posts from members, or create your own!
              </p>
              <Link href="/dashboard/communities">
                <Button>Explore Communities</Button>
              </Link>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Post Header */}
                  <div className="p-4 flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{post.author.name}</span>
                        <span className="text-muted-foreground text-sm">•</span>
                        <span className="text-muted-foreground text-sm">{post.author.role}</span>
                      </div>
                      {post.author.community && (
                        <p className="text-xs text-primary">{post.author.community}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{post.timestamp}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Post Content */}
                  <div className="px-4 pb-3">
                    <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                    {post.tags && (
                      <div className="flex gap-2 mt-2">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post Image */}
                  {post.image && (
                    <div className="px-4 pb-3">
                      <img
                        src={post.image}
                        alt="Post content"
                        className="rounded-lg w-full object-cover max-h-[400px]"
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="px-4 py-3 border-t border-border flex items-center gap-6">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        post.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <MessageSquare className="h-4 w-4" />
                      <span>{post.comments}</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Share2 className="h-4 w-4" />
                      <span>{post.shares}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right Sidebar - Upcoming & Stats */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          {events.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Upcoming</h3>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.slice(0, 4).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      event.type === "session" ? "bg-blue-100 text-blue-600" :
                      event.type === "live" ? "bg-red-100 text-red-600" :
                      "bg-yellow-100 text-yellow-600"
                    }`}>
                      {event.type === "session" ? <Video className="h-5 w-5" /> :
                       event.type === "live" ? <Play className="h-5 w-5" /> :
                       <Clock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.time}</p>
                      {event.community && (
                        <p className="text-xs text-primary">{event.community}</p>
                      )}
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/sessions">
                  <Button variant="ghost" size="sm" className="w-full text-primary">
                    View Calendar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Trending Communities */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Trending</h3>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                  M
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Marketing Pros</p>
                  <p className="text-xs text-muted-foreground">+124 members this week</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-white font-bold">
                  D
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Design Hub</p>
                  <p className="text-xs text-muted-foreground">+89 members this week</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-white font-bold">
                  T
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Tech Leaders</p>
                  <p className="text-xs text-muted-foreground">+67 members this week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Challenge / Streak */}
          <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Daily Streak</p>
                  <p className="text-2xl font-bold text-primary">5 days 🔥</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete a lesson or post today to keep your streak alive!
              </p>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div
                    key={day}
                    className={`flex-1 h-2 rounded-full ${
                      day <= 5 ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invite Friends */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Grow Your Network</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Invite friends and earn rewards when they join.
              </p>
              <Button variant="outline" className="w-full" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Invite Friends
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
