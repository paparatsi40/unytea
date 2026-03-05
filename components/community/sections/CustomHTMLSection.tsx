"use client";

interface CustomHTMLSectionProps {
  title?: string;
  content: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function CustomHTMLSection({
  title,
  content,
  theme,
}: CustomHTMLSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  return (
    <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      {title && (
        <h2 
          className="text-2xl font-bold mb-6"
          style={{ color: primaryColor }}
        >
          {title}
        </h2>
      )}

      {/* Custom HTML Content */}
      <div 
        className="custom-html-content prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      <style jsx global>{`
        .custom-html-content {
          color: #374151;
        }
        .custom-html-content h1,
        .custom-html-content h2,
        .custom-html-content h3 {
          color: ${primaryColor};
        }
        .custom-html-content a {
          color: ${primaryColor};
          text-decoration: underline;
        }
        .custom-html-content a:hover {
          opacity: 0.8;
        }
      `}</style>
    </section>
  );
}