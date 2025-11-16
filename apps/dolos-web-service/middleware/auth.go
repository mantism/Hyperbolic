package middleware

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// SupabaseClaims represents the JWT claims from Supabase
type SupabaseClaims struct {
	Sub   string `json:"sub"`   // User ID
	Email string `json:"email"` // User email
	Role  string `json:"role"`  // User role (authenticated, anon, etc.)
	jwt.RegisteredClaims
}

// JWKS represents the JSON Web Key Set structure
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a JSON Web Key
type JWK struct {
	Kid string `json:"kid"` // Key ID
	Kty string `json:"kty"` // Key type (EC)
	Crv string `json:"crv"` // Curve (P-256)
	X   string `json:"x"`   // X coordinate
	Y   string `json:"y"`   // Y coordinate
}

var (
	cachedJWKS     *JWKS
	jwksCacheMutex sync.RWMutex
	jwksCacheTime  time.Time
	jwksCacheTTL   = 1 * time.Hour
)

// fetchJWKS fetches the JWKS from Supabase
func fetchJWKS() (*JWKS, error) {
	jwksCacheMutex.RLock()
	if cachedJWKS != nil && time.Since(jwksCacheTime) < jwksCacheTTL {
		defer jwksCacheMutex.RUnlock()
		return cachedJWKS, nil
	}
	jwksCacheMutex.RUnlock()

	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL not configured")
	}

	jwksURL := fmt.Sprintf("%s/auth/v1/jwks", supabaseURL)
	resp, err := http.Get(jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read JWKS response: %w", err)
	}

	var jwks JWKS
	if err := json.Unmarshal(body, &jwks); err != nil {
		return nil, fmt.Errorf("failed to parse JWKS: %w", err)
	}

	// Cache the JWKS
	jwksCacheMutex.Lock()
	cachedJWKS = &jwks
	jwksCacheTime = time.Now()
	jwksCacheMutex.Unlock()

	return &jwks, nil
}

// getPublicKey finds and returns the ECDSA public key for the given kid
func getPublicKey(kid string) (*ecdsa.PublicKey, error) {
	jwks, err := fetchJWKS()
	if err != nil {
		return nil, err
	}

	for _, key := range jwks.Keys {
		if key.Kid == kid && key.Kty == "EC" && key.Crv == "P-256" {
			// Decode base64url encoded coordinates
			xBytes, err := base64.RawURLEncoding.DecodeString(key.X)
			if err != nil {
				return nil, fmt.Errorf("failed to decode X coordinate: %w", err)
			}
			yBytes, err := base64.RawURLEncoding.DecodeString(key.Y)
			if err != nil {
				return nil, fmt.Errorf("failed to decode Y coordinate: %w", err)
			}

			// Create public key
			publicKey := &ecdsa.PublicKey{
				Curve: elliptic.P256(),
				X:     new(big.Int).SetBytes(xBytes),
				Y:     new(big.Int).SetBytes(yBytes),
			}

			return publicKey, nil
		}
	}

	return nil, fmt.Errorf("key with kid %s not found in JWKS", kid)
}

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

		tokenString := parts[1]

		// Parse and verify JWT token
		token, err := jwt.ParseWithClaims(tokenString, &SupabaseClaims{}, func(token *jwt.Token) (interface{}, error) {
			// Verify signing method is ES256
			if _, ok := token.Method.(*jwt.SigningMethodECDSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}

			// Get kid from token header
			kid, ok := token.Header["kid"].(string)
			if !ok {
				return nil, fmt.Errorf("missing or invalid kid in token header")
			}

			// Fetch and return the public key
			return getPublicKey(kid)
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token", "details": err.Error()})
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(*SupabaseClaims)
		if !ok || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Verify user is authenticated (not anonymous)
		if claims.Role != "authenticated" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		// Set user ID and email in context for use in handlers
		c.Set("userId", claims.Sub)
		c.Set("userEmail", claims.Email)
		c.Set("token", tokenString)

		c.Next()
	}
}