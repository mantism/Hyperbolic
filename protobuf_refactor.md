# Protocol Buffers Refactor Plan

## Current State
We have successfully migrated to a monorepo architecture with:
- **apps/mobile** - React Native app
- **services/api** - Go server for video uploads
- **packages/shared-types** - TypeScript type definitions

Currently using TypeScript interfaces in `shared-types` that are manually kept in sync with Go structs.

## Objective
Introduce Protocol Buffers as the single source of truth for type definitions across TypeScript and Go, while maintaining backward compatibility with existing code.

## Benefits
1. **Type Safety** - Single source of truth eliminates drift between frontend/backend types
2. **Code Generation** - Auto-generate TypeScript interfaces and Go structs
3. **API Documentation** - Proto files serve as living API documentation
4. **Future-Proof** - Easy path to gRPC if needed later
5. **Versioning** - Built-in support for backward-compatible schema evolution

## Implementation Strategy

### Phase 1: Setup Proto Infrastructure
```
packages/
├── proto/                  # Proto definitions
│   ├── src/
│   │   ├── video.proto    # Video upload types
│   │   ├── trick.proto    # Trick-related types
│   │   ├── user.proto     # User-related types
│   │   └── common.proto   # Shared messages (timestamps, etc)
│   └── package.json
├── proto-gen-ts/          # Generated TypeScript
│   └── src/
└── proto-gen-go/          # Generated Go code
```

### Phase 2: Define Proto Messages

#### video.proto
```protobuf
syntax = "proto3";
package hyperbolic.video.v1;

message VideoUploadRequest {
  string trick_id = 1;
  string user_id = 2;
  string file_name = 3;
  int64 file_size = 4;
  string mime_type = 5;
  optional int32 duration = 6;
}

message VideoUploadResponse {
  string upload_url = 1;
  string video_id = 2;
  string expires_at = 3;
}

message VideoMetadata {
  string id = 1;
  string trick_id = 2;
  string user_id = 3;
  string url = 4;
  optional string thumbnail_url = 5;
  optional int32 duration = 6;
  int64 file_size = 7;
  string mime_type = 8;
  string uploaded_at = 9;
  VideoStatus status = 10;
}

enum VideoStatus {
  VIDEO_STATUS_UNSPECIFIED = 0;
  VIDEO_STATUS_PENDING = 1;
  VIDEO_STATUS_PROCESSING = 2;
  VIDEO_STATUS_COMPLETED = 3;
  VIDEO_STATUS_FAILED = 4;
}
```

#### trick.proto
```protobuf
syntax = "proto3";
package hyperbolic.trick.v1;

message Trick {
  string id = 1;
  string name = 2;
  optional string description = 3;
  repeated string categories = 4;
  optional int32 rating = 5;
  repeated string prerequisite_ids = 6;
  repeated string progression_ids = 7;
  string created_at = 8;
  string updated_at = 9;
}

message UserTrick {
  string id = 1;
  string user_id = 2;
  string trick_id = 3;
  int32 attempts = 4;
  int32 stomps = 5;
  bool landed = 6;
  optional int32 rating = 7;
  bool is_goal = 8;
  string created_at = 9;
  string updated_at = 10;
}
```

### Phase 3: Code Generation Setup

#### package.json scripts
```json
{
  "scripts": {
    "proto:generate": "npm run proto:generate:ts && npm run proto:generate:go",
    "proto:generate:ts": "protoc --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=../proto-gen-ts/src --ts_proto_opt=esModuleInterop=true,outputEncodeMethods=false,outputJsonMethods=true,outputClientImpl=false ./src/*.proto",
    "proto:generate:go": "protoc --go_out=../proto-gen-go --go_opt=paths=source_relative ./src/*.proto"
  }
}
```

### Phase 4: Integration Approach

#### Gradual Migration Strategy
1. **Keep existing TypeScript types** in `packages/shared-types` (no breaking changes)
2. **Generate proto types** in parallel in `packages/proto-gen-ts`
3. **Create adapters** to convert between old types and proto types
4. **New features** use proto types directly
5. **Migrate existing code** gradually as we touch each module

#### Example Adapter Pattern
```typescript
// packages/shared-types/src/adapters/video.adapter.ts
import { VideoUploadRequest as ProtoRequest } from '@hyperbolic/proto-gen-ts';
import { VideoUploadRequest as LegacyRequest } from '../video';

export function toProto(legacy: LegacyRequest): ProtoRequest {
  return {
    trickId: legacy.trickId,
    userId: legacy.userId,
    fileName: legacy.fileName,
    fileSize: legacy.fileSize,
    mimeType: legacy.mimeType,
    duration: legacy.duration,
  };
}

export function fromProto(proto: ProtoRequest): LegacyRequest {
  return {
    trickId: proto.trickId,
    userId: proto.userId,
    fileName: proto.fileName,
    fileSize: proto.fileSize,
    mimeType: proto.mimeType,
    duration: proto.duration,
  };
}
```

## Dependencies to Install

### Proto Package
```bash
# TypeScript generation
npm install --save-dev @bufbuild/protoc-gen-ts ts-proto

# Go generation (install globally)
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

## Migration Timeline

1. **Week 1**: Set up proto packages and generation scripts
2. **Week 2**: Define all proto messages based on existing types
3. **Week 3**: Implement adapters and test with video upload feature
4. **Week 4**: Begin gradual migration of existing code

## Success Criteria

- [ ] All new types defined in proto first
- [ ] Zero breaking changes to existing code
- [ ] Automated proto → code generation in CI/CD
- [ ] Type safety between Go and TypeScript
- [ ] Documentation auto-generated from proto comments

## Future Considerations

1. **gRPC Migration** - Proto files make it easy to add gRPC later
2. **API Versioning** - Use proto packages (v1, v2) for versioning
3. **Schema Registry** - Consider Buf Schema Registry for proto management
4. **Validation** - Add protoc-gen-validate for field validation rules

## Notes for Next Session

When implementing:
1. Start by creating the proto package structure
2. Install protobuf compiler and plugins
3. Define video.proto first (smallest scope)
4. Test generation for both TypeScript and Go
5. Create adapters to maintain backward compatibility
6. Update Go server to use generated types
7. Keep existing TypeScript types unchanged