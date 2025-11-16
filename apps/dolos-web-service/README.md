🎯 Overview

This is a video upload service for the Hyperbolic tricking app. It handles uploading
trick videos to Cloudflare R2 (S3-compatible storage) and stores metadata in Supabase.

---

📁 Project Structure

dolos-web-service/
├── main.go # Server entry point & routing
├── handlers/
│ └── video.go # Video upload/management logic
├── middleware/
│ ├── auth.go # JWT authentication
│ └── cors.go # Cross-origin request handling
├── models/
│ └── video.go # Data structures
└── supabase/
└── client.go # Supabase REST API wrapper

---

🔄 How It Works: Video Upload Flow

Step 1: Client Requests Upload Permission

Mobile App → POST /api/v1/videos/upload/request

What happens:

1. Client sends: { trickId, userId, fileName, fileSize, mimeType, duration }
2. Server validates:
   - File size < 100MB
   - Format is MP4 or MOV

3. Server generates:
   - Unique video ID (UUID)
   - S3 key: tricks/{trickId}/videos/{userId}/{videoId}
   - Presigned upload URL (expires in 15 min)

4. Server creates DB record with status "pending"
5. Returns: { uploadUrl, videoId, expiresAt }

Presigned URL = Secure temporary upload linkThe client can upload directly to R2
without exposing credentials!

---

Step 2: Client Uploads Video

Mobile App → PUT {uploadUrl} (direct to Cloudflare R2)

The mobile app uploads the video file directly to R2 using the presigned URL. No
backend involved here!

---

Step 3: Client Confirms Upload

Mobile App → POST /api/v1/videos/upload/complete

What happens:

1. Client sends: { videoId }
2. Server updates DB record:
   - Status: "pending" → "completed"
   - Sets uploaded_at timestamp

3. Returns success

TODO in code: Trigger video processing (thumbnails, transcoding)

---

🛣️ API Endpoints

| Method | Endpoint                       | Auth   | Purpose                    |
| ------ | ------------------------------ | ------ | -------------------------- |
| GET    | /health                        | ❌ No  | Health check               |
| POST   | /api/v1/videos/upload/request  | ✅ Yes | Get presigned upload URL   |
| POST   | /api/v1/videos/upload/complete | ✅ Yes | Mark upload as complete    |
| GET    | /api/v1/videos/trick/:trickId  | ✅ Yes | Get all videos for a trick |
| DELETE | /api/v1/videos/:videoId        | ✅ Yes | Delete video (owner only)  |

---

🔐 Security (Current State)

✅ What's Working:

- CORS middleware (allows mobile app to make requests)
- Auth middleware checks for Authorization: Bearer <token> header
- File size validation (100MB limit)
- File type validation (MP4/MOV only)
- Presigned URLs (secure, temporary upload access)
- Ownership check on delete (users can only delete their own videos)

⚠️ What's NOT Implemented Yet:

auth.go:30-36 - Placeholder authentication!
// TODO: Verify JWT token with Supabase
userId := "placeholder-user-id" // ⚠️ NOT SECURE!

Real implementation should:

1. Decode the JWT token
2. Verify signature using SUPABASE_JWT_SECRET
3. Extract user ID from token claims

This is critical - anyone can currently bypass auth by sending any Bearer token!

---

🗃️ Database Schema

The API writes to the trick_media table:

{
id: string // UUID
trick_id: string // Which trick this video is for
user_id: string // Who uploaded it
url: string // Public R2 URL
file_size_bytes: number
mime_type: string // video/mp4 or video/quicktime
media_type: "video"
upload_status: string // pending → completed
duration_seconds: number (optional)
uploaded_at: timestamp
}

---

🏗️ Key Components Explained

1. S3 Client Initialization (video.go:27-50)

Uses AWS SDK configured for Cloudflare R2:

- Custom endpoint: https://{accountId}.r2.cloudflarestorage.com
- S3-compatible API (R2 mimics AWS S3)
- Credentials from env vars

2. Presigned URLs (video.go:76-88)

presignClient.PresignPutObject(...)

This generates a temporary URL that allows:

- Uploading to a specific S3 key
- Only PUT requests
- Expires in 15 minutes
- No credentials needed by client

Why this is great:

- Client uploads directly to R2 (faster, no server bottleneck)
- Server never handles large video files
- Credentials stay secure

3. Supabase Client (supabase/client.go)

Simple REST API wrapper:
supabaseClient.Insert("trick_media", data)
supabaseClient.Update("trick_media", "?id=eq.123", data)
supabaseClient.Select("trick_media", "?trick_id=eq.456")
supabaseClient.Delete("trick_media", "?id=eq.123")

Uses Supabase REST API with service key for full access.

---

🚨 Important Things to Know

1. Auth is Placeholder!

The auth middleware (middleware/auth.go:36) sets userId to "placeholder-user-id". This
means:

- ❌ Any request with a Bearer token passes auth
- ❌ All uploads appear to be from the same user
- ❌ Delete endpoint authorization is broken

Fix: Implement proper JWT verification using the SUPABASE_JWT_SECRET.

2. Storage Key Structure

Videos are stored as:
tricks/{trickId}/videos/{userId}/{videoId}

This organizes videos by trick and user, making it easy to:

- List all videos for a trick
- Delete all videos by a user
- Manage storage

3. Public R2 URLs

The URL format (video.go:96):
https://pub-{bucket-hash}.r2.dev/{key}

This assumes you enabled public access on your R2 bucket. Anyone with the URL can view
the video.

4. No Video Processing Yet

The code has a TODO (video.go:143):
// TODO: Trigger video processing (thumbnail generation, transcoding)

You'll likely want to add:

- Thumbnail generation
- Video compression/transcoding
- Quality variants (360p, 720p, 1080p)

---

🎯 Summary

What it does well:

- ✅ Clean, organized code structure
- ✅ Presigned URLs for efficient uploads
- ✅ Proper separation of concerns
- ✅ Uses Supabase for metadata
- ✅ Type-safe models

What needs work:

- ⚠️ JWT authentication (critical!)
- ⚠️ Video processing pipeline
- ⚠️ Error handling could be more detailed
- ⚠️ No rate limiting
- ⚠️ No video validation after upload (could upload anything)
