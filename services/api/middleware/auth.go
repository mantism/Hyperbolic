package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Auth middleware to verify Supabase JWT tokens
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]

		// TODO: Verify JWT token with Supabase
		// For now, we'll do a simple check
		// In production, use a proper JWT library to verify the token
		
		// Extract user ID from token (placeholder)
		// In production, decode the JWT and extract the user ID
		userId := "placeholder-user-id"
		
		// Set user ID in context for use in handlers
		c.Set("userId", userId)
		c.Set("token", token)

		c.Next()
	}
}