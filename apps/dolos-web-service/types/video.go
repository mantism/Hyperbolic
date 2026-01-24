package types

import "time"

// TrickVideoUploadRequest for trick video uploads
type TrickVideoUploadRequest struct {
	TrickID  string   `json:"trickId" binding:"required"`
	UserID   string   `json:"userId" binding:"required"`
	FileName string   `json:"fileName" binding:"required"`
	FileSize int64    `json:"fileSize" binding:"required"`
	MimeType string   `json:"mimeType" binding:"required"`
	Duration *float64 `json:"duration,omitempty"` // in milliseconds
}

// ComboVideoUploadRequest for combo video uploads
type ComboVideoUploadRequest struct {
	ComboID  string   `json:"comboId" binding:"required"`
	UserID   string   `json:"userId" binding:"required"`
	FileName string   `json:"fileName" binding:"required"`
	FileSize int64    `json:"fileSize" binding:"required"`
	MimeType string   `json:"mimeType" binding:"required"`
	Duration *float64 `json:"duration,omitempty"` // in milliseconds
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
	VideoID string `json:"videoId" binding:"required"`
	UserID  string `json:"userId" binding:"required"`
}