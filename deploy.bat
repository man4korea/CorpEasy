@echo off
:: 📁 deploy.bat
:: Create at 2504202330 Ver1.0

echo === CorpEasy 배포 스크립트 ===

:: 프론트엔드 빌드
echo [1/5] 프론트엔드 빌드 중...
cd frontend
call npm run build
cd ..

:: 백엔드 함수 준비
echo [2/5] 백엔드 함수 의존성 설치 중...
cd backend\functions
call npm install
cd ..\..

echo [3/5] 백엔드 함수 컴파일 중...
cd backend\functions
call npm run build
cd ..\..

:: Firebase 배포
echo [4/5] Firebase에 배포 중...
call firebase deploy

echo [5/5] 배포 완료
echo 배포가 완료되었습니다!