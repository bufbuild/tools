# syntax=docker/dockerfile:1.6
FROM --platform=$BUILDPLATFORM golang:1.21-alpine AS build
ARG TARGETOS TARGETARCH

# Add custom plugins here
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go install -ldflags "-s -w" google.golang.org/protobuf/cmd/protoc-gen-go@v1.32 \
    && go install -ldflags "-s -w" google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3 \
    && go install -ldflags "-s -w" github.com/planetscale/vtprotobuf/cmd/protoc-gen-go-vtproto@v0.5.0 \
    && go install -ldflags "-s -w" github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@v2.19

# Install protoc-gen-multi, must be installed.
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go install -ldflags "-s -w" github.com/bufbuild/tools/cmd/protoc-gen-multi@latest

# Move binaries prefixed with GOOS_GOARCH to /go/bin.
RUN mv /go/bin/$TARGETOS_$TARGETARCH/* /go/bin || true

# Build final image.
FROM scratch
COPY --from=build --link /etc/passwd /etc/passwd
COPY --from=build /go/bin/ /bin
USER nobody
ENTRYPOINT [ "protoc-gen-multi" ]
