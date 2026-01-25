package video

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hyperbolic/dolos-web-service/clients"
	"github.com/hyperbolic/dolos-web-service/types"
)

// RequestUploadCore is the shared implementation for video upload requests
func RequestUploadCore(c *gin.Context, cfg types.MediaConfig, parentID string, userID string, fileSize int64, mimeType string, duration *float64) {
	// Validate file size (100MB max)
	if fileSize > 100*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 100MB limit"})
		return
	}

	// Validate mime type
	if mimeType != "video/mp4" && mimeType != "video/quicktime" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video format. Only MP4 and MOV are supported"})
		return
	}

	// Generate unique video ID
	videoId := uuid.New().String()
	key := fmt.Sprintf("%s/%s/videos/%s/%s", cfg.PathPrefix, parentID, userID, videoId)

	// Create presigned URL for upload
	presignClient := s3.NewPresignClient(clients.S3)
	request, err := presignClient.PresignPutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(os.Getenv("CLOUDFLARE_R2_BUCKET_NAME")),
		Key:         aws.String(key),
		ContentType: aws.String(mimeType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(15 * time.Minute)
	})

	if err != nil {
		log.Printf("Failed to generate presigned URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate upload URL", "details": err.Error()})
		return
	}

	// Get or create parent record
	var parentRecordID string
	parentQuery := fmt.Sprintf("?%s=eq.%s&%s=eq.%s&select=id", cfg.UserIDCol, userID, cfg.ParentIDCol, parentID)

	// For combos, parentID IS the record ID, so query differently
	if cfg.Table == "ComboMedia" {
		parentQuery = fmt.Sprintf("?id=eq.%s&%s=eq.%s&select=id", parentID, cfg.UserIDCol, userID)
	}

	parentResp, err := clients.Supabase.Select(cfg.ParentTable, parentQuery)
	if err != nil {
		log.Printf("Failed to query %s: %v", cfg.ParentTable, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to lookup parent record", "details": err.Error()})
		return
	}

	var parentRecords []map[string]interface{}
	if err := json.Unmarshal(parentResp, &parentRecords); err != nil {
		log.Printf("Failed to parse parent records: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse parent data"})
		return
	}

	if len(parentRecords) > 0 {
		parentRecordID = parentRecords[0]["id"].(string)
	} else if cfg.AutoCreateUserLink {
		// Create new parent record (only for tricks)
		newParent := map[string]interface{}{
			cfg.UserIDCol:   userID,
			cfg.ParentIDCol: parentID,
			"landed":        false,
		}
		createResp, err := clients.Supabase.Insert(cfg.ParentTable, newParent)
		if err != nil {
			log.Printf("Failed to create %s record: %v", cfg.ParentTable, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create parent record", "details": err.Error()})
			return
		}

		var createdRecords []map[string]interface{}
		if err := json.Unmarshal(createResp, &createdRecords); err != nil || len(createdRecords) == 0 {
			log.Printf("Failed to parse created parent record: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create parent record"})
			return
		}
		parentRecordID = createdRecords[0]["id"].(string)
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "Parent record not found"})
		return
	}

	// Save pending upload record to database
	pendingVideo := map[string]interface{}{
		"id":              videoId,
		cfg.ForeignKey:    parentRecordID,
		"url":             fmt.Sprintf("%s/%s", os.Getenv("CLOUDFLARE_R2_PUBLIC_URL"), key),
		"file_size_bytes": fileSize,
		"mime_type":       mimeType,
		"media_type":      "video",
		"upload_status":   "pending",
	}

	if duration != nil {
		pendingVideo["duration_seconds"] = int(*duration / 1000)
	}

	_, err = clients.Supabase.Insert(cfg.Table, pendingVideo)
	if err != nil {
		log.Printf("Failed to insert video record: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload record", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, types.VideoUploadResponse{
		UploadURL: request.URL,
		VideoID:   videoId,
		ExpiresAt: time.Now().Add(15 * time.Minute).Format(time.RFC3339),
	})
}

