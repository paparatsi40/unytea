import { 
  Users, 
  TrendingUp, 
  Video, 
  MessageSquare,
  ArrowUpRight,
  Calendar,
} from "lucide-react";

export default function DashboardPage() {
  // TODO: Fetch real data from database
  const stats = [
    {
      name: "Total Members",
      value: "2,543",
      change: "+12.5%",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "Active Communities",
      value: "8",
      change: "+2",
      icon: MessageSquare,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      name: "Video Sessions",
      value: "47",
      change: "+8.2%",
      icon: Video,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      name: "Growth Rate",
      value: "23.8%",
      change: "+4.3%",
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  const upcomingSessions = [
    {
      id: 1,
      title: "1-on-1 Mentoring Session",
      mentee: "John Doe",
      time: "Today, 2:00 PM",
      avatar: "https://avatar.vercel.sh/john",
    },
    {
      id: 2,
      title: "Group Coaching Call",
      mentee: "Sarah Smith",
      time: "Tomorrow, 10:00 AM",
      avatar: "https://avatar.vercel.sh/sarah",
    },
    {
      id: 3,
      title: "Strategy Session",
      mentee: "Mike Johnson",
      time: "Dec 15, 3:30 PM",
      avatar: "https://avatar.vercel.sh/mike",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's what's happening with your communities today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <div className="mt-2 flex items-center text-sm">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="ml-1 font-medium text-green-500">
                      {stat.change}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      vs last month
                    </span>
                  </div>
                </div>
                <div className={`rounded-full p-3 ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Upcoming Sessions
            </h2>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-6 space-y-4">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center space-x-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
              >
                <img
                  src={session.avatar}
                  alt={session.mentee}
                  className="h-12 w-12 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    {session.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    with {session.mentee}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">
                    {session.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20">
            View All Sessions
          </button>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Activity
            </h2>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">John Doe</span> joined your
                  community
                </p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                <MessageSquare className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  New post in <span className="font-semibold">General</span>
                </p>
                <p className="text-xs text-muted-foreground">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                <Video className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  Session completed with{" "}
                  <span className="font-semibold">Sarah Smith</span>
                </p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
