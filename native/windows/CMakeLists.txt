cmake_minimum_required(VERSION 3.20)
project(dont_stop_discord_presence LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(DISCORD_SDK_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../vendor/discord_social_sdk" CACHE PATH "Discord Social SDK root")
set(DISCORD_INCLUDE_DIR "${DISCORD_SDK_ROOT}/include")
set(DISCORD_LIB_DIR "${DISCORD_SDK_ROOT}/lib/release")
set(DISCORD_BIN_DIR "${DISCORD_SDK_ROOT}/bin/release")

if(NOT EXISTS "${DISCORD_INCLUDE_DIR}/discordpp.h")
  message(FATAL_ERROR "Discord Social SDK not found. Expected ${DISCORD_INCLUDE_DIR}/discordpp.h")
endif()
if(NOT EXISTS "${DISCORD_LIB_DIR}/discord_partner_sdk.lib")
  message(FATAL_ERROR "Discord Social SDK Windows import library not found: ${DISCORD_LIB_DIR}/discord_partner_sdk.lib")
endif()
if(NOT EXISTS "${DISCORD_BIN_DIR}/discord_partner_sdk.dll")
  message(FATAL_ERROR "Discord Social SDK Windows DLL not found: ${DISCORD_BIN_DIR}/discord_partner_sdk.dll")
endif()

add_executable(dont_stop_discord_presence discord_presence.cpp)
target_include_directories(dont_stop_discord_presence PRIVATE "${DISCORD_INCLUDE_DIR}")
target_link_libraries(dont_stop_discord_presence PRIVATE "${DISCORD_LIB_DIR}/discord_partner_sdk.lib")

add_custom_command(TARGET dont_stop_discord_presence POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "${DISCORD_BIN_DIR}/discord_partner_sdk.dll"
    "$<TARGET_FILE_DIR:dont_stop_discord_presence>/discord_partner_sdk.dll")

set_target_properties(dont_stop_discord_presence PROPERTIES OUTPUT_NAME "dont-stop-discord-presence")
