#!/bin/sh
# Archive the iOS build and upload it to App Store Connect (TestFlight).
# Run from the repo root after committing: the build number is the git commit count at configure time,
# so an upload without a new commit is rejected as a duplicate.
set -eu

BUILD_DIR=build-ios-device
ARCHIVE=build-ios-archive/iKhenaten.xcarchive
CONFIG=RelWithDebInfo
LOG=build-logs/current.log
EXPORT_LOG=build-logs/testflight-export.log

mkdir -p build-logs build-ios-archive
cmake "$BUILD_DIR" > "$LOG" 2>&1
grep 'GAME_BUILD_NUMBER now' "$LOG"

rm -rf "$ARCHIVE" build-ios-archive/upload
xcodebuild -project "$BUILD_DIR/akhenaten.xcodeproj" -scheme akhenaten -configuration "$CONFIG" \
    -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" -allowProvisioningUpdates archive >> "$LOG" 2>&1

# CMake's build folder keeps the dSYM out of the archive; copy it in so crash reports get symbols.
DSYM="$BUILD_DIR/$CONFIG-iphoneos/akhenaten.app.dSYM"
APP_UUID=$(dwarfdump --uuid "$ARCHIVE/Products/Applications/akhenaten.app/akhenaten" | awk '{print $2}')
DSYM_UUID=$(dwarfdump --uuid "$DSYM" | awk '{print $2}')
if [ "$APP_UUID" != "$DSYM_UUID" ]; then
    echo "dSYM UUID $DSYM_UUID does not match the app $APP_UUID" >&2
    exit 1
fi
mkdir -p "$ARCHIVE/dSYMs"
cp -R "$DSYM" "$ARCHIVE/dSYMs/"

xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist res/ios/ExportOptions-AppStore.plist \
    -exportPath build-ios-archive/upload -allowProvisioningUpdates > "$EXPORT_LOG" 2>&1
grep -E 'warning:|error:|Upload succeeded' "$EXPORT_LOG" | sort -u
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' -c 'Print :CFBundleVersion' \
    "$ARCHIVE/Products/Applications/akhenaten.app/Info.plist"
