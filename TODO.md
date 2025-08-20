# Hyperbolic App - Todo List

## Completed Tasks ✅
- Create Trick Arsenal screen with tabs for My Tricks and Wishlist
- Implement trick cards showing name, rating, and stats
- Fix Supabase client configuration (minimal working setup)
- Restore proper Arsenal UI with trick names

## Pending Tasks 📋

### High Priority
- **Re-enable RLS on UserToTricksTable for security** 
  - Run: `ALTER TABLE "UserToTricksTable" ENABLE ROW LEVEL SECURITY;`
- **Add functionality to move tricks between arsenal and wishlist**
  - Implement "Mark as Landed" button functionality
  - Add ability to move tricks between tabs

### Medium Priority  
- **Create trick detail screen with video upload capability**
  - Screen to view individual trick details
  - Video upload/playback functionality
- **Implement rating system (1-10) for tricks**
  - Allow users to rate tricks in their arsenal
- **Improve Arsenal card styling**
  - Better visual design for trick cards

### Low Priority
- **TODO: Implement custom word-based OTP system with email sending**
  - Replace 6-digit numeric OTP with word-based system like Notion
- **Test session persistence on production build** 
  - Session persistence works in production but not development
  - Current setup: no persistence (users must re-login on app restart)

## Technical Notes 📝

### Current Status
- ✅ Authentication working (OTP-based)
- ✅ Arsenal screen fully functional 
- ✅ Database queries working with RLS policies
- ❌ Session persistence disabled due to Supabase client storage conflicts

### Known Issues
- Session persistence causes Supabase client to hang in development
- Any custom storage adapter (AsyncStorage, SecureStore, custom) breaks queries
- Working with minimal Supabase client config: `persistSession: false, autoRefreshToken: false`

### Database Schema
- `TricksTable` - Trick catalog with difficulty ratings
- `UsersTable` - User profiles (linked by email to auth.users)  
- `UserToTricksTable` - Links users to their learned tricks (uses auth user IDs after migration)