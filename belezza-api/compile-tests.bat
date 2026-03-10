@echo off
set MAVEN_OPTS=-Dmaven.multiModuleProjectDirectory=%CD%
call mvnw.cmd clean test-compile
