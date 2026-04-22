import * as assert from 'assert';
import { 
  assertFails, 
  assertSucceeds, 
  initializeTestEnvironment, 
  RulesTestEnvironment 
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';

const PROJECT_ID = "offme-test";

describe("OffMe Security Rules", () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it("should prevent unauthorized users from creating notifications for others", async () => {
    const alice = testEnv.authenticatedContext("alice");
    const bob = testEnv.authenticatedContext("bob");

  it("should prevent unauthorized users from spoofing senderId", async () => {
    const alice = testEnv.authenticatedContext("alice");
    const impostor = testEnv.authenticatedContext("impostor");

    // Alice trying to create a notification, but claiming to be the sender (senderId: 'alice')
    await assertSucceeds(
      alice.firestore().collection("notifications").add({
        recipientId: "bob",
        senderId: "alice",
        type: "mention",
        createdAt: new Date()
      })
    );

    // Impostor trying to create a notification, but claiming to be Alice (senderId: 'alice')
    await assertFails(
      impostor.firestore().collection("notifications").add({
        recipientId: "bob",
        senderId: "alice",
        type: "mention",
        createdAt: new Date()
      })
    );
  });
});
