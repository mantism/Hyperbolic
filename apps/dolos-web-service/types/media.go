package types

// MediaConfig holds table and path configuration for trick vs combo media
type MediaConfig struct {
	Table       string // TrickMedia or ComboMedia
	ParentTable string // UserToTricks or UserCombos
	PathPrefix  string // tricks or combos
	ForeignKey  string // user_trick_id or user_combo_id
	ParentIDCol string // trickID or id (column name in parent table)
	UserIDCol   string // userID or user_id (column name in parent table)
}
