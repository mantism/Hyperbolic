package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hyperbolic/api/db"
	"github.com/hyperbolic/api/models"
)

var s3Client *s3.Client

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
	key := fmt.Sprintf("tricks/%s/videos/%s/%s", req.TrickId, req.UserId, videoId)

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
	if err := db.CreatePendingUpload(videoId, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload record"})
		return
	}

	c.JSON(http.StatusOK, models.VideoUploadResponse{
		UploadUrl: request.URL,
		VideoId:   videoId,
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
	if err := db.CompleteUpload(req.VideoId); err != nil {
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
	
	videos, err := db.GetVideosByTrickId(trickId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch videos"})
		return
	}

	c.JSON(http.StatusOK, videos)
}

// DeleteVideo removes a video
func DeleteVideo(c *gin.Context) {
	videoId := c.Param("videoId")
	userId := c.GetString("userId") // From auth middleware

	// Verify ownership
	video, err := db.GetVideoById(videoId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}

	if video.UserId != userId {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this video"})
		return
	}

	// Delete from R2
	_, err = s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(os.Getenv("CLOUDFLARE_R2_BUCKET_NAME")),
		Key:    aws.String(video.S3Key),
	})
	if err != nil {
		log.Printf("Failed to delete from R2: %v", err)
	}

	// Delete from database
	if err := db.DeleteVideo(videoId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete video"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}