// UploadThumbnailCore handles thumbnail upload for both tricks and combos
func UploadThumbnailCore(c *gin.Context, cfg types.MediaConfig, videoId string, userId string) {
	// Get video to verify ownership
	foreignKeyExpand := cfg.ForeignKey + "(*)"
	respData, err := clients.Supabase.Select(cfg.Table, fmt.Sprintf("?id=eq.%s&select=*,%s", videoId, foreignKeyExpand))
	if err != nil {
		log.Printf("Failed to fetch video: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch video"})
		return
	}

	var videos []map[string]interface{}
	if err := json.Unmarshal(respData, &videos); err != nil || len(videos) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}

	// Parse multipart form
	file, err := c.FormFile("thumbnail")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No thumbnail file provided"})
		return
	}

	// Validate file type
	contentType := file.Header.Get("Content-Type")
	if contentType != "image/jpeg" && contentType != "image/jpg" && contentType != "image/png" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image format. Only JPEG and PNG are supported"})
		return
	}

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		log.Printf("Failed to open uploaded file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process upload"})
		return
	}
	defer src.Close()

	// Read file content
	fileContent, err := io.ReadAll(src)
	if err != nil {
		log.Printf("Failed to read file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// Get parent ID from video metadata
	videoData := videos[0]
	parentRecord := videoData[cfg.ForeignKey].(map[string]interface{})
	var parentID string
	if cfg.Table == "TrickMedia" {
		parentID = parentRecord["trickID"].(string)
	} else {
		parentID = parentRecord["id"].(string)
	}

	// Construct thumbnail key
	extension := "jpg"
	if contentType == "image/png" {
		extension = "png"
	}
	thumbnailKey := fmt.Sprintf("%s/%s/videos/%s/%s/thumbnail.%s", cfg.PathPrefix, parentID, userId, videoId, extension)

	// Upload to R2
	_, err = clients.S3.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(os.Getenv("CLOUDFLARE_R2_BUCKET_NAME")),
		Key:         aws.String(thumbnailKey),
		Body:        bytes.NewReader(fileContent),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		log.Printf("Failed to upload thumbnail to R2: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload thumbnail"})
		return
	}

	// Update media record with thumbnail URL
	thumbnailURL := fmt.Sprintf("%s/%s", os.Getenv("CLOUDFLARE_R2_PUBLIC_URL"), thumbnailKey)
	updateData := map[string]interface{}{
		"thumbnail_url": thumbnailURL,
		"updated_at":    time.Now().Format(time.RFC3339),
	}

	_, err = clients.Supabase.Update(cfg.Table, fmt.Sprintf("?id=eq.%s", videoId), updateData)
	if err != nil {
		log.Printf("Failed to update thumbnail URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save thumbnail"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"thumbnailUrl": thumbnailURL,
	})
}

// CompleteUploadCore confirms upload completion
func CompleteUploadCore(c *gin.Context, cfg types.MediaConfig, videoId string) {
	// Update upload status in database
	updateData := map[string]interface{}{
		"upload_status": "completed",
		"updated_at":    time.Now().Format(time.RFC3339),
	}

	_, err := clients.Supabase.Update(cfg.Table, fmt.Sprintf("?id=eq.%s", videoId), updateData)
	if err != nil {
		log.Printf("Failed to update %s: %v", cfg.Table, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete upload", "details": err.Error()})
		return
	}

	// TODO: Trigger video processing (thumbnail generation, transcoding)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"videoId": videoId,
	})
}

// DeleteCore removes a video from storage and database
func DeleteCore(c *gin.Context, cfg types.MediaConfig, videoId string, userId string) {
	// Get video metadata and verify ownership
	foreignKeyExpand := cfg.ForeignKey + "(*)"
	respData, err := clients.Supabase.Select(cfg.Table, fmt.Sprintf("?id=eq.%s&select=*,%s", videoId, foreignKeyExpand))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch video"})
		return
	}

	var videos []map[string]interface{}
	if err := json.Unmarshal(respData, &videos); err != nil || len(videos) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}

	videoData := videos[0]

	// Verify ownership through parent record
	parentRecord := videoData[cfg.ForeignKey].(map[string]interface{})
	videoUserId := parentRecord[cfg.UserIDCol].(string)
	if videoUserId != userId {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this video"})
		return
	}

	// Get parent ID for constructing S3 key
	var parentID string
	if cfg.Table == "TrickMedia" {
		parentID = parentRecord["trickID"].(string)
	} else {
		parentID = parentRecord["id"].(string)
	}

	// Construct S3 key
	key := fmt.Sprintf("%s/%s/videos/%s/%s", cfg.PathPrefix, parentID, userId, videoId)

	// Delete from R2
	_, err = clients.S3.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(os.Getenv("CLOUDFLARE_R2_BUCKET_NAME")),
		Key:    aws.String(key),
	})
	if err != nil {
		log.Printf("Failed to delete from R2: %v", err)
	}

	// Delete from database
	_, err = clients.Supabase.Delete(cfg.Table, fmt.Sprintf("?id=eq.%s", videoId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete video"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
