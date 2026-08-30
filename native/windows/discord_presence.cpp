#define DISCORDPP_IMPLEMENTATION
#include "discordpp.h"
#include <atomic>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <string>
#include <thread>

static constexpr uint64_t APPLICATION_ID = 1543556589368254515ULL;

int main(int argc, char** argv) {
    std::string details = "DON'T STOP";
    std::string state = "Spielt gerade";
    if (argc > 1 && argv[1]) details = argv[1];
    if (argc > 2 && argv[2]) state = argv[2];

    auto client = std::make_shared<discordpp::Client>();
    client->SetApplicationId(APPLICATION_ID);

    discordpp::Activity activity;
    activity.SetType(discordpp::ActivityTypes::Playing);
    activity.SetName("DON'T STOP");
    activity.SetDetails(details);
    activity.SetState(state);

    std::atomic<bool> done{false};
    std::atomic<bool> success{false};

    client->UpdateRichPresence(activity, [&done, &success](const discordpp::ClientResult& result) {
        success = result.Successful();
        done = true;
    });

    for (int i = 0; i < 200 && !done; ++i) {
        discordpp::RunCallbacks();
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    if (!success) {
        std::cerr << "DON'T STOP: Discord Rich Presence update failed" << std::endl;
        return 2;
    }

    return 0;
}
