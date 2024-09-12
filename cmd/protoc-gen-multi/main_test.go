// Copyright 2023-2024 Buf Technologies, Inc.
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
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/pluginpb"
)

//go:embed testdata/request.json
var requestExample []byte

func TestGenerate(t *testing.T) {
	assertExist(t, "protoc-gen-go")
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
	if want, got := "gen/example.pb.go", response.File[0].GetName(); got != want {
		t.Errorf("expected file name to be %s, got %s", want, got)
	}
	if len(response.File[0].GetContent()) == 0 {
		t.Errorf("expected non-empty content")
	}
}

func TestGenerateMulti(t *testing.T) {
	assertExist(t, "protoc-gen-go")
	assertExist(t, "protoc-gen-go-vtproto")
	var request pluginpb.CodeGeneratorRequest
	if err := protojson.Unmarshal(requestExample, &request); err != nil {
		t.Fatal(err)
	}
	request.Parameter = proto.String("--go_out=gen --go_opt=paths=source_relative --go-vtproto_out=gen --go-vtproto_opt=paths=source_relative --go-vtproto_opt=features=marshal+unmarshal+size")
	var response pluginpb.CodeGeneratorResponse
	if err := generate(context.Background(), nil, &request, &response); err != nil {
		t.Fatal(err)
	}
	if len(response.File) != 2 {
		t.Fatalf("expected 2 file, got %d", len(response.File))
	}
	if want, got := "gen/example.pb.go", response.File[0].GetName(); got != want {
		t.Errorf("expected file name to be %s, got %s", want, got)
	}
	if len(response.File[0].GetContent()) == 0 {
		t.Errorf("expected non-empty content")
	}
	if want, got := "gen/example_vtproto.pb.go", response.File[1].GetName(); got != want {
		t.Errorf("expected file name to be %s, got %s", want, got)
	}
	if len(response.File[1].GetContent()) == 0 {
		t.Errorf("expected non-empty content")
	}
}

func assertExist(t *testing.T, plugin string) {
	t.Helper()
	if _, err := exec.LookPath(plugin); err != nil {
		if os.IsNotExist(err) {
			t.Skipf("%s not found", plugin)
		}
		t.Fatal(err)
	}
}
