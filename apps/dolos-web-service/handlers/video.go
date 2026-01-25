package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyperbolic/dolos-web-service/clients"
	"github.com/hyperbolic/dolos-web-service/types"
	"github.com/hyperbolic/dolos-web-service/video"
)

// RequestVideoUpload generates a presigned URL for video upload
func RequestVideoUpload(c *gin.Context) {
	var req types.VideoUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cfg, ok := types.GetMediaConfig(req.Type)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video type"})
		return
	}

	video.RequestUploadCore(c, cfg, req.ParentID, req.UserID, req.FileSize, req.MimeType, req.Duration)
}

// UploadThumbnail handles thumbnail upload for videos
func UploadThumbnail(c *gin.Context) {
	videoId := c.Param("videoId")
	userId := c.GetString("userId")
	videoType := types.VideoType(c.Query("type"))

	cfg, ok := types.GetMediaConfig(videoType)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or missing video type query parameter"})
		return
	}

	video.UploadThumbnailCore(c, cfg, videoId, userId)
}

// CompleteVideoUpload confirms video upload completion
func CompleteVideoUpload(c *gin.Context) {
	var req types.VideoUploadCompleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cfg, ok := types.GetMediaConfig(req.Type)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video type"})
		return
	}

	video.CompleteUploadCore(c, cfg, req.VideoID)
}

// GetVideos returns all videos for a parent (trick or combo), optionally filtered by user
func GetVideos(c *gin.Context) {
	parentId := c.Param("parentId")
	userId := c.Query("userId")
	videoType := types.VideoType(c.Query("type"))

	cfg, ok := types.GetMediaConfig(videoType)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or missing video type query parameter"})
		return
	}

	// Different query logic based on video type
	if videoType == types.VideoTypeTrick {
		getTrickVideos(c, cfg, parentId, userId)
	} else {
		getComboVideos(c, cfg, parentId, userId)
	}
}

// getTrickVideos handles the two-step query for trick videos
func getTrickVideos(c *gin.Context, cfg types.MediaConfig, trickId string, userId string) {
	// Step 1: Get UserToTricks IDs for this trick (and optionally user)
	var userTrickQuery string
	if userId != "" {
		userTrickQuery = fmt.Sprintf("?trickID=eq.%s&userID=eq.%s&select=id", trickId, userId)
	} else {
		userTrickQuery = fmt.Sprintf("?trickID=eq.%s&select=id", trickId)
	}

	userTrickResp, err := clients.Supabase.Select("UserToTricks", userTrickQuery)
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
		c.JSON(http.StatusOK, []types.VideoMetadata{})
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

	respData, err := clients.Supabase.Select(cfg.Table, query)
	if err != nil {
		log.Printf("Failed to fetch videos: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch videos", "details": err.Error()})
		return
	}

	var videos []types.VideoMetadata
	if err := json.Unmarshal(respData, &videos); err != nil {
		log.Printf("Failed to parse videos: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse videos"})
		return
	}

	c.JSON(http.StatusOK, videos)
}

// getComboVideos handles the direct query for combo videos
func getComboVideos(c *gin.Context, cfg types.MediaConfig, comboId string, userId string) {
	// For combos, the comboId IS the UserCombos.id, so query is simpler
	query := fmt.Sprintf("?%s=eq.%s&media_type=eq.video&upload_status=eq.completed&order=created_at.desc&select=*", cfg.ForeignKey, comboId)

	respData, err := clients.Supabase.Select(cfg.Table, query)
	if err != nil {
		log.Printf("Failed to fetch combo videos: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch videos", "details": err.Error()})
		return
	}

	var videos []types.VideoMetadata
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
	userId := c.GetString("userId")
	videoType := types.VideoType(c.Query("type"))

	cfg, ok := types.GetMediaConfig(videoType)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or missing video type query parameter"})
		return
	}

	video.DeleteCore(c, cfg, videoId, userId)
}
