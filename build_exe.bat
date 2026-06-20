@echo off
echo Building AutoSpeechWriter installer for Windows...
call npm run dist
echo Build finished! The Setup EXE is located in the "dist-app" folder.
pause
