import { Probot } from "probot";
import contributorsManagement from "./contributorsManagement";
import projectManagement from "./projectManagement";

export = (app: Probot) => {
  //   app.on("issue_comment", async (context) => {
  //     const timelineResponse = await context.octokit.issues.listEventsForTimeline({
  //       owner: "jmetrikat",
  //       repo: "test",
  //       issue_number: 19,
  //     });
  //     console.log(timelineResponse.data);

  //     const event = await context.octokit.issues.getEvent({
  //       owner: "jmetrikat",
  //       repo: "test",
  //       event_id: 10509521505,
  //     });
  //     console.log(event.data);
  //   });

  contributorsManagement(app);
  projectManagement(app);
};
