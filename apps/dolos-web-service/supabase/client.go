package supabase

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type Client struct {
	BaseURL    string
	ServiceKey string
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		BaseURL:    os.Getenv("SUPABASE_URL"),
		ServiceKey: os.Getenv("SUPABASE_SERVICE_KEY"),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// Generic method to make requests to Supabase REST API
func (c *Client) makeRequest(method, table, query string, body interface{}) ([]byte, error) {
	url := fmt.Sprintf("%s/rest/v1/%s%s", c.BaseURL, table, query)

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}

	// Set headers
	req.Header.Set("apikey", c.ServiceKey)
	req.Header.Set("Authorization", "Bearer "+c.ServiceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("supabase error %d: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Insert a record
func (c *Client) Insert(table string, data interface{}) ([]byte, error) {
	return c.makeRequest("POST", table, "", data)
}

// Update a record
func (c *Client) Update(table, query string, data interface{}) ([]byte, error) {
	return c.makeRequest("PATCH", table, query, data)
}

// Select records
func (c *Client) Select(table, query string) ([]byte, error) {
	return c.makeRequest("GET", table, query, nil)
}

// Delete a record
func (c *Client) Delete(table, query string) ([]byte, error) {
	return c.makeRequest("DELETE", table, query, nil)
}