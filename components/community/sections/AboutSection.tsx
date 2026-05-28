"use client";

interface AboutSectionProps {
  title?: string;
  content: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function AboutSection({
  title = "About This Community",
  content,
  theme,
}: AboutSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      {/* Title */}
      <h2 className="mb-6 text-3xl font-bold" style={{ color: primaryColor }}>
        {title}
      </h2>

      {/* Content */}
      <div
        className="prose prose-lg max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}
