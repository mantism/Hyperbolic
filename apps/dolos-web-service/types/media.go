package types

// MediaConfig holds table and path configuration for trick vs combo media
type MediaConfig struct {
	Table            string // TrickMedia or ComboMedia
	ParentTable      string // UserToTricks or UserCombos
	PathPrefix       string // tricks or combos
	ForeignKey       string // user_trick_id or user_combo_id
	ParentIDCol      string // trickID or id (column name in parent table)
	UserIDCol        string // userID or user_id (column name in parent table)
	AutoCreateUserLink bool // Whether to auto-create UserToTricks link record if not found
}

// MediaConfigs maps VideoType to its corresponding MediaConfig
var MediaConfigs = map[VideoType]MediaConfig{
	VideoTypeTrick: {
		Table:            "TrickMedia",
		ParentTable:      "UserToTricks",
		PathPrefix:       "tricks",
		ForeignKey:       "user_trick_id",
		ParentIDCol:      "trickID",
		UserIDCol:        "userID",
		AutoCreateUserLink: true,
	},
	VideoTypeCombo: {
		Table:            "ComboMedia",
		ParentTable:      "UserCombos",
		PathPrefix:       "combos",
		ForeignKey:       "user_combo_id",
		ParentIDCol:      "id",
		UserIDCol:        "user_id",
		AutoCreateUserLink: false,
	},
}

// GetMediaConfig returns the MediaConfig for a given VideoType
func GetMediaConfig(videoType VideoType) (MediaConfig, bool) {
	cfg, ok := MediaConfigs[videoType]
	return cfg, ok
}
