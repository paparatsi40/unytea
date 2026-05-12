"use client";

import { SectionSchema } from "../types";

export const GalleryRender = (props: Record<string, any>) => {
  const { title, image1, image2, image3, image4, image5, image6 } = props;
  
  const images = [image1, image2, image3, image4, image5, image6].filter(Boolean);
  
  return (
    <section className="rounded-2xl border border-border bg-white p-8 md:p-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
          {title || "Gallery"}
        </h2>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((url, i) => (
          <div key={i} className="group relative aspect-video overflow-hidden rounded-xl bg-gray-100 shadow-lg">
            <img
              src={url}
              alt={`Gallery image ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ))}
        
        {images.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400">
            <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>Add images to showcase your community</p>
          </div>
        )}
      </div>
    </section>
  );
};

export const GallerySchema: SectionSchema = {
  type: "gallery",
  label: "Gallery",
  description: "Showcase images from your community",
  icon: "🖼️",
  defaultProps: {
    title: "A Glimpse Inside",
    image1: "",
    image2: "",
    image3: "",
    image4: "",
    image5: "",
    image6: "",
  },
  fields: [
    { key: "title", label: "Title", kind: "text", placeholder: "Gallery" },
    { key: "image1", label: "Image 1 (URL)", kind: "image", placeholder: "https://..." },
    { key: "image2", label: "Image 2 (URL)", kind: "image", placeholder: "https://..." },
    { key: "image3", label: "Image 3 (URL)", kind: "image", placeholder: "https://..." },
    { key: "image4", label: "Image 4 (URL)", kind: "image", placeholder: "https://..." },
    { key: "image5", label: "Image 5 (URL)", kind: "image", placeholder: "https://..." },
    { key: "image6", label: "Image 6 (URL)", kind: "image", placeholder: "https://..." },
  ],
  Render: GalleryRender,
};
