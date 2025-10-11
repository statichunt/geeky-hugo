#!/bin/bash

# default versions
NODE_VERSION='20.10.0';
GO_VERSION='1.23.3';
HUGO_VERSION='0.147.2';

# install Node.js
# echo "Installing Node.js $NODE_VERSION..."
# curl -sSOL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}.tar.gz
# tar -xzf node-v${NODE_VERSION}.tar.gz
# export PATH=$PATH:/usr/local/bin
# rm -rf node-v${NODE_VERSION}.tar.gz

echo "USING NODE VERSION: $(node -v)"

# install Go
echo "Installing Go $GO_VERSION..."
curl -sSOL https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz
tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
rm -rf go${GO_VERSION}.linux-amd64.tar.gz
go version

# install Hugo
echo "Installing Hugo $HUGO_VERSION..."
curl -sSOL https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz
tar -xzf hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz
mv hugo /usr/local/bin/
rm -rf hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz
hugo version



# install dependencies
echo "Installing project dependencies..."
npm install

# run the build command
echo "Running Hugo build..."
cd exampleSite

# Remove any potential go.mod files that might cause module issues
rm -f go.mod go.sum hugo.toml
find . -name "go.mod" -delete 2>/dev/null || true
find . -name "go.sum" -delete 2>/dev/null || true

# Create themes directory and symlink as backup
mkdir -p themes
ln -sf ../.. themes/geeky-hugo 2>/dev/null || true

# Create a temporary Hugo config to explicitly disable modules
cat > hugo-temp.toml << EOF
# Temporary config to disable Hugo modules
[module]
  proxy = "off"
  noProxy = "*"
  private = "*"
  
[[module.mounts]]
  source = "assets"
  target = "assets"

[[module.mounts]]
  source = "layouts"  
  target = "layouts"

[[module.mounts]]
  source = "static"
  target = "static"

[[module.mounts]]
  source = "archetypes"
  target = "archetypes"
EOF

# Disable Hugo modules via environment
export GO111MODULE=off
export GOPATH=/tmp/go
export GOPROXY=off

# Build with module config override
hugo --config config/_default/config.toml,hugo-temp.toml --gc --minify -d public

# If that fails, try with themesDir as backup
if [ $? -ne 0 ]; then
    rm -f hugo-temp.toml
    hugo --config config/_default/config.toml --gc --minify --themesDir ../.. -d public --ignoreCache
fi

# Clean up
rm -f hugo-temp.toml
