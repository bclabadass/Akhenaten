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

# An App Store Connect API key (Team key, App Manager) signs in without the Xcode account session, which can expire.
# ~/.appstoreconnect/testflight.env sets ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_PATH (the .p8); it stays out of the repo.
# Without it, xcodebuild uses the Apple ID signed into Xcode.
AUTH=""
if [ -f "$HOME/.appstoreconnect/testflight.env" ]; then
    . "$HOME/.appstoreconnect/testflight.env"
    AUTH="-authenticationKeyPath $ASC_KEY_PATH -authenticationKeyID $ASC_KEY_ID -authenticationKeyIssuerID $ASC_ISSUER_ID"
fi

mkdir -p build-logs build-ios-archive
cmake "$BUILD_DIR" > "$LOG" 2>&1
grep 'GAME_BUILD_NUMBER now' "$LOG"

rm -rf "$ARCHIVE" build-ios-archive/upload
xcodebuild -project "$BUILD_DIR/akhenaten.xcodeproj" -scheme akhenaten -configuration "$CONFIG" \
    -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" -allowProvisioningUpdates $AUTH archive >> "$LOG" 2>&1 \
    || { grep -E 'error:|ARCHIVE FAILED' "$LOG" | grep -v install_name_tool | tail -20; exit 1; }

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
    -exportPath build-ios-archive/upload -allowProvisioningUpdates $AUTH > "$EXPORT_LOG" 2>&1 \
    || { grep -A2 -E 'error:|EXPORT FAILED' "$EXPORT_LOG"; exit 1; }
grep -E 'warning:|error:|Upload succeeded' "$EXPORT_LOG" | sort -u
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' -c 'Print :CFBundleVersion' \
    "$ARCHIVE/Products/Applications/akhenaten.app/Info.plist"
