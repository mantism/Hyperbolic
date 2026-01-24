package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/hyperbolic/dolos-web-service/clients"
	"github.com/hyperbolic/dolos-web-service/handlers"
	"github.com/hyperbolic/dolos-web-service/middleware"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize clients (must be after loading env vars)
	clients.Init()

	// Initialize Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(middleware.CORS())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Video upload endpoints
		videos := v1.Group("/videos")
		videos.Use(middleware.Auth()) // Require authentication
		{
			// Trick video endpoints
			videos.POST("/trick/upload/request", handlers.RequestTrickVideoUpload)
			videos.POST("/trick/upload/complete", handlers.CompleteTrickVideoUpload)
			videos.POST("/trick/:videoId/thumbnail", handlers.UploadTrickThumbnail)
			videos.GET("/trick/:trickId", handlers.GetTrickVideos)
			videos.DELETE("/trick/:videoId", handlers.DeleteTrickVideo)

			// Combo video endpoints
			videos.POST("/combo/upload/request", handlers.RequestComboVideoUpload)
			videos.POST("/combo/upload/complete", handlers.CompleteComboVideoUpload)
			videos.POST("/combo/:videoId/thumbnail", handlers.UploadComboThumbnail)
			videos.GET("/combo/:comboId", handlers.GetComboVideos)
			videos.DELETE("/combo/:videoId", handlers.DeleteComboVideo)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}