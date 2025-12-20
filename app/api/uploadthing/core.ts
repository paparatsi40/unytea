import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getCurrentUserId } from "@/lib/auth-utils";

const f = createUploadthing();

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
      console.log("Avatar upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
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
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
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
        console.log("🖼️ Community branding upload middleware started");
        const userId = await getCurrentUserId();
        console.log("📝 User ID:", userId);
        
        if (!userId) {
          console.error("❌ No user ID found - user not authenticated");
          throw new Error("Unauthorized - Please sign in");
        }
        
        console.log("✅ User authenticated:", userId);
        return { userId };
      } catch (error) {
        console.error("❌ Middleware error:", error);
        throw error;
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Community branding upload complete for userId:", metadata.userId);
      console.log("📁 File URL:", file.url);
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
      console.log("Document upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
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
      console.log("Media upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
