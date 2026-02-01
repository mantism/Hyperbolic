# Future Tasks

## Offline Support & Background Sync

### Overview
Add offline-first capabilities so users can continue logging tricks and videos without internet connectivity. Data syncs automatically when connection is restored.

### Use Cases
- Training outdoors with spotty connectivity
- Recording videos during sessions without waiting for uploads
- Logging tricks quickly without network delays

### Scope
This would apply across the app:
- Trick logs
- Combo logs
- Video uploads
- Session data
- Possibly trick list caching

### Technical Approach

#### 1. Local Video Caching
- Save selected videos locally with metadata (trick log ID, pending upload flag)
- Show videos immediately from local cache
- Display sync status indicator on pending uploads

#### 2. Upload Queue Management
- Queue uploads when offline
- Persist queue to survive app restarts
- Process queue when connectivity restored
- Handle failures with retry logic

#### 3. Key Libraries
- `expo-file-system` - Local file storage
- `@react-native-async-storage/async-storage` or SQLite - Metadata/queue persistence
- `@react-native-community/netinfo` - Network state detection
- `expo-background-fetch` / `expo-task-manager` - Background upload processing

#### 4. UI Considerations
- Pending/syncing indicators on logs with unsynced data
- Upload progress for queued items
- Conflict resolution if same data modified on multiple devices

### Implementation Phases

**Phase 1: Local Video Display**
- Cache video locally after selection
- Display from local file immediately
- Upload in foreground, update status when complete

**Phase 2: Background Upload Queue**
- Implement persistent upload queue
- Add network state detection
- Process queue in background when online

**Phase 3: Full Offline Mode**
- Cache trick/combo lists for offline access
- Allow creating logs while offline
- Sync all pending data on reconnect

### Notes
- Consider Supabase Realtime subscriptions as part of this work for live sync
- May want to show "last synced" timestamp in UI
- Need to handle storage limits (auto-cleanup of old cached videos)
