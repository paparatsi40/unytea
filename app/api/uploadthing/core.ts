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
      maxFileSize: "10MB", // Larger for high-res covers
      maxFileCount: 1 
    } 
  })
    .middleware(async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Community branding upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
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
    video: { maxFileSize: "32MB", maxFileCount: 1 },
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
