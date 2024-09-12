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

// Package protoc-gen-inspect will result in a file named code_generator_request.json being generated
// that is the JSON-encoded input CodeGeneratorRequest.
package main

import (
	"context"

	"github.com/bufbuild/protoplugin"
	"google.golang.org/protobuf/encoding/protojson"
)

const fileName = "code_generator_request.json"

func main() {
	protoplugin.Main(protoplugin.HandlerFunc(handle))
}

func handle(
	_ context.Context,
	_ protoplugin.PluginEnv,
	responseWriter protoplugin.ResponseWriter,
	request protoplugin.Request,
) error {
	data, err := protojson.MarshalOptions{
		Indent: "  ",
	}.Marshal(request.CodeGeneratorRequest())
	if err != nil {
		responseWriter.AddError(err.Error())
		return nil
	}
	responseWriter.AddFile(fileName, string(data))
	return nil
}
