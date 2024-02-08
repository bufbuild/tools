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
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path"
	"strings"

	"golang.org/x/sync/errgroup"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/pluginpb"
)

func main() {
	args := os.Args[1:] // Args from the command line invocation.
	if err := run(context.Background(), args, os.Stdin, os.Stdout); err != nil {
		fmt.Fprintf(os.Stderr, "failed: %v", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string, in io.Reader, out io.Writer) error {
	var input bytes.Buffer
	if _, err := io.Copy(&input, in); err != nil {
		return err
	}
	var request pluginpb.CodeGeneratorRequest
	if err := proto.Unmarshal(input.Bytes(), &request); err != nil {
		return err
	}
	var response pluginpb.CodeGeneratorResponse
	if err := generate(ctx, args, &request, &response); err != nil {
		response.Error = proto.String(err.Error())
	}
	output, err := proto.Marshal(&response)
	if err != nil {
		return err
	}
	if _, err := out.Write(output); err != nil {
		return err
	}
	return nil
}

func generate(ctx context.Context, args []string, request *pluginpb.CodeGeneratorRequest, response *pluginpb.CodeGeneratorResponse) error {
	// Parse args from request parameters and append to args.
	if params := request.GetParameter(); params != "" {
		params = strings.ReplaceAll(params, ",--", " --")  // Handle comma separated flags.
		args = append(args, strings.Split(params, " ")...) // Separate flags.
	}
	plugins, err := parsePlugins(args)
	if err != nil {
		return fmt.Errorf("invalid argument: %w", err)
	}
	group, ctx := errgroup.WithContext(ctx)
	outs := make([]pluginpb.CodeGeneratorResponse, len(plugins))
	for i, plugin := range plugins {
		plugin := plugin
		pluginRequest := proto.Clone(request).(*pluginpb.CodeGeneratorRequest)
		pluginResponse := &outs[i]
		// Execute the plugin in a separate goroutine.
		group.Go(func() error {
			if err := plugin.generate(ctx, pluginRequest, pluginResponse); err != nil {
				return fmt.Errorf("failed to execute plugin: %s: %w", plugin.name, err)
			}
			return nil
		})
	}
	// Wait for all plugins to complete.
	if err := group.Wait(); err != nil {
		return err
	}
	for i := range outs {
		// Merge the plugin response into the overall response.
		pluginResponse := &outs[i]
		response.Error = pluginResponse.Error
		if response.Error != nil {
			break
		}
		if response.SupportedFeatures != nil && pluginResponse.SupportedFeatures != nil {
			// AND the supported features.
			*response.SupportedFeatures &= *pluginResponse.SupportedFeatures
		} else if pluginResponse.SupportedFeatures != nil {
			response.SupportedFeatures = pluginResponse.SupportedFeatures
		}
		response.File = append(response.File, pluginResponse.File...)
	}
	return nil
}

// plugin represents a protoc plugin.
type plugin struct {
	name string // protoc-gen-<name>
	out  string // --<name>_out
	opt  string // --<name>_opt
}

// parsePlugins parses the plugins from the command line arguments.
// The command line arguments are expected to be in the form:
//
//	--<name>_out=<out>
//	--<name>_opt=<opt>
func parsePlugins(args []string) ([]plugin, error) {
	plugins := make([]plugin, 0, len(args)/2)
	pluginLookup := make(map[string]int, len(args)/2)
	getPlugin := func(name string) *plugin {
		if i, ok := pluginLookup[name]; ok {
			return &plugins[i]
		}
		plugins = append(plugins, plugin{name: name})
		pluginLookup[name] = len(plugins) - 1
		return &plugins[len(plugins)-1]
	}
	for _, flag := range args {
		if !strings.HasPrefix(flag, "--") {
			return nil, fmt.Errorf("expected protoc like flag \"--<name>_(out|opt)=<param>\": %q", flag)
		}
		keyvalue := strings.TrimPrefix(flag, "--")
		value, arg, _ := strings.Cut(keyvalue, "=")
		if strings.HasSuffix(value, "_out") {
			name := strings.TrimSuffix(value, "_out")
			plugin := getPlugin(name)
			plugin.name = name
			plugin.out = arg
		} else if strings.HasSuffix(value, "_opt") {
			name := strings.TrimSuffix(value, "_opt")
			plugin := getPlugin(name)
			plugin.name = name
			plugin.opt = arg
		} else {
			return nil, fmt.Errorf("expected suffix \"_opt\" or \"_out\": %q", flag)
		}
	}
	return plugins, nil
}

// generate executes the plugin with the given request and unmarshals the response.
// Modifies both the request and response in place.
func (p plugin) generate(ctx context.Context, pluginRequest *pluginpb.CodeGeneratorRequest, pluginResponse *pluginpb.CodeGeneratorResponse) error {
	pluginRequest.Parameter = proto.String(p.opt)
	pluginInput, err := proto.Marshal(pluginRequest)
	if err != nil {
		return err
	}
	name := "protoc-gen-" + p.name
	cmd := exec.CommandContext(ctx, name)
	cmd.Stdin = bytes.NewReader(pluginInput)
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s: %s", err, stderr.String())
	}
	if err := proto.Unmarshal(stdout.Bytes(), pluginResponse); err != nil {
		return err
	}
	for _, file := range pluginResponse.File {
		if file.Name != nil {
			file.Name = proto.String(path.Join(p.out, file.GetName()))
		}
	}
	return nil
}
