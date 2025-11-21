package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
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
	handlers.InitClients()

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
			videos.POST("/upload/request", handlers.RequestVideoUpload)
			videos.POST("/upload/complete", handlers.CompleteVideoUpload)
			videos.POST("/:videoId/thumbnail", handlers.UploadThumbnail)
			videos.GET("/trick/:trickId", handlers.GetTrickVideos)
			videos.DELETE("/:videoId", handlers.DeleteVideo)
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