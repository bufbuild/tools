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

// Package main implements a protoc plugin that takes a CodeGeneratorRequest
// produced by buf with strategy:all, and splits it into per-directory CodeGeneratorRequests
// in the manner that buf would do with strategy:directory. This allows remote
// plugins to invoke plugins in a per-directory fashion, but with one Docker
// container invocation.
//
// To specify which plugin to use, use the PLUGIN_PATH environment variable key.
//
// PLUGIN_PATH=protoc-gen-grpc-gateway protoc --by-dir_out=. $(find . -name '*.proto')
package main

import (
	"context"
	"fmt"
	"strings"

	"github.com/bufbuild/buf/private/buf/bufpluginexec"
	"github.com/bufbuild/buf/private/bufpkg/bufimage"
	"github.com/bufbuild/buf/private/pkg/command"
	"github.com/bufbuild/buf/private/pkg/thread"
	"github.com/bufbuild/buf/private/pkg/tracing"
	"github.com/bufbuild/protoplugin"
)

const pluginPathEnvKey = "PLUGIN_PATH"

func main() {
	protoplugin.Main(protoplugin.HandlerFunc(handle))
}

func handle(
	ctx context.Context,
	pluginEnv protoplugin.PluginEnv,
	responseWriter protoplugin.ResponseWriter,
	request protoplugin.Request,
) error {
	pluginPath := getEnv(pluginEnv.Environ, pluginPathEnvKey)
	if pluginPath == "" {
		return fmt.Errorf("must set %s", pluginPathEnvKey)
	}
	image, err := bufimage.NewImageForCodeGeneratorRequest(request.CodeGeneratorRequest())
	if err != nil {
		return err
	}
	imagesByDir, err := bufimage.ImageByDir(image)
	if err != nil {
		return err
	}
	requestsByDir, err := bufimage.ImagesToCodeGeneratorRequests(
		imagesByDir,
		request.Parameter(),
		request.CompilerVersion().ToProto(),
		false,
		false,
	)
	if err != nil {
		return err
	}
	handler, err := bufpluginexec.NewBinaryHandler(command.NewRunner(), tracing.NopTracer, pluginPath, nil)
	if err != nil {
		return err
	}
	jobs := make([]func(context.Context) error, 0, len(requestsByDir))
	for _, requestByDir := range requestsByDir {
		jobs = append(
			jobs,
			func(ctx context.Context) error {
				request, err := protoplugin.NewRequest(requestByDir)
				if err != nil {
					return err
				}
				return handler.Handle(ctx, pluginEnv, responseWriter, request)
			},
		)
	}
	if err := thread.Parallelize(ctx, jobs); err != nil {
		return err
	}
	return nil
}

func getEnv(environ []string, key string) string {
	for _, e := range environ {
		split := strings.SplitN(e, "=", 2)
		if len(split) != 2 {
			continue
		}
		if split[0] == key {
			return split[1]
		}
	}
	return ""
}
