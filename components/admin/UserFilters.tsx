"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent } from "react";

export function UserFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const search = searchParams?.get("search") || "";
  const roleFilter = searchParams?.get("role") || "all";

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchValue = formData.get("search") as string;
    
    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);
    if (roleFilter !== "all") params.set("role", roleFilter);
    
    router.push(`/dashboard/admin/users?${params.toString()}`);
  };

  const handleRoleChange = (newRole: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (newRole !== "all") params.set("role", newRole);
    
    router.push(`/dashboard/admin/users?${params.toString()}`);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[300px]">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                name="search"
                placeholder="Search by name, email, or username..."
                defaultValue={search}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="MODERATOR">Moderator</option>
            <option value="USER">User</option>
          </select>
        </div>
      </div>
    </div>
  );
}
