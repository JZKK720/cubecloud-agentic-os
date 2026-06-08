@echo off
setlocal EnableDelayedExpansion
set "AUTO=g,t"
:AUTO_LOOP
if "!AUTO!"=="" goto :AUTO_DONE
set "AUTO_HEAD=!AUTO:~0,1!"
set "AUTO_REST=!AUTO:~1!"
set "AUTO=!AUTO_REST!"
echo Dispatching: !AUTO_HEAD!
if "!AUTO_HEAD!"=="g" echo   G action
if "!AUTO_HEAD!"=="t" echo   T action
goto :AUTO_LOOP
:AUTO_DONE
echo Done
endlocal
