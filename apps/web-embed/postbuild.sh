#!/usr/bin/env bash

# set -x

# mkdir -p ./web-build/.well-known

# rm -rf ../app/android/app/src/main/assets/web-embed
# mkdir -p ../mobile/android/app/src/main/assets
# rsync -r -c -v ./web-build/ ../mobile/android/app/src/main/assets/web-embed/

# rm -rf ../app/ios/OneKeyWallet/web-embed/
# rsync -r -c -v ./web-build/ ../mobile/ios/OneKeyWallet/web-embed/


#!/usr/bin/env bash

set -x

mkdir -p ./web-build/.well-known

# Android
rm -rf ../app/android/app/src/main/assets/web-embed
mkdir -p ../mobile/android/app/src/main/assets/web-embed
cp -r ./web-build/* ../mobile/android/app/src/main/assets/web-embed/

# iOS
rm -rf ../app/ios/OneKeyWallet/web-embed/
mkdir -p ../mobile/ios/OneKeyWallet/web-embed
cp -r ./web-build/* ../mobile/ios/OneKeyWallet/web-embed/