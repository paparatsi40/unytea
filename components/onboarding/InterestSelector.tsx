"use client";

import { useState } from "react";
import { Check } from "lucide-react";

const INTEREST_CATEGORIES = [
  {
    label: "Business",
    items: [
      "Marketing",
      "Sales",
      "Entrepreneurship",
      "Finance",
      "Leadership",
      "Product Management",
    ],
  },
  {
    label: "Technology",
    items: [
      "Web Development",
      "AI/ML",
      "Design",
      "Data Science",
      "Mobile Dev",
      "DevOps",
    ],
  },
  {
    label: "Creative",
    items: [
      "Writing",
      "Photography",
      "Video Production",
      "Music",
      "Graphic Design",
      "Animation",
    ],
  },
  {
    label: "Lifestyle",
    items: [
      "Fitness",
      "Mindfulness",
      "Cooking",
      "Travel",
      "Personal Finance",
      "Languages",
    ],
  },
  {
    label: "Education",
    items: [
      "Teaching",
      "Coaching",
      "Mentoring",
      "Research",
      "Public Speaking",
      "Curriculum Design",
    ],
  },
];

interface InterestSelectorProps {
  selected: string[];
  onChange: (interests: string[]) => void;
  maxSelections?: number;
}

export function InterestSelector({
  selected,
  onChange,
  maxSelections = 8,
}: InterestSelectorProps) {
  const [search, setSearch] = useState("");

  const toggleInterest = (interest: string) => {
    if (selected.includes(interest)) {
      onChange(selected.filter((i) => i !== interest));
    } else if (selected.length < maxSelections) {
      onChange([...selected, interest]);
    }
  };

  const filteredCategories = search
    ? INTEREST_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter((i) =>
          i.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.items.length > 0)
    : INTEREST_CATEGORIES;

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search interests..."
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
      />

      <p className="text-xs text-zinc-500">
        Select up to {maxSelections} interests ({selected.length}/{maxSelections})
      </p>

      <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
        {filteredCategories.map((category) => (
          <div key={category.label}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              {category.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {category.items.map((interest) => {
                const isSelected = selected.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    disabled={!isSelected && selected.length >= maxSelections}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 disabled:opacity-30"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
