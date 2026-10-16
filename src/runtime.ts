import { IndexedDbRepository, OnboardingService } from "./application";
import { BrowserCoordinator } from "./browserCoordination";

export function createBrowserService(databaseName = "fieldwork-onboarding") {
  return new OnboardingService(
    new IndexedDbRepository(databaseName),
    undefined,
    undefined,
    new BrowserCoordinator(databaseName),
  );
}
