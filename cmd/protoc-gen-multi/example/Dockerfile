# syntax=docker/dockerfile:1.6
FROM --platform=$BUILDPLATFORM golang:1.21-alpine AS build
ARG TARGETOS TARGETARCH

ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH 

# Install protoc-gen-multi, must be installed.
RUN go install -ldflags "-s -w" github.com/bufbuild/tools/cmd/protoc-gen-multi@latest

# Add custom plugins here
RUN go install -ldflags "-s -w" google.golang.org/protobuf/cmd/protoc-gen-go@v1.32 \
    && go install -ldflags "-s -w" google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3 \
    && go install -ldflags "-s -w" github.com/planetscale/vtprotobuf/cmd/protoc-gen-go-vtproto@v0.6.0 \
    && go install -ldflags "-s -w" github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@v2.19

# Move binaries prefixed with GOOS_GOARCH to /go/bin.
RUN mv /go/bin/${TARGETOS}_${TARGETARCH}/* /go/bin || true

# Build final image.
FROM scratch
COPY --from=build --link /etc/passwd /etc/passwd
COPY --from=build /go/bin/ /bin
USER nobody
ENTRYPOINT [ "protoc-gen-multi" ]
