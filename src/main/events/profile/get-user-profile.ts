import { registerEvent } from "../register-event";
import { userProfileSchema } from "../helpers/validators";
import { logger } from "@main/services";
import { HydraApi } from "@main/services/hydra-api";
import { steamGamesWorker } from "@main/workers";
import { UserProfile } from "@types";
import { convertSteamGameToCatalogueEntry } from "../helpers/search-games";

const getUserProfile = async (
  _event: Electron.IpcMainInvokeEvent,
  username: string
): Promise<UserProfile | null> => {
  try {
    const response = await HydraApi.get(`/profile/${username}`);
    const profile = userProfileSchema.parse(response.data);

    const recentGames = await Promise.all(
      profile.recentGames.map(async (game) => {
        const steamGame = await steamGamesWorker.run(Number(game.objectId), {
          name: "getById",
        });

        return convertSteamGameToCatalogueEntry(steamGame);
      })
    );

    const libraryGames = await Promise.all(
      profile.libraryGames.map(async (game) => {
        const steamGame = await steamGamesWorker.run(Number(game.objectId), {
          name: "getById",
        });
        return convertSteamGameToCatalogueEntry(steamGame);
      })
    );

    return { ...profile, libraryGames, recentGames };
  } catch (err) {
    logger.error(`getUserProfile: ${username}`, err);
    return null;
  }
};

registerEvent("getUserProfile", getUserProfile);