# Trick Videos Architecture

## Overview

The video system allows users to upload, view, and manage videos of their trick performances. Videos are stored in Cloudflare R2 and linked to user progress through the `TrickMedia` table.

---

## Current Architecture

### Data Model

**TrickMedia Table:**
```typescript
{
  id: string;                    // UUID
  user_trick_id: string;         // FK to UserToTricks
  tricklog_id: string | null;    // FK to TrickLogs (optional)
  url: string;                   // Public R2 URL
  thumbnail_url: string | null;  // Public R2 thumbnail URL
  caption: string | null;        // User-provided caption
  media_type: "video" | "image";
  upload_status: "pending" | "processing" | "completed" | "failed";
  duration_seconds: number | null;
  file_size_bytes: number | null;
  trim_start_ms: number | null;  // Trim metadata (UI-only for now)
  trim_end_ms: number | null;    // Trim metadata (UI-only for now)
  mime_type: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

**Relationships:**
- `TrickMedia.user_trick_id` → `UserToTricks.id` (many-to-one)
- `UserToTricks.trickID` → `Tricks.id`
- `UserToTricks.userID` → `Users.id`

**Important:** Videos are linked through `UserToTricks`, not directly to users or tricks. This ties videos to a user's specific progress on a trick.

### Storage

**Cloudflare R2 (S3-compatible):**
- **Video Path:** `tricks/{trickId}/videos/{userId}/{videoId}`
- **Thumbnail Path:** `tricks/{trickId}/videos/{userId}/{videoId}/thumbnail.{jpg|png}`
- **Max Size:** 100MB per video
- **Max Duration:** 10 seconds (enforced client-side)
- **Supported Formats:** MP4, MOV

### Backend API

**Location:** `/apps/dolos-web-service/handlers/video.go`

**Endpoints:**
- `POST /api/v1/videos/upload/request` - Generate presigned upload URL
- `POST /api/v1/videos/upload/complete` - Mark upload complete
- `POST /api/v1/videos/:videoId/thumbnail` - Upload thumbnail
- `GET /api/v1/videos/trick/:trickId?userId=<optional>` - Get videos for a trick
- `DELETE /api/v1/videos/:videoId` - Delete video

**Authentication:** ES256 JWT tokens from Supabase, verified via JWKS

### Frontend Services

**Location:** `/apps/mobile/lib/services/videoService.ts`

**Functions:**
```typescript
// Fetch videos for a specific trick
getTrickVideos(trickId: string, userId?: string): Promise<TrickVideo[]>

// Fetch all videos for a user across all tricks
getUserVideos(userId: string): Promise<TrickVideo[]>

// Delete a video
deleteVideo(videoId: string): Promise<void>

// Upload thumbnail
uploadThumbnail(videoId: string, imageUri: string): Promise<string>

// Full upload flow
uploadVideo(
  videoUri: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  trickId: string,
  userId: string,
  duration?: number,
  onProgress?: (progress: number) => void
): Promise<string>
```

---

## Video Display Components

### 1. VideoHero
**Location:** `/apps/mobile/components/VideoHero.tsx`

**Purpose:** Featured video display in trick detail pages

**Features:**
- Shows most recent video as hero image
- Parallax scrolling effect
- Play button overlay
- Fades as user scrolls

**Usage:**
```tsx
<VideoHero
  video={featuredVideo}
  categoryColor={categoryColor}
  scrollY={scrollY}
/>
```

### 2. VideoGallery
**Location:** `/apps/mobile/components/VideoGallery.tsx`

**Purpose:** Horizontal scrollable gallery of video thumbnails

**Features:**
- Horizontal scroll with 9:16 aspect ratio thumbnails (108x192px)
- Optional metadata display (trick name, upload date)
- Play button overlay
- Long-press to delete (when enabled)
- Processing status badges
- Empty state handling

**Props:**
```typescript
{
  title?: string;                    // Gallery title (default: "VIDEOS")
  videos: TrickVideo[];              // Videos to display
  onVideoPress?: (video) => void;    // Tap handler
  onVideoDeleted?: () => void;       // Delete callback
  showDeleteOption?: boolean;        // Enable long-press delete
  showMetadata?: boolean;            // Show trick name + date below thumbnail
}
```

**Current Uses:**
1. **Trick Detail Page:** Shows videos for a specific trick with tabs ("My Videos" vs "Community")
2. **Home Page:** Shows user's recent videos across all tricks with metadata

### 3. VideoPlayerModal
**Location:** `/apps/mobile/components/VideoPlayerModal.tsx`

**Purpose:** Full-screen video playback

**Features:**
- Full-screen modal
- Tap to play/pause
- Close button
- Works with any TrickVideo object

**Usage:**
```tsx
<VideoPlayerModal
  visible={showVideoPlayer}
  video={selectedVideo}
  onClose={handleCloseVideoPlayer}
