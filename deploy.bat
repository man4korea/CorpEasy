@echo off
:: 📁 deploy.bat
:: Create at 2504202330 Ver1.0

echo === CorpEasy 배포 스크립트 ===

:: 프론트엔드 빌드
echo [1/4] 프론트엔드 빌드 중...
cd frontend
call npm run build
cd ..

:: 백엔드 함수 준비
echo [2/4] 백엔드 함수 준비 중...
if not exist backend\functions\lib mkdir backend\functions\lib
xcopy /E /I /Y backend\functions\src\*.* backend\functions\lib\

:: Firebase 배포
echo [3/4] Firebase에 배포 중...
call firebase deploy

echo [4/4] 배포 완료
echo 배포가 완료되었습니다!