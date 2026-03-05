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
    <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      {/* Title */}
      <h2 
        className="text-3xl font-bold mb-6"
        style={{ color: primaryColor }}
      >
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