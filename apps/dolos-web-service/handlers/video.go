package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hyperbolic/dolos-web-service/models"
	"github.com/hyperbolic/dolos-web-service/supabase"
)

var (
	s3Client *s3.Client
	supabaseClient *supabase.Client
)

func init() {
	// Initialize S3 client for Cloudflare R2
	accountId := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	accessKeyId := os.Getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
	
	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountId),
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyId, secretAccessKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		log.Fatal("Failed to load R2 config:", err)
	}

	s3Client = s3.NewFromConfig(cfg)
	supabaseClient = supabase.NewClient()
}

// RequestVideoUpload generates a presigned URL for video upload
func RequestVideoUpload(c *gin.Context) {
	var req models.VideoUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate file size (100MB max)
	if req.FileSize > 100*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 100MB limit"})
		return
	}

	// Validate mime type
	if req.MimeType != "video/mp4" && req.MimeType != "video/quicktime" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video format. Only MP4 and MOV are supported"})
		return
	}

	// Generate unique video ID
	videoId := uuid.New().String()
	key := fmt.Sprintf("tricks/%s/videos/%s/%s", req.TrickID, req.UserID, videoId)

	// Create presigned URL for upload
	presignClient := s3.NewPresignClient(s3Client)
	request, err := presignClient.PresignPutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(os.Getenv("CLOUDFLARE_R2_BUCKET_NAME")),
		Key:         aws.String(key),
		ContentType: aws.String(req.MimeType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(15 * time.Minute)
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate upload URL"})
		return
	}

	// Save pending upload record to database
	pendingVideo := map[string]interface{}{
		"id":              videoId,
		"trick_id":        req.TrickID,
		"user_id":         req.UserID,
		"url":             fmt.Sprintf("https://pub-%s.r2.dev/%s", os.Getenv("CLOUDFLARE_R2_BUCKET_NAME"), key),
		"file_size_bytes": req.FileSize,
		"mime_type":       req.MimeType,
		"media_type":      "video",
		"upload_status":   "pending",
	}

	if req.Duration != nil {
		pendingVideo["duration_seconds"] = *req.Duration / 1000
	}

	_, err = supabaseClient.Insert("trick_media", pendingVideo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload record"})
		return
	}

	c.JSON(http.StatusOK, models.VideoUploadResponse{
		UploadURL: request.URL,
		VideoID:   videoId,
		ExpiresAt: time.Now().Add(15 * time.Minute).Format(time.RFC3339),
	})
}

// CompleteVideoUpload confirms upload completion and saves metadata
func CompleteVideoUpload(c *gin.Context) {
	var req struct {
		VideoId string `json:"videoId" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update upload status in database
	updateData := map[string]interface{}{
		"upload_status": "completed",
		"uploaded_at":   time.Now().Format(time.RFC3339),
	}

	_, err := supabaseClient.Update("trick_media", fmt.Sprintf("?id=eq.%s", req.VideoId), updateData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete upload"})
		return
	}

	// TODO: Trigger video processing (thumbnail generation, transcoding)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"videoId": req.VideoId,
	})
}

// GetTrickVideos returns all videos for a trick
func GetTrickVideos(c *gin.Context) {
	trickId := c.Param("trickId")
	
	respData, err := supabaseClient.Select("trick_media", fmt.Sprintf("?trick_id=eq.%s&media_type=eq.video&order=created_at.desc", trickId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch videos"})
		return
	}

	var videos []models.VideoMetadata
	if err := json.Unmarshal(respData, &videos); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse videos"})
		return
	}

	c.JSON(http.StatusOK, videos)
}

// DeleteVideo removes a video
func DeleteVideo(c *gin.Context) {
	videoId := c.Param("videoId")
	userId := c.GetString("userId") // From auth middleware

	// Get video metadata and verify ownership
	respData, err := supabaseClient.Select("trick_media", fmt.Sprintf("?id=eq.%s&select=*", videoId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch video"})
		return
	}

	var videos []models.VideoMetadata
	if err := json.Unmarshal(respData, &videos); err != nil || len(videos) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}

	video := videos[0]
	if video.UserID != userId {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this video"})
		return
	}

	// Extract S3 key from URL or construct it
	key := fmt.Sprintf("tricks/%s/videos/%s/%s", video.TrickID, video.UserID, videoId)

	// Delete from R2
	_, err = s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(os.Getenv("CLOUDFLARE_R2_BUCKET_NAME")),
		Key:    aws.String(key),
	})
	if err != nil {
		log.Printf("Failed to delete from R2: %v", err)
	}

	// Delete from database
	_, err = supabaseClient.Delete("trick_media", fmt.Sprintf("?id=eq.%s", videoId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete video"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}