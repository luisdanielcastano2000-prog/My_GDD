#!/usr/bin/env bash
# Genera la APK de publicación de My GDD, firmada con tu clave.
# Uso (en app/):  npm run apk
# Pide la contraseña de la clave en la terminal: nunca se guarda en ningún archivo.
set -euo pipefail

KS="${MYGDD_KEYSTORE:-$HOME/Documents/MyGDD-firma/my-gdd-release.jks}"
ALIAS="${MYGDD_KEY_ALIAS:-my-gdd}"
OUT="$HOME/Documents/MyGDD-APK"
export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 21)}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"

cd "$(dirname "$0")/.."
if [ ! -f "$KS" ]; then
  echo "No encuentro la clave de firma en: $KS"
  echo "Créala una vez con el comando de keytool de CLAUDE.md (apartado «App de Android»)."
  exit 1
fi

echo "1/4 · Compilando la web…"
npx ng build --configuration production >/dev/null
echo "2/4 · Copiándola al proyecto Android…"
npx cap sync android >/dev/null
echo "3/4 · Compilando la APK…"
(cd android && ./gradlew assembleRelease -q)

VER="$(sed -nE 's/.*versionName "([^"]+)".*/\1/p' android/app/build.gradle)"
UNSIGNED="android/app/build/outputs/apk/release/app-release-unsigned.apk"
ALIGNED="android/app/build/outputs/apk/release/app-release-aligned.apk"
mkdir -p "$OUT"
APK="$OUT/my-gdd-$VER.apk"

echo "4/4 · Firmando (escribe la contraseña de la clave; no se ve al teclear)…"
"$BT/zipalign" -f -p 4 "$UNSIGNED" "$ALIGNED"
"$BT/apksigner" sign --ks "$KS" --ks-key-alias "$ALIAS" --out "$APK" "$ALIGNED"
"$BT/apksigner" verify "$APK"
rm -f "$APK.idsig"
echo
echo "✅ APK lista: $APK"
