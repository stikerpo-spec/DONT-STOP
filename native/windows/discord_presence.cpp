#define DISCORDPP_IMPLEMENTATION
#include "discordpp.h"
#include <atomic>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <mutex>
#include <string>
#include <thread>

static constexpr uint64_t APPLICATION_ID = 1543556589368254515ULL;

static std::string decode(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    for (size_t i = 0; i < value.size(); ++i) {
        if (value[i] == '\\' && i + 1 < value.size()) {
            const char c = value[i + 1];
            if (c == 't') { out.push_back('\t'); ++i; continue; }
            if (c == 'n') { out.push_back('\n'); ++i; continue; }
            if (c == '\\') { out.push_back('\\'); ++i; continue; }
        }
        out.push_back(value[i]);
    }
    return out;
}

int main() {
    auto client = std::make_shared<discordpp::Client>();
    client->SetApplicationId(APPLICATION_ID);

    std::atomic<bool> running{true};
    std::mutex clientMutex;

    auto update = [&](const std::string& details, const std::string& state) {
        std::lock_guard<std::mutex> lock(clientMutex);
        discordpp::Activity activity;
        activity.SetType(discordpp::ActivityTypes::Playing);
        activity.SetName("DON'T STOP");
        activity.SetDetails(details.empty() ? "DON'T STOP" : details);
        activity.SetState(state.empty() ? "Spielt gerade" : state);
        client->UpdateRichPresence(activity, [](const discordpp::ClientResult& result) {
            if (!result.Successful()) {
                std::cerr << "DON'T STOP Discord Social SDK: Rich Presence update failed" << std::endl;
            }
        });
    };

    std::thread input([&]() {
        std::string line;
        while (running && std::getline(std::cin, line)) {
            if (line == "QUIT") {
                running = false;
                break;
            }
            if (line == "CLEAR") {
                std::lock_guard<std::mutex> lock(clientMutex);
                client->UpdateRichPresence(discordpp::Activity{}, [](const discordpp::ClientResult&) {});
                continue;
            }
            if (line.rfind("UPDATE\t", 0) == 0) {
                const std::string payload = line.substr(7);
                const size_t separator = payload.find('\t');
                const std::string details = decode(separator == std::string::npos ? payload : payload.substr(0, separator));
                const std::string state = decode(separator == std::string::npos ? "Spielt gerade" : payload.substr(separator + 1));
                update(details, state);
            }
        }
        running = false;
    });

    while (running) {
        discordpp::RunCallbacks();
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    if (input.joinable()) input.join();
    return 0;
}
