import { app } from '@azure/functions';
const GraphQL = require("./graphql");

export async function timerTrigger1(): Promise<void> {
  const org = "anyproto";
  const projectNumber = 4;

  const projectID = await GraphQL.getProjectID(org, projectNumber);
  const projectItems = await GraphQL.getProjectItems(projectID);
  const issueData: { issue: number; status: string; linkedPRs: { number: number; repository: string }[] }[] = [];

  // get all issues in the project and store info in issueData
  for (const node of projectItems.node.items.nodes) {
    if (node.content && node.content.number) {
      const number = node.content.number;
      const status = node.fieldValues.nodes.find((field: any) => field.field?.name === "Status")?.name;
      const linkedPRs: { number: number; repository: string }[] = [];
      const linkedPRsField = node.fieldValues.nodes.find((field: any) => field.field?.name === "Linked pull requests");

      // add linked pr number and repo to the issue
      if (linkedPRsField && linkedPRsField.pullRequests && linkedPRsField.pullRequests.nodes.length > 0) {
        linkedPRsField.pullRequests.nodes.forEach((pr: any) => {
          linkedPRs.push({
            number: pr.number,
            repository: pr.repository.name,
          });
        });
      }

      issueData.push({ issue: number, status: status, linkedPRs: linkedPRs });
    }
  }

  // check each issue's status and linked PRs
  for (const issue of issueData) {
    const issueNumber = issue.issue;
    const linkedPRs = issue.linkedPRs;
    const issueItemStatus = issue.status;
    const issueItemID = await GraphQL.getIssueItemID(projectID, issueNumber);

    switch (issueItemStatus) {
      case "🏗 In progress":
        // For "🏗 In progress" issues, change status to "👀 In review" when PR is linked
        if (linkedPRs.length > 0) {
          for (const pr of linkedPRs) {
            const prItem = await GraphQL.getPullRequestItem(org, pr.repository, pr.number);
            if (!prItem.closed) {
              GraphQL.changeItemStatus(projectID, issueItemID, "👀 In review");
            } else if (prItem.merged) {
              throw new Error("PR is merged but issue status is still '🏗 In progress'");
            }
          }
        }
        break;

      case "👀 In review":
        // For "👀 In review" issues, change status to "🏗 In progress" when PR is unlinked
        if (linkedPRs.length == 0) {
          GraphQL.changeItemStatus(projectID, issueItemID, "🏗 In progress");
        }

        // For "👀 In review" issues, change status to "✅ Done" when PR is merged
        // For "👀 In review" issues, change status to "🏗 In progress" when PR is closed without merging
        if (linkedPRs.length > 0) {
          let openPRexists = false;
          let mergedPRexists = false;
          let closedPRexists = false;

          for (const pr of linkedPRs) {
            const prItem = await GraphQL.getPullRequestItem(org, pr.repository, pr.number);
            if (!prItem.closed) {
              openPRexists = true;
            } else if (prItem.merged) {
              mergedPRexists = true;
            } else if (prItem.closed) {
              closedPRexists = true;
            }
          }

          if (!openPRexists) {
            if (mergedPRexists) {
              GraphQL.changeItemStatus(projectID, issueItemID, "✅ Done");
            } else if (!mergedPRexists && closedPRexists) {
              GraphQL.changeItemStatus(projectID, issueItemID, "🏗 In progress");
            }
          }
        }
        break;
    }
  }
}

app.timer("timerTrigger1", {
  schedule: "0 */5 * * * *",
  handler: timerTrigger1,
});
