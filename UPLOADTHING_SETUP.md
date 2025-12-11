# 🖼️ UploadThing Setup Guide

UploadThing is configured for avatar uploads and file management in Unytea.

---

## 🚀 Quick Start

### 1. Create UploadThing Account

1. Go to [uploadthing.com](https://uploadthing.com)
2. Sign up with GitHub or email
3. Create a new app
4. Copy your API keys

### 2. Add Environment Variables

Add to your `.env.local`:

```env
UPLOADTHING_SECRET=sk_live_xxxxx
UPLOADTHING_APP_ID=your_app_id
```

### 3. Test Upload

1. Go to `/dashboard/settings/profile`
2. Click "Choose File" under Profile Picture
3. Upload an image (JPG, PNG, GIF - max 2MB)
4. Avatar should update immediately

---

## 📁 File Routers Configured

### Avatar Uploader

- **Endpoint:** `avatarUploader`
- **File Types:** Images (JPG, PNG, GIF)
- **Max Size:** 2MB
- **Max Files:** 1
- **Usage:** Profile pictures

### Image Uploader

- **Endpoint:** `imageUploader`
- **File Types:** Images
- **Max Size:** 4MB
- **Max Files:** 5
- **Usage:** Posts, comments, general images

### Community Branding

- **Endpoint:** `communityBranding`
- **File Types:** Images
- **Max Size:** 10MB
- **Max Files:** 1
- **Usage:** Community logos and covers

### Document Uploader

- **Endpoint:** `documentUploader`
- **File Types:** PDF, Text files
- **Max Size:** 8MB (PDF), 2MB (text)
- **Max Files:** 3 (PDF), 5 (text)
- **Usage:** Resources, attachments

### Media Uploader

- **Endpoint:** `mediaUploader`
- **File Types:** Video, Audio
- **Max Size:** 32MB (video), 8MB (audio)
- **Max Files:** 1 (video), 3 (audio)
- **Usage:** Video/audio content

---

## 🔧 How It Works

### Client Side (`AvatarUpload.tsx`)

```typescript
<UploadButton
  endpoint="avatarUploader"
  onClientUploadComplete={(res) => {
    // File uploaded to UploadThing
    // Update database with new URL
  }}
  onUploadError={(error) => {
    // Handle error
  }}
/>
```

### Server Side (`api/uploadthing/core.ts`)

```typescript
avatarUploader: f({ image: { maxFileSize: "2MB" } })
  .middleware(async () => {
    // Authenticate user
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");
    return { userId };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    // File is uploaded, URL is available
    console.log("File URL:", file.url);
  })
```

### Database Update (`api/user/update-avatar/route.ts`)

```typescript
await prisma.user.update({
  where: { id: session.user.id },
  data: { image: imageUrl },
});
```

---

## 💰 Pricing

**Free Tier:**

- 2GB storage
- 100GB bandwidth/month
- Perfect for development

**Pro Tier ($20/month):**

- 100GB storage
- 1TB bandwidth
- Custom domains
- Advanced features

---

## 🎨 Customization

### Custom Styling

The `AvatarUpload` component uses Tailwind for custom styling:

```typescript
appearance={{
  button: "bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all",
  container: "flex flex-col gap-2",
  allowedContent: "text-sm text-gray-500",
}}
```

### Custom Upload Handlers

You can add custom logic after upload:

```typescript
const handleUploadComplete = async (url: string) => {
  // Update database
  await updateAvatar(url);
  
  // Show notification
  toast.success("Avatar updated!");
  
  // Refresh UI
  router.refresh();
};
```

---

## 🐛 Troubleshooting

### "Unauthorized" Error

- Make sure you're logged in
- Check that `getCurrentUserId()` is working
- Verify session is valid

### Upload Fails

- Check file size (max 2MB for avatars)
- Verify file type (JPG, PNG, GIF only)
- Check UploadThing API keys in `.env.local`

### Image Not Displaying

- Verify URL is saved in database
- Check image is accessible (try opening URL in browser)
- Clear browser cache

### CORS Errors

- UploadThing handles CORS automatically
- If issues persist, check UploadThing dashboard settings

---

## 🔒 Security

### Authenticated Uploads

All uploads require authentication via middleware:

```typescript
.middleware(async () => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");
  return { userId };
})
```

### File Validation

- File type validation (server-side)
- File size limits enforced
- Malicious file detection by UploadThing

### URL Security

- Files served via CDN
- HTTPS only
- No direct file system access

---

## 📚 Resources

- [UploadThing Docs](https://docs.uploadthing.com)
- [Next.js Integration](https://docs.uploadthing.com/getting-started/appdir)
- [API Reference](https://docs.uploadthing.com/api-reference)
- [Examples](https://github.com/pingdotgg/uploadthing/tree/main/examples)

---

## ✅ Current Implementation Status

```
✅ UploadThing installed and configured
✅ Avatar uploader endpoint created
✅ AvatarUpload component built
✅ API endpoint for database update
✅ Integrated in Profile Settings
✅ Loading states and error handling
✅ Remove avatar functionality
✅ Preview before upload
✅ Auto-refresh after upload
```

**Status: 100% Functional** 🎉

---

## 🚀 Next Steps (Optional)

1. **Image Cropping:** Add cropper before upload
2. **Multiple Formats:** Support WEBP, AVIF
3. **Background Removal:** AI-powered bg removal
4. **Filters:** Instagram-style filters
5. **Compression:** Client-side compression before upload

All of these can be added later without breaking existing functionality.
