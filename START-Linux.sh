#!/usr/bin/env bash
# Monetra - start the local server and open it in your browser.
# Standalone: this file needs nothing else, so you can rename it freely.

cd "$(dirname "$0")" || exit 1

URL="http://localhost:8080"
JAR="lib/sqlite-jdbc-3.53.4.0/sqlite-jdbc-3.53.4.0.jar"

die() {
  echo
  echo "$1"
  echo
  read -r -p "Press Enter to close this window..." _
  exit 1
}

command -v java >/dev/null 2>&1 || die "Java 21 or newer is required. Install it from https://adoptium.net and run this file again."
[ -f "$JAR" ] || die "Missing database driver: $JAR"

if command -v javac >/dev/null 2>&1; then
  echo "Building Monetra..."
  javac --add-modules jdk.httpserver -d out src/MonetraServer.java || die "Build failed. See the errors above."
elif [ ! -f out/MonetraServer.class ]; then
  die "Monetra is not compiled and no JDK was found. Install JDK 21 from https://adoptium.net and run this file again."
fi

if [ "$(uname)" = "Darwin" ]; then
  opener="open"
elif command -v xdg-open >/dev/null 2>&1; then
  opener="xdg-open"
else
  opener=""
fi

open_url() {
  if [ -n "$opener" ]; then
    "$opener" "$URL" >/dev/null 2>&1
  else
    echo "Open $URL in your browser."
  fi
}

if curl -fsS --max-time 1 "$URL/api/health" >/dev/null 2>&1; then
  echo "Monetra is already running."
  open_url
  exit 0
fi

native=()
if java --enable-native-access=ALL-UNNAMED -version >/dev/null 2>&1; then
  native=(--enable-native-access=ALL-UNNAMED)
fi

echo
echo "  Monetra is starting at $URL"
echo "  Keep this window open while you use the app."
echo "  Close it or press Ctrl+C to stop the server."
echo

(
  i=0
  while [ "$i" -lt 120 ]; do
    if curl -fsS --max-time 1 "$URL/api/health" >/dev/null 2>&1; then
      open_url
      exit 0
    fi
    sleep 0.5
    i=$((i + 1))
  done
) &

exec java "${native[@]}" --add-modules jdk.httpserver -cp "out:$JAR" MonetraServer
