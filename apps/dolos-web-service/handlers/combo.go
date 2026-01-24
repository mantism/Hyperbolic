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

var comboMediaConfig = types.MediaConfig{
	Table:       "ComboMedia",
	ParentTable: "UserCombos",
	PathPrefix:  "combos",
	ForeignKey:  "user_combo_id",
	ParentIDCol: "id",
	UserIDCol:   "user_id",
}

// RequestComboVideoUpload generates a presigned URL for combo video upload
func RequestComboVideoUpload(c *gin.Context) {
	var req types.ComboVideoUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	video.RequestUploadCore(c, comboMediaConfig, req.ComboID, req.UserID, req.FileSize, req.MimeType, req.Duration, false)
}

// UploadComboThumbnail handles thumbnail upload for combo videos
func UploadComboThumbnail(c *gin.Context) {
	videoId := c.Param("videoId")
	userId := c.GetString("userId")
	video.UploadThumbnailCore(c, comboMediaConfig, videoId, userId)
}

// CompleteComboVideoUpload confirms combo video upload completion
func CompleteComboVideoUpload(c *gin.Context) {
	var req struct {
		VideoId string `json:"videoId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	video.CompleteUploadCore(c, comboMediaConfig, req.VideoId)
}

// GetComboVideos returns all videos for a combo, optionally filtered by user
func GetComboVideos(c *gin.Context) {
	comboId := c.Param("comboId")
	userId := c.Query("userId") // Optional user filter

	// For combos, the comboId IS the UserCombos.id, so query is simpler
	var query string
	if userId != "" {
		query = fmt.Sprintf("?user_combo_id=eq.%s&media_type=eq.video&upload_status=eq.completed&order=created_at.desc&select=*", comboId)
	} else {
		query = fmt.Sprintf("?user_combo_id=eq.%s&media_type=eq.video&upload_status=eq.completed&order=created_at.desc&select=*", comboId)
	}

	respData, err := clients.Supabase.Select("ComboMedia", query)
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

// DeleteComboVideo removes a combo video
func DeleteComboVideo(c *gin.Context) {
	videoId := c.Param("videoId")
	userId := c.GetString("userId")
	video.DeleteCore(c, comboMediaConfig, videoId, userId)
}
