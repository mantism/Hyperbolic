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

var trickMediaConfig = types.MediaConfig{
	Table:       "TrickMedia",
	ParentTable: "UserToTricks",
	PathPrefix:  "tricks",
	ForeignKey:  "user_trick_id",
	ParentIDCol: "trickID",
	UserIDCol:   "userID",
}

// RequestTrickVideoUpload generates a presigned URL for trick video upload
func RequestTrickVideoUpload(c *gin.Context) {
	var req types.TrickVideoUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	video.RequestUploadCore(c, trickMediaConfig, req.TrickID, req.UserID, req.FileSize, req.MimeType, req.Duration, true)
}

// UploadTrickThumbnail handles thumbnail upload for trick videos
func UploadTrickThumbnail(c *gin.Context) {
	videoId := c.Param("videoId")
	userId := c.GetString("userId")
	video.UploadThumbnailCore(c, trickMediaConfig, videoId, userId)
}

// CompleteTrickVideoUpload confirms trick video upload completion
func CompleteTrickVideoUpload(c *gin.Context) {
	var req struct {
		VideoId string `json:"videoId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	video.CompleteUploadCore(c, trickMediaConfig, req.VideoId)
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

	respData, err := clients.Supabase.Select("TrickMedia", query)
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

// DeleteTrickVideo removes a trick video
func DeleteTrickVideo(c *gin.Context) {
	videoId := c.Param("videoId")
	userId := c.GetString("userId")
	video.DeleteCore(c, trickMediaConfig, videoId, userId)
}
