import { generateReactHelpers, generateComponents } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } = 
  generateReactHelpers<OurFileRouter>();

// Generate typed components
export const { UploadButton, UploadDropzone } = 
  generateComponents<OurFileRouter>();
