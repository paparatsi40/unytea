"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Trash2, Copy, Save, Eye, X, Sparkles } from "lucide-react";
import { SectionInstance, SectionType, FieldDef } from "./types";
import { SECTIONS, SECTION_ORDER } from "./sections";
import { HeroRender } from "./sections/Hero";
import { FeaturesRender } from "./sections/Features";
import { CTARender } from "./sections/CTA";
import { TestimonialsRender } from "./sections/Testimonials";
import { FAQRender } from "./sections/FAQ";
import { StatsRender } from "./sections/Stats";
import { OwnerBioRender } from "./sections/OwnerBio";
import { GalleryRender } from "./sections/Gallery";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Button } from "@/components/ui/button";
import { generateCommunityFAQs } from "@/app/actions/ai-content";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

/** ========== Utils ========== */

const uid = () => `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** ========== Section Renderer ========== */

function renderSection(section: SectionInstance, t: ReturnType<typeof useTranslations>) {
  switch (section.type) {
    case "hero":
      return <HeroRender {...section.props} />;
    case "features":
      return <FeaturesRender {...section.props} />;
    case "cta":
      return <CTARender {...section.props} />;
    case "testimonials":
      return <TestimonialsRender {...section.props} />;
    case "faq":
      return <FAQRender {...section.props} />;
    case "stats":
      return <StatsRender {...section.props} />;
    case "ownerBio":
      return <OwnerBioRender {...section.props} />;
    case "gallery":
      return <GalleryRender {...section.props} />;
    case "pricing":
      return <div className="p-8 text-center text-gray-500">{t("common.comingSoon")}</div>;
    case "video":
      return <div className="p-8 text-center text-gray-500">{t("common.comingSoon")}</div>;
    default:
      return <div className="p-8 text-center text-gray-500">{t("sectionBuilder.unknownSection")}</div>;
  }
}

/** ========== Main Component ========== */

interface SectionBuilderProps {
  initialSections?: SectionInstance[];
  onSave?: (sections: SectionInstance[]) => Promise<void>;
  communityName?: string;
  communityDescription?: string | null;
}

export function SectionBuilder({ 
  initialSections = [], 
  onSave,
  communityName,
  communityDescription
}: SectionBuilderProps) {
  const t = useTranslations();
  const [sections, setSections] = useState<SectionInstance[]>(initialSections);

  // Sync sections when initialSections changes (e.g., after loading from API)
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Update selectedId when sections change
  useEffect(() => {
    if (sections.length > 0 && !sections.find((s) => s.id === selectedId)) {
      setSelectedId(sections[0].id);
    } else if (sections.length === 0) {
      setSelectedId(null);
    }
  }, [sections, selectedId]);

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) || null,
    [sections, selectedId]
  );

  const addSection = (type: SectionType) => {
    const schema = SECTIONS[type];
    const inst: SectionInstance = {
      id: uid(),
      type,
      props: deepClone(schema.defaultProps),
    };
    setSections((prev) => [...prev, inst]);
    setSelectedId(inst.id);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const duplicateSection = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;

    const duplicate: SectionInstance = {
      id: uid(),
      type: section.type,
      props: deepClone(section.props),
    };

    const index = sections.findIndex((s) => s.id === id);
    const newSections = [...sections];
    newSections.splice(index + 1, 0, duplicate);
    setSections(newSections);
    setSelectedId(duplicate.id);
  };

  const move = (id: string, dir: -1 | 1) => {
    setSections((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i === -1) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(i, 1);
      copy.splice(j, 0, item);
      return copy;
    });
  };

  const updateProps = useCallback((id: string, updates: Record<string, any>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, props: { ...s.props, ...updates } } : s
      )
    );
  }, []);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(sections);
    } catch (error) {
      console.error("Error saving sections:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[800px] gap-4">
      {/* LEFT: Palette */}
      <aside className="w-72 shrink-0 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold">{t("sectionBuilder.sections")}</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              className="h-8"
            >
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </Button>
            {onSave && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-8"
              >
                {saving ? (
                  <>
                    <Save className="mr-1 h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1 h-3 w-3" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {SECTION_ORDER.map((type) => {
            const schema = SECTIONS[type];
            return (
              <button
                key={type}
                onClick={() => addSection(type)}
                className="group w-full rounded-lg border-2 border-dashed border-border bg-muted/50 p-3 text-left text-xs transition-colors hover:border-primary hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{schema.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{schema.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {schema.description}
                    </div>
                  </div>
                  <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    +
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Layers */}
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="mb-2 text-xs font-bold">
            LAYERS ({sections.length})
          </h4>
          <div className="space-y-1">
            {sections.map((s, idx) => {
              const schema = SECTIONS[s.type];
              return (
                <div
                  key={s.id}
                  className={[
                    "flex items-center gap-1 rounded p-2 text-xs transition-colors",
                    selectedId === s.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  ].join(" ")}
                >
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className="flex-1 truncate text-left"
                  >
                    <span className="mr-1">{schema.icon}</span>
                    {schema.label} #{idx + 1}
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button
                      className="rounded p-0.5 hover:bg-black/10"
                      onClick={() => move(s.id, -1)}
                      title="Move up"
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded p-0.5 hover:bg-black/10"
                      onClick={() => move(s.id, 1)}
                      title={t("common.moveDown")}
                      disabled={idx === sections.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded p-0.5 hover:bg-black/10"
                      onClick={() => duplicateSection(s.id)}
                      title={t("common.duplicate")}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded p-0.5 hover:bg-black/10"
                      onClick={() => removeSection(s.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* CENTER: Preview */}
      <main className="flex-1 overflow-y-auto rounded-2xl border border-border bg-gray-50 p-4">
        {/* Preview Header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Live Preview</span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
              {sections.length} sections
            </span>
          </div>
          <span className="text-xs text-gray-400">
            Click any section to edit
          </span>
        </div>

        <div 
          className="mx-auto max-w-5xl origin-top scale-[0.85] transform"
          style={{ width: '117.65%' }} // Compensate scale: 100/0.85 = 117.65%
        >
          {sections.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-white p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Add sections from the left panel to build your landing page
              </p>
            </div>
          )}
          {sections.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={[
                "cursor-pointer transition-all",
                selectedId === s.id
                  ? "ring-4 ring-primary ring-offset-2"
                  : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-2",
              ].join(" ")}
            >
              {renderSection(s, t)}
            </div>
          ))}
        </div>
      </main>

      {/* RIGHT: Properties */}
      <aside className="w-80 shrink-0 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-bold">{t("sectionBuilder.properties")}</h3>

        {!selected && (
          <p className="text-xs text-muted-foreground">
            {t("sectionBuilder.selectSection")}
          </p>
        )}

        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{SECTIONS[selected.type].icon}</span>
                <div>
                  <div className="text-sm font-semibold">
                    {SECTIONS[selected.type].label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {SECTIONS[selected.type].description}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Generate Button for FAQ */}
            {selected.type === "faq" && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!communityName) {
                    toast.error("Community name is required to generate FAQs");
                    return;
                  }
                  setGeneratingAI(true);
                  try {
                    const faqs = await generateCommunityFAQs(communityName, communityDescription ?? null);
                    const updates: Record<string, string> = {};
                    faqs.forEach((faq, i) => {
                      updates[`q${i + 1}`] = faq.q;
                      updates[`a${i + 1}`] = faq.a;
                    });
                    updateProps(selected.id, updates);
                    toast.success("FAQs generated with AI!");
                  } catch {
                    toast.error("Failed to generate FAQs");
                  } finally {
                    setGeneratingAI(false);
                  }
                }}
                disabled={generatingAI}
                className="w-full"
              >
                {generatingAI ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            )}

            {SECTIONS[selected.type].fields.map((field: FieldDef) => {
              const value = selected.props[field.key] ?? "";

              const handleChange = (val: string) => {
                // Handle CSV fields for arrays
                if (field.key === "itemsCsv") {
                  const arr = val
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  updateProps(selected.id, { items: arr, itemsCsv: val });
                } else {
                  updateProps(selected.id, { [field.key]: val });
                }
              };

              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {field.label}
                  </label>

                  {field.kind === "textarea" ? (
                    <textarea
                      value={value}
                      onChange={(e) => handleChange(e.target.value)}
                      placeholder={field.placeholder}
                      className="min-h-[80px] w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : field.kind === "image" ? (
                    <ImageUploader
                      value={value}
                      onChange={(url) => handleChange(url)}
                      onRemove={() => handleChange("")}
                    />
                  ) : field.kind === "select" && field.options ? (
                    <select
                      value={value}
                      onChange={(e) => handleChange(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.kind === "url" ? "url" : field.kind === "number" ? "number" : "text"}
                      value={value}
                      onChange={(e) => handleChange(e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Preview</h2>
                <p className="text-sm text-gray-500">
                  This is how your landing page will look ({sections.length} sections)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                  Unsaved Preview
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
              <div className="mx-auto max-w-5xl space-y-8">
                {sections.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                    <p className="text-gray-500">
                      No sections added yet. Add sections from the builder to see preview.
                    </p>
                  </div>
                ) : (
                  sections.map((s) => (
                    <div key={s.id}>
                      {renderSection(s, t)}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-sm text-gray-500">
                Changes are not saved until you click "Save" in the builder
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Close Preview
                </Button>
                {onSave && (
                  <Button
                    onClick={async () => {
                      await handleSave();
                      setShowPreview(false);
                    }}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save & Close"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
