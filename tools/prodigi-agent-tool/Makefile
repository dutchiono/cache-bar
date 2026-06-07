.PHONY: build test lint install clean

build:
	go build -o bin/prodigi-pp-cli ./cmd/prodigi-pp-cli

test:
	go test ./...

lint:
	golangci-lint run

install:
	go install ./cmd/prodigi-pp-cli

clean:
	rm -rf bin/

build-mcp:
	go build -o bin/prodigi-pp-mcp ./cmd/prodigi-pp-mcp

install-mcp:
	go install ./cmd/prodigi-pp-mcp

build-all: build build-mcp
