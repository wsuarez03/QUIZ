@echo off
REM Set NODE_OPTIONS for OpenSSL 3 compatibility
setlocal enabledelayedexpansion
set "NODE_OPTIONS=--openssl-legacy-provider"
echo NODE_OPTIONS is set to: %NODE_OPTIONS%
npm run dev
