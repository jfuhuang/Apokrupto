#!/bin/bash
# =============================================================
# Apokrupto Dev Environment Setup
# Launches Windows apps + starts server & client via tmux
# =============================================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

DOCKER_DESKTOP_EXE="/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe"
ANDROID_STUDIO_EXE="/mnt/c/Program Files/Android/Android Studio/bin/studio64.exe"
ANDROID_HOME="/mnt/c/Users/jackf/AppData/Local/Android/Sdk"
AVD_NAME="Medium_Phone_API_36.1"
TMUX_SESSION="apokrupto"

log()  { echo -e "\033[0;36m[setup]\033[0m $1"; }
ok()   { echo -e "\033[0;32m[setup]\033[0m $1"; }
warn() { echo -e "\033[0;33m[setup]\033[0m WARNING: $1"; }

launch_windows_app() {
    local exe="$1"
    local name="$2"
    if [ -f "$exe" ]; then
        log "Launching $name..."
        "$exe" &
        disown
    else
        warn "$name not found at: $exe"
    fi
}

# --- 1. Docker Desktop ---
launch_windows_app "$DOCKER_DESKTOP_EXE" "Docker Desktop"

# --- 2. VS Code ---
if command -v code &>/dev/null; then
    log "Opening VS Code in $PROJECT_DIR..."
    code "$PROJECT_DIR"
else
    warn "VS Code CLI (code) not found in PATH"
fi

# --- 3. Android Studio ---
launch_windows_app "$ANDROID_STUDIO_EXE" "Android Studio"

# --- 4. Android Emulator ---
EMULATOR_EXE="$ANDROID_HOME/emulator/emulator.exe"
if [ -f "$EMULATOR_EXE" ]; then
    log "Starting Android emulator ($AVD_NAME)..."
    "$EMULATOR_EXE" -avd "$AVD_NAME" &
    disown
else
    warn "Android emulator not found at: $EMULATOR_EXE"
fi

# --- 5. Server & Client via tmux ---
if ! command -v tmux &>/dev/null; then
    warn "tmux not found. Install it with: sudo apt install tmux"
    log "Starting server and client in background instead..."
    cd "$PROJECT_DIR/server" && npm run dev &
    cd "$PROJECT_DIR/client" && npm start &
    wait
    exit 0
fi

# Kill any existing session with the same name
tmux kill-session -t "$TMUX_SESSION" 2>/dev/null

log "Starting tmux session '$TMUX_SESSION'..."

# Create session with a server window
tmux new-session -d -s "$TMUX_SESSION" -n "server" -x 220 -y 50
tmux send-keys -t "$TMUX_SESSION:server" "cd '$PROJECT_DIR/server' && npm run dev" Enter

# Add a client window
tmux new-window -t "$TMUX_SESSION" -n "client"
tmux send-keys -t "$TMUX_SESSION:client" "cd '$PROJECT_DIR/client' && npm start" Enter

# Switch back to server window on attach
tmux select-window -t "$TMUX_SESSION:server"

ok "All done! Attaching to tmux session..."
ok "  Ctrl+B, 0  →  server  |  Ctrl+B, 1  →  client  |  Ctrl+B, D  →  detach"
echo ""
tmux attach -t "$TMUX_SESSION"
