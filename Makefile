# Makefile

# Variables
PACKAGE_MANAGER := npm
DIST_DIR := dist

# Install dependencies
install:
	$(PACKAGE_MANAGER) install

# Run in development mode
dev:
	$(PACKAGE_MANAGER) run dev

# Build the project
build:
	$(PACKAGE_MANAGER) run build

# Start the server in production mode
start: build
	node $(DIST_DIR)/index.js