/>
```

### 4. Video Upload Flow
**Location:** `/apps/mobile/app/video/edit.tsx`

**Design:** Instagram-style single-screen editing

**Flow:**
1. Navigate to `/video/edit` with trick ID
2. Image picker opens automatically
3. Full-screen video preview
4. Inline editing tools:
   - `VideoTrimTimeline.tsx` - Draggable trim handles
   - `VideoFrameStrip.tsx` - Thumbnail preview strip
   - Caption input (500 char limit)
5. Tap "Next" to upload
6. `VideoUploadProgress.tsx` shows progress
7. Auto-navigate back on completion

**Components:**
- `VideoTrimTimeline.tsx` - Timeline with trim controls
- `VideoFrameStrip.tsx` - Frame preview strip
- `VideoUploadProgress.tsx` - Upload progress UI

---

## Current Implementations

### Trick Detail Page
**Location:** `/apps/mobile/components/TrickDetailPage.tsx`

**Video Features:**
- VideoHero displays featured video (most recent)
- VideoGallery with two tabs:
  - "My Videos" (user's videos only)
  - "Community" (all videos for this trick)
- Long-press delete on "My Videos" tab
- Full-screen playback via VideoPlayerModal
- Real-time updates via Supabase subscriptions

**Data Flow:**
```typescript
// Fetch videos when component mounts or tab changes
const videos = await getTrickVideos(trickId, videoTab === "my" ? userId : undefined);

// Featured video is first in array (most recent)
const featuredVideo = videos[0];
```

### Home Page
**Location:** `/apps/mobile/app/(tabs)/index.tsx`

**Video Features:**
- "Your Recent Videos" section at top
- Horizontal scroll of user's videos across all tricks
- Shows trick name and upload date below each thumbnail
- Pull-to-refresh to reload videos
- Empty state for users with no videos
- Full-screen playback via VideoPlayerModal

**Data Flow:**
```typescript
// Fetch all user videos on mount
const videos = await getUserVideos(userId);

// Display in VideoGallery with metadata
<VideoGallery
  videos={videos}
  showMetadata={true}
  showDeleteOption={true}
  onVideoPress={handleVideoPress}
