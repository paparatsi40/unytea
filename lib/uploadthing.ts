import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } = 
  generateReactHelpers<OurFileRouter>();

// Re-export components from @uploadthing/react
export { UploadButton, UploadDropzone } from "@uploadthing/react";
