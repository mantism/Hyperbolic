package types

import "time"

// VideoType represents the type of video (trick or combo)
type VideoType string

const (
	VideoTypeTrick VideoType = "trick"
	VideoTypeCombo VideoType = "combo"
)

// VideoUploadRequest unified request for video uploads
type VideoUploadRequest struct {
	Type     VideoType `json:"type" binding:"required"`
	ParentID string    `json:"parentId" binding:"required"` // trickId or comboId depending on type
	UserID   string    `json:"userId" binding:"required"`
	FileName string    `json:"fileName" binding:"required"`
	FileSize int64     `json:"fileSize" binding:"required"`
	MimeType string    `json:"mimeType" binding:"required"`
	Duration *float64  `json:"duration,omitempty"` // in milliseconds
}

// VideoUploadResponse matches TypeScript interface
type VideoUploadResponse struct {
	UploadURL string `json:"uploadUrl"`
	VideoID   string `json:"videoId"`
	ExpiresAt string `json:"expiresAt"`
}

// VideoMetadata matches TypeScript interface
type VideoMetadata struct {
	ID           string    `json:"id"`
	TrickID      string    `json:"trickId,omitempty"`
	ComboID      string    `json:"comboId,omitempty"`
	UserID       string    `json:"userId"`
	URL          string    `json:"url"`
	ThumbnailURL *string   `json:"thumbnailUrl,omitempty"`
	Duration     *int      `json:"duration,omitempty"` // in seconds
	FileSize     int64     `json:"fileSize"`
	MimeType     string    `json:"mimeType"`
	UploadedAt   time.Time `json:"uploadedAt"`
	Status       string    `json:"status"` // pending, processing, completed, failed
}

// VideoUploadCompleteRequest for confirming upload
type VideoUploadCompleteRequest struct {
	Type    VideoType `json:"type" binding:"required"`
	VideoID string    `json:"videoId" binding:"required"`
}
