:: 📁 .\CorpEasy_backup.bat
:: Create at 2504230530 Ver1.1

@echo off
REM 1) 원본 및 백업 루트 경로 설정
set "SOURCE=D:\APP\CorpEasy"
set "BACKUP_ROOT=D:\APP\CorpEasy_Backup"

REM 2) 날짜 문자열 생성 (YYMMDD)
set "DATESTAMP=%date:~2,2%%date:~5,2%%date:~8,2%"

REM 3) 최종 대상 경로: 백업 루트\CorpEasy_YYMMDD
set "DEST=%BACKUP_ROOT%\CorpEasy_%DATESTAMP%"

echo 백업 시작: %DEST%

REM 4) 멀티스레드 robocopy로 폴더 내용만 복사 (폴더 자체는 제외)
robocopy "%SOURCE%" "%DEST%" /MIR /MT:16 /R:3 /W:5 /XD "%SOURCE%" /NFL /NDL

echo 백업 완료!
pause
