package handlers

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
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hyperbolic/dolos-web-service/models"
	"github.com/hyperbolic/dolos-web-service/supabase"
)

var (
	s3Client       *s3.Client
	supabaseClient *supabase.Client
)

// InitClients initializes S3 and Supabase clients (call after loading env vars)
func InitClients() {
	// Initialize S3 client for Cloudflare R2
	accountId := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	accessKeyId := os.Getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")

	if accountId == "" || accessKeyId == "" || secretAccessKey == "" {
		log.Fatal("R2 credentials not set. Check CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY")
	}

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
	log.Println("R2 and Supabase clients initialized successfully")
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
		log.Printf("Failed to generate presigned URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate upload URL", "details": err.Error()})
		return
	}

	// First, get or create UserToTricks record
	// Query for existing user_trick record
	userTrickQuery := fmt.Sprintf("?userID=eq.%s&trickID=eq.%s&select=id", req.UserID, req.TrickID)
	userTrickResp, err := supabaseClient.Select("UserToTricks", userTrickQuery)
	if err != nil {
		log.Printf("Failed to query UserToTricks: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to lookup user trick", "details": err.Error()})
		return
	}

	var userTricks []map[string]interface{}
	if err := json.Unmarshal(userTrickResp, &userTricks); err != nil {
		log.Printf("Failed to parse user tricks: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user trick data"})
		return
	}

	var userTrickID string
	if len(userTricks) > 0 {
		// Use existing record
		userTrickID = userTricks[0]["id"].(string)
	} else {
		// Create new UserToTricks record
		newUserTrick := map[string]interface{}{
			"userID":  req.UserID,
			"trickID": req.TrickID,
			"landed":  false,
		}
		userTrickCreateResp, err := supabaseClient.Insert("UserToTricks", newUserTrick)
		if err != nil {
			log.Printf("Failed to create UserToTricks record: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user trick record", "details": err.Error()})
			return
		}

		var createdUserTricks []map[string]interface{}
		if err := json.Unmarshal(userTrickCreateResp, &createdUserTricks); err != nil || len(createdUserTricks) == 0 {
			log.Printf("Failed to parse created user trick: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user trick record"})
			return
		}
		userTrickID = createdUserTricks[0]["id"].(string)
	}

	// Save pending upload record to database
	pendingVideo := map[string]interface{}{
		"id":               videoId,
		"user_trick_id":    userTrickID,
		"url":              fmt.Sprintf("%s/%s", os.Getenv("CLOUDFLARE_R2_PUBLIC_URL"), key),
		"file_size_bytes":  req.FileSize,
		"mime_type":        req.MimeType,
		"media_type":       "video",
		"upload_status":    "pending",
	}

	if req.Duration != nil {
		pendingVideo["duration_seconds"] = int(*req.Duration / 1000)
	}

	_, err = supabaseClient.Insert("TrickMedia", pendingVideo)
	if err != nil {
		log.Printf("Failed to insert video record: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload record", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.VideoUploadResponse{
		UploadURL: request.URL,
		VideoID:   videoId,
		ExpiresAt: time.Now().Add(15 * time.Minute).Format(time.RFC3339),
	})
}

// UploadThumbnail handles thumbnail image upload for a video
func UploadThumbnail(c *gin.Context) {
	videoId := c.Param("videoId")
	userId := c.GetString("userId") // From auth middleware

	// Get video to verify ownership
	respData, err := supabaseClient.Select("TrickMedia", fmt.Sprintf("?id=eq.%s&select=*,user_trick_id(*)", videoId))
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

	// Get video metadata to construct thumbnail path
	video := videos[0]
	userTrick := video["user_trick_id"].(map[string]interface{})
	trickID := userTrick["trickID"].(string)

	// Construct thumbnail key
	extension := "jpg"
	if contentType == "image/png" {
		extension = "png"
	}
	thumbnailKey := fmt.Sprintf("tricks/%s/videos/%s/%s/thumbnail.%s", trickID, userId, videoId, extension)

	// Upload to R2
	_, err = s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
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

	// Update TrickMedia record with thumbnail URL
	thumbnailURL := fmt.Sprintf("%s/%s", os.Getenv("CLOUDFLARE_R2_PUBLIC_URL"), thumbnailKey)
	updateData := map[string]interface{}{
		"thumbnail_url": thumbnailURL,
		"updated_at":    time.Now().Format(time.RFC3339),
	}

	_, err = supabaseClient.Update("TrickMedia", fmt.Sprintf("?id=eq.%s", videoId), updateData)
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
		"updated_at":    time.Now().Format(time.RFC3339),
	}

	_, err := supabaseClient.Update("TrickMedia", fmt.Sprintf("?id=eq.%s", req.VideoId), updateData)
	if err != nil {
		log.Printf("Failed to update TrickMedia: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete upload", "details": err.Error()})
		return
	}

	// TODO: Trigger video processing (thumbnail generation, transcoding)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"videoId": req.VideoId,
	})
}

// GetTrickVideos returns all videos for a trick, optionally filtered by user
func GetTrickVideos(c *gin.Context) {
	trickId := c.Param("trickId")
	userId := c.Query("userId") // Optional user filter

	// Step 1: Get UserToTricks IDs for this trick (and optionally user)
	var userTrickQuery string
	if userId != "" {
		userTrickQuery = fmt.Sprintf("?trickID=eq.%s&userID=eq.%s&select=id", trickId, userId)
	} else {
		userTrickQuery = fmt.Sprintf("?trickID=eq.%s&select=id", trickId)
	}

	userTrickResp, err := supabaseClient.Select("UserToTricks", userTrickQuery)
	if err != nil {
		log.Printf("Failed to query UserToTricks: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user tricks", "details": err.Error()})
		return
	}

	var userTricks []map[string]interface{}
	if err := json.Unmarshal(userTrickResp, &userTricks); err != nil {
		log.Printf("Failed to parse user tricks: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user tricks"})
		return
	}

	// If no user tricks found, return empty array
	if len(userTricks) == 0 {
		c.JSON(http.StatusOK, []models.VideoMetadata{})
		return
	}

	// Step 2: Build list of user_trick_ids
	userTrickIds := make([]string, 0, len(userTricks))
	for _, ut := range userTricks {
		if id, ok := ut["id"].(string); ok {
			userTrickIds = append(userTrickIds, id)
		}
	}

	// Step 3: Query TrickMedia for these user_trick_ids
	var query string
	if len(userTrickIds) == 1 {
		query = fmt.Sprintf("?user_trick_id=eq.%s&media_type=eq.video&upload_status=eq.completed&order=created_at.desc&select=*", userTrickIds[0])
	} else {
		// Build an "or" query for multiple IDs
		orConditions := ""
		for i, id := range userTrickIds {
			if i > 0 {
				orConditions += ","
			}
			orConditions += fmt.Sprintf("user_trick_id.eq.%s", id)
		}
		query = fmt.Sprintf("?or=(%s)&media_type=eq.video&upload_status=eq.completed&order=created_at.desc&select=*", orConditions)
	}

	respData, err := supabaseClient.Select("TrickMedia", query)
	if err != nil {
		log.Printf("Failed to fetch videos: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch videos", "details": err.Error()})
		return
	}

	var videos []models.VideoMetadata
	if err := json.Unmarshal(respData, &videos); err != nil {
		log.Printf("Failed to parse videos: %v", err)
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
	respData, err := supabaseClient.Select("TrickMedia", fmt.Sprintf("?id=eq.%s&select=*", videoId))
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
	_, err = supabaseClient.Delete("TrickMedia", fmt.Sprintf("?id=eq.%s", videoId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete video"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}