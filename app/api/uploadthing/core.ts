import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getCurrentUserId } from "@/lib/auth-utils";

// Initialize UploadThing with explicit configuration
const f = createUploadthing({
  errorFormatter: (err) => {
    console.error("📤 UploadThing error:", err);
    return {
      message: err.message,
      code: err.code,
    };
  },
});

export const ourFileRouter = {
  // Avatar uploader for profile pictures
  avatarUploader: f({ 
    image: { 
      maxFileSize: "2MB", // Smaller for avatars
      maxFileCount: 1 
    } 
  })
    .middleware(async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Image uploader for posts, comments, profiles
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Community branding uploader (logos & covers)
  communityBranding: f({ 
    image: { 
      maxFileSize: "8MB", // Larger for high-res covers
      maxFileCount: 1 
    } 
  })
    .middleware(async () => {
      try {
        const userId = await getCurrentUserId();
        
        if (!userId) {
          throw new Error("Unauthorized - Please sign in");
        }
        
        return { userId };
      } catch (error) {
        throw error;
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Document uploader for resources, attachments
  documentUploader: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 3 },
    text: { maxFileSize: "2MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Media uploader for videos, audio (future)
  mediaUploader: f({
    video: { maxFileSize: "16MB", maxFileCount: 1 },
    audio: { maxFileSize: "8MB", maxFileCount: 3 },
  })
    .middleware(async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