/>
```

---

## Date Formatting

**Helper Function:** `formatUploadDate()` in `VideoGallery.tsx`

**Format:**
- "Today" - uploaded today
- "Yesterday" - uploaded yesterday
- "2 days ago" - uploaded 2-6 days ago
- "Dec 9, 2025" - uploaded 7+ days ago

---

## Known Limitations

### Client-Side
1. **UI-only trimming** - Trim metadata sent to backend but video not actually trimmed on device
2. **No compression** - Videos upload at original quality
3. **No background upload** - Upload must complete before closing app
4. **No retry logic** - Failed uploads require manual retry
5. **Single video per upload** - Can't batch upload multiple videos
6. **Dev build required** - `react-native-video-trim` requires `expo run:ios/android` (not Expo Go)

### Server-Side
1. **No server-side processing** - No trimming or transcoding
2. **No auto-generated thumbnails** - Client must provide thumbnail
3. **No multiple qualities** - Only original quality stored

---

## Future Work

### High Priority

#### 1. Implement Client-Side Video Trimming
**Current State:** UI exists but videos upload at full length
**Goal:** Actually trim videos using `react-native-video-trim`
**Files to Modify:**
- `app/video/edit.tsx` - Add trimming logic
- `videoService.ts` - Save trimmed video instead of original

#### 2. Video Compression
**Current State:** Videos upload at original quality (can be large)
**Goal:** Compress videos before upload to reduce file size and upload time
**Considerations:**
- Target bitrate/quality settings
- Maintain acceptable visual quality
- Progress indication during compression

#### 3. Auto-Generate Thumbnails Server-Side
**Current State:** Client must provide thumbnail
**Goal:** Backend automatically extracts thumbnail from first frame if not provided
**Benefits:**
- Simpler client code
- Guaranteed thumbnail for all videos
- Fallback if client thumbnail fails

#### 4. Upload Retry Logic
**Current State:** Failed uploads require user to start over
**Goal:** Automatic retry with exponential backoff
**Implementation:**
- Detect network failures
- Retry presigned URL generation if expired
- Resume partial uploads if possible

### Medium Priority

#### 5. Background Upload
**Goal:** Allow users to leave the app while video uploads
**Challenges:**
- iOS background task limitations
- Need to notify user on completion
- Handle app termination during upload

#### 6. Batch Video Upload
**Goal:** Upload multiple videos at once
**Use Case:** User has several takes of a trick
**Implementation:**
- Queue system for uploads
- Progress for each video
- Pause/resume individual uploads

#### 7. Server-Side Transcoding
**Goal:** Generate multiple quality versions (480p, 720p, 1080p)
**Benefits:**
- Adaptive quality based on network
- Reduced bandwidth for mobile users
- Better performance

#### 8. Video Filters/Effects
**Goal:** Apply filters before upload (like Instagram)
**Examples:**
- Brightness/contrast
- Slow motion
- Speed up
- Color grading

### Low Priority

#### 9. Video Drafts
**Goal:** Save videos without uploading
**Use Case:** User wants to edit later
**Storage:** Local device storage

#### 10. Advanced Editing
**Features:**
- Rotate/crop
- Multiple clip stitching
- Text overlays
- Music/audio overlay

#### 11. Feed Algorithm
**Goal:** Smart feed of recommended videos on Home page
**Considerations:**
- Personalization based on user's tricks
- Trending videos
- Following system for other users
- Engagement metrics (views, likes)

---

## Testing Checklist

### Backend
- [ ] Video upload request generates valid presigned URL
- [ ] Presigned URL expires after 15 minutes
- [ ] Upload completion updates status correctly
- [ ] Thumbnail upload saves correct URL
- [ ] `getTrickVideos` filters by userId correctly
- [ ] `getTrickVideos` returns only completed videos
- [ ] Delete removes video from R2 and database
- [ ] JWT auth rejects invalid/expired tokens

### Frontend
- [ ] Video selection validates size (100MB) and duration (10s)
- [ ] Thumbnail generation works at selected time
- [ ] Upload progress displays correctly
- [ ] Video appears in gallery after upload
- [ ] Video plays in full-screen modal
- [ ] Tabs switch between "My Videos" and "Community"
- [ ] Long-press delete works (only on user's videos)
- [ ] Hero shows most recent video with thumbnail
- [ ] Videos refresh after upload completes
- [ ] Home page shows user's recent videos with metadata
- [ ] Pull-to-refresh works on Home page

---

## Dependencies

### Mobile App
```json
{
  "expo-video": "~3.0.14",
  "expo-video-thumbnails": "^10.0.7",
  "expo-file-system": "^19.0.17",
  "expo-image-picker": "~17.0.8",
  "react-native-video-trim": "^6.0.11"
}
```

### Go Service
```go
"github.com/aws/aws-sdk-go-v2/service/s3"
"github.com/golang-jwt/jwt/v5"
```

---

## Environment Variables

### Mobile (.env.local)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### Backend (.env)
```bash
# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET_NAME=hyperbolic-trick-videos
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
```

---

## Resources

- [Expo Image Picker Docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo Video Docs](https://docs.expo.dev/versions/latest/sdk/video/)
- [Expo Video Thumbnails Docs](https://docs.expo.dev/versions/latest/sdk/video-thumbnails/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Supabase JWKS](https://supabase.com/docs/guides/auth/jwts)

---

**Last Updated:** 2025-12-10
**Status:** ✅ Production Ready - Instagram-style upload flow complete
