"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Eye, 
  EyeOff, 
  Settings, 
  Save,
  Loader2,
  LayoutGrid,
  Type,
  Image as ImageIcon,
  Video,
  Users,
  MessageSquare,
  Award,
  Calendar,
  BookOpen,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Available section types
const SECTION_TYPES = [
  {
    id: "hero",
    name: "Hero Section",
    icon: LayoutGrid,
    description: "Large header with title, subtitle, and CTA",
    defaultContent: {
      title: "Welcome to Our Community",
      subtitle: "Join thousands of members learning and growing together",
      ctaText: "Get Started",
      ctaLink: "#"
    }
  },
  {
    id: "about",
    name: "About Section",
    icon: Type,
    description: "Rich text content area",
    defaultContent: {
      title: "About Us",
      content: "Share your community's story and mission..."
    }
  },
  {
    id: "features",
    name: "Features Grid",
    icon: LayoutGrid,
    description: "Showcase features with icons",
    defaultContent: {
      title: "What You'll Get",
      features: [
        { icon: "🎯", title: "Feature 1", description: "Description here" },
        { icon: "✨", title: "Feature 2", description: "Description here" },
        { icon: "🚀", title: "Feature 3", description: "Description here" }
      ]
    }
  },
  {
    id: "testimonials",
    name: "Testimonials",
    icon: MessageSquare,
    description: "Member reviews and testimonials",
    defaultContent: {
      title: "What Members Say",
      testimonials: [
        { name: "John Doe", role: "Member", content: "Amazing community!", avatar: "" }
      ]
    }
  },
  {
    id: "gallery",
    name: "Image Gallery",
    icon: ImageIcon,
    description: "Photo gallery grid",
    defaultContent: {
      title: "Gallery",
      images: []
    }
  },
  {
    id: "video",
    name: "Video Section",
    icon: Video,
    description: "Embed videos from YouTube, Vimeo, etc.",
    defaultContent: {
      title: "Watch Our Story",
      videoUrl: ""
    }
  },
  {
    id: "members",
    name: "Members Showcase",
    icon: Users,
    description: "Display featured members",
    defaultContent: {
      title: "Meet Our Community",
      limit: 12
    }
  },
  {
    id: "courses",
    name: "Courses Grid",
    icon: BookOpen,
    description: "Show available courses",
    defaultContent: {
      title: "Featured Courses",
      limit: 6
    }
  },
  {
    id: "faq",
    name: "FAQ Accordion",
    icon: MessageSquare,
    description: "Frequently asked questions",
    defaultContent: {
      title: "FAQ",
      questions: [
        { q: "Question 1?", a: "Answer here" }
      ]
    }
  },
  {
    id: "cta",
    name: "Call to Action",
    icon: Sparkles,
    description: "Action-focused section",
    defaultContent: {
      title: "Ready to Join?",
      subtitle: "Become a member today",
      buttonText: "Join Now",
      buttonLink: "#"
    }
  },
  {
    id: "stats",
    name: "Stats Counter",
    icon: Award,
    description: "Display key metrics",
    defaultContent: {
      stats: [
        { label: "Members", value: "1000+" },
        { label: "Courses", value: "50+" },
        { label: "Success Rate", value: "98%" }
      ]
    }
  },
  {
    id: "calendar",
    name: "Events Calendar",
    icon: Calendar,
    description: "Upcoming events",
    defaultContent: {
      title: "Upcoming Events",
      limit: 5
    }
  }
];

type Section = {
  id: string;
  type: string;
  content: any;
  visible: boolean;
  order: number;
};

export default function SectionsManagerPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [sections, setSections] = useState<Section[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load sections from API
  useEffect(() => {
    loadSections();
  }, [slug]);

  const loadSections = async () => {
    try {
      setIsLoading(true);
      // TODO: Fetch from API
      // const response = await fetch(`/api/communities/${slug}/sections`);
      // const data = await response.json();
      // setSections(data);
      
      // Mock data for now
      setSections([
        {
          id: "1",
          type: "hero",
          content: SECTION_TYPES[0].defaultContent,
          visible: true,
          order: 0
        }
      ]);
    } catch (error) {
      toast.error("Failed to load sections");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property
    const updatedSections = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setSections(updatedSections);
    toast.success("Section reordered");
  };

  const addSection = (typeId: string) => {
    const sectionType = SECTION_TYPES.find(t => t.id === typeId);
    if (!sectionType) return;

    const newSection: Section = {
      id: `section-${Date.now()}`,
      type: typeId,
      content: sectionType.defaultContent,
      visible: true,
      order: sections.length
    };

    setSections([...sections, newSection]);
    setShowLibrary(false);
    toast.success(`${sectionType.name} added!`);
  };

  const toggleVisibility = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    ));
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
    toast.success("Section deleted");
  };

  const saveSections = async () => {
    try {
      setIsSaving(true);
      // TODO: Save to API
      // await fetch(`/api/communities/${slug}/sections`, {
      //   method: 'PUT',
      //   body: JSON.stringify(sections)
      // });
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      toast.success("Sections saved successfully!");
    } catch (error) {
      toast.error("Failed to save sections");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Section Manager</h1>
          <p className="mt-1 text-muted-foreground">
            Build your community page with drag & drop
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowLibrary(!showLibrary)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
          <Button
            onClick={saveSections}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Section Library Modal */}
      {showLibrary && (
        <div className="rounded-2xl border-2 border-primary/50 bg-card p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Section Library</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLibrary(false)}
            >
              Close
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTION_TYPES.map((sectionType) => {
              const Icon = sectionType.icon;
              return (
                <button
                  key={sectionType.id}
                  onClick={() => addSection(sectionType.id)}
                  className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-background p-4 text-left transition-all hover:scale-105 hover:border-primary hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{sectionType.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {sectionType.description}
                    </p>
                  </div>
                  <div className="mt-auto flex w-full items-center justify-between">
                    <span className="text-xs text-primary">Click to add</span>
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-12">
            <LayoutGrid className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">No sections yet</h3>
            <p className="mb-6 text-center text-muted-foreground">
              Start building your community page by adding sections
            </p>
            <Button onClick={() => setShowLibrary(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Section
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {sections.map((section, index) => {
                    const sectionType = SECTION_TYPES.find(t => t.type === section.type);
                    const Icon = sectionType?.icon || LayoutGrid;

                    return (
                      <Draggable
                        key={section.id}
                        draggableId={section.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`rounded-xl border-2 bg-card p-4 transition-all ${
                              snapshot.isDragging
                                ? "border-primary shadow-2xl"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-6 w-6 text-muted-foreground" />
                              </div>

                              {/* Icon */}
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>

                              {/* Info */}
                              <div className="flex-1">
                                <h3 className="font-semibold">
                                  {sectionType?.name || "Unknown Section"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {sectionType?.description}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleVisibility(section.id)}
                                >
                                  {section.visible ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingSection(section.id)}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSection(section.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Edit Panel */}
                            {editingSection === section.id && (
                              <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
                                <p className="text-sm text-muted-foreground">
                                  Section editor coming soon...
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="mb-2 font-semibold text-blue-900">💡 Tips</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Drag sections to reorder them</li>
          <li>• Use the eye icon to show/hide sections</li>
          <li>• Click the gear icon to edit section content</li>
          <li>• Don't forget to save your changes!</li>
        </ul>
      </div>
    </div>
  );
}
