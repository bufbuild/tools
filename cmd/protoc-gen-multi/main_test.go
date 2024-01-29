// Copyright 2023 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"context"
	_ "embed"
	"os"
	"os/exec"
	"testing"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/pluginpb"
)

//go:embed testdata/request.json
var requestExample []byte

func TestGenerate(t *testing.T) {
	if _, err := exec.LookPath("protoc-gen-go"); err != nil {
		if os.IsNotExist(err) {
			t.Skip("protoc-gen-go not found")
		}
		t.Fatal(err)
	}
	var request pluginpb.CodeGeneratorRequest
	if err := protojson.Unmarshal(requestExample, &request); err != nil {
		t.Fatal(err)
	}
	var response pluginpb.CodeGeneratorResponse
	if err := generate(context.Background(), nil, &request, &response); err != nil {
		t.Fatal(err)
	}
	if len(response.File) != 1 {
		t.Fatalf("expected 1 file, got %d", len(response.File))
	}
	if response.File[0].GetName() != "gen/example.pb.go" {
		t.Errorf("expected file name to be gen/example.pb.go, got %s", response.File[0].GetName())
	}
	if len(response.File[0].GetContent()) == 0 {
		t.Errorf("expected non-empty content")
	}
}
