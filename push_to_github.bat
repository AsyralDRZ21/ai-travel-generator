@echo off
echo ==============================================
echo Pushing latest code to GitHub (ai-travel-generator)
echo ==============================================
git config --global --add safe.directory "C:/Users/60113/.gemini/antigravity/scratch/ai-travel-generator"
git init
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/AsyralDRZ21/ai-travel-generator.git
git add .
git commit -m "Update smart travel system with AI itineraries, visa info, vibrant UI and date duration alignment"
git push -u origin main --force
echo ==============================================
echo DONE! Selesai push ke GitHub!
echo Sila semak di: https://github.com/AsyralDRZ21/ai-travel-generator
echo ==============================================
pause