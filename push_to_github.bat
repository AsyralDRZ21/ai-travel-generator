@echo off
echo ==============================================
echo Pushing latest code to GitHub (ai-travel-generator)
echo ==============================================
git config --global --add safe.directory "C:/Users/60113/.gemini/antigravity/scratch/ai-travel-generator"
git add .
git commit -m "Update Smart Travel: Admin Wise Green theme and CARTO Voyager Map fix" 2>nul
git push origin main
echo ==============================================
echo DONE! Selesai push ke GitHub!
echo Vercel akan auto-deploy versi terkini dalam 1-2 minit.
echo Sila semak di: https://github.com/AsyralDRZ21/ai-travel-generator
echo ==============================================
pause
