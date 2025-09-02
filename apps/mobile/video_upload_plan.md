# Video Upload Implementation Plan

## Overview
Implement video upload functionality for tricks using Cloudflare R2 for storage and Supabase for metadata management.

## Architecture

### Storage Solution: Cloudflare R2
- **Why R2**: No egress fees, S3-compatible, integrated CDN, cost-effective ($0.015/GB/month)
- **Video Delivery**: Via Cloudflare CDN for global performance
- **Future Enhancement**: Can add Cloudflare Stream for video processing

### Upload Flow
```
1. User selects video from device (expo-image-picker)
2. Client validates video (size, format, duration)
3. Client requests upload URL from Supabase Edge Function
4. Edge Function generates presigned R2 upload URL
5. Client uploads directly to R2 using presigned URL
6. Client confirms upload completion to Edge Function
7. Edge Function stores video metadata in Supabase
8. Video URL stored in TricksTable or new trick_media table
```

## Database Schema Changes

### Option 1: Add to existing TricksTable
```sql
ALTER TABLE "TricksTable" 
ADD COLUMN video_url TEXT,
ADD COLUMN video_thumbnail_url TEXT,
ADD COLUMN video_uploaded_by UUID REFERENCES auth.users(id),
ADD COLUMN video_uploaded_at TIMESTAMPTZ;
```

### Option 2: Create separate trick_media table (Recommended)
```sql
CREATE TABLE trick_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trick_id UUID REFERENCES "TricksTable"(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  is_primary BOOLEAN DEFAULT false,
  upload_status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Index for quick lookups
CREATE INDEX idx_trick_media_trick_id ON trick_media(trick_id);
CREATE INDEX idx_trick_media_user_id ON trick_media(user_id);
```

## Implementation Steps

### Phase 1: Basic Upload (Current)
1. ✅ Create upload modal UI
2. ✅ Integrate with trick details FAB
3. Video selection with expo-image-picker
4. Display selected video preview
5. Basic validation (size, format)

### Phase 2: Backend Setup
1. Set up Cloudflare R2 bucket
2. Create Supabase Edge Functions for:
   - Generating presigned upload URLs
   - Confirming upload completion
3. Add database schema for video metadata
4. Implement upload progress tracking

### Phase 3: Upload Implementation
1. Implement chunked upload for large files
2. Add retry logic for failed uploads
3. Background upload support
4. Upload progress UI

### Phase 4: Video Display
1. Replace image placeholder with video player
2. Add video controls (play, pause, scrub)
3. Implement thumbnail generation
4. Add fullscreen support

### Phase 5: Advanced Features
1. Video compression before upload
2. Multiple videos per trick
3. Video moderation/approval system
4. Analytics (views, completion rate)

## Technical Requirements

### Client-Side Libraries
```json
{
  "expo-image-picker": "For video selection",
  "expo-av": "For video playback",
  "expo-file-system": "For file operations",
  "expo-media-library": "For accessing device media"
}
```

### Environment Variables
```bash
# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_PUBLIC_URL=

# Supabase (existing)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Video Constraints
- **Max file size**: 100MB (initially, can increase)
- **Max duration**: 60 seconds
- **Supported formats**: MP4, MOV
- **Recommended resolution**: 1080p max
- **Compression**: Client-side before upload

## Security Considerations

1. **Authentication**: Only logged-in users can upload
2. **Authorization**: Users can only upload to tricks in their arsenal
3. **Rate Limiting**: Max 5 uploads per user per hour
4. **Content Moderation**: Flag system for inappropriate content
5. **Presigned URLs**: Short expiration (15 minutes)
6. **File Validation**: Check MIME types, file headers

## Error Handling

1. **Network failures**: Retry with exponential backoff
2. **Large files**: Chunked upload with resume capability
3. **Invalid formats**: Clear error messages
4. **Quota exceeded**: Inform user of limits
5. **Upload failures**: Save draft locally, retry later

## UI/UX Considerations

1. **Progress indication**: Show upload percentage
2. **Background uploads**: Continue upload when app backgrounded
3. **Preview before upload**: Let user review video
4. **Trim capability**: Basic video trimming before upload
5. **Thumbnail selection**: Choose video thumbnail frame

## Future Enhancements

1. **Cloudflare Stream Integration**: 
   - Automatic transcoding
   - Adaptive bitrate streaming
   - Video analytics

2. **Social Features**:
   - Comments on videos
   - Likes/reactions
   - Share to social media

3. **Advanced Editing**:
   - Slow motion sections
   - Add text overlays
   - Music/audio tracks

4. **Discovery**:
   - Video feed by trick
   - Trending videos
   - User video galleries

## Success Metrics

- Upload success rate > 95%
- Average upload time < 30 seconds for 50MB video
- Video load time < 2 seconds
- User engagement increase of 40%

## Timeline Estimate

- Phase 1: 2-3 days (UI/UX)
- Phase 2: 3-4 days (Backend setup)
- Phase 3: 3-4 days (Upload implementation)
- Phase 4: 2-3 days (Video display)
- Phase 5: 1-2 weeks (Advanced features)

Total: ~3 weeks for full implementation