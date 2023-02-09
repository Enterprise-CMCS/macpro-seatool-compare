import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { getItem, trackError } from "../../../libs";

/* This is the Lambda function that is triggered by the DynamoDB stream. It is responsible for starting
the Step Function execution. */
exports.handler = async function (event: {
  Records: { dynamodb: { Keys: { id: { S: any } } } }[];
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const client = new SFNClient({ region: process.env.region });
  const id = event.Records[0].dynamodb.Keys.id.S;

  /* Retrieving the record from the DynamoDB table. */
  const appianRecord = await getItem({
    tableName: process.env.appianTableName,
    id,
  });

  /* Checking if the appian record was signed within the last 200 days. */
  const submissionDate = appianRecord.payload?.SBMSSN_DATE;

  /* Calculating the difference between the current date and the date Appian was submitted. */
  const today = new Date().getTime();
  const submittedOn = new Date(submissionDate).getTime();

  const diffInSec = Math.floor((today - submittedOn) / 1000); // from ms to sec we div by 1000
  console.log(
    diffInSec,
    appianRecord.payload?.SBMSSN_TYPE,
    appianRecord.payload?.SUB_STUS
  );
  if (
    appianRecord.payload?.SBMSSN_TYPE?.toLowerCase() === "official" &&
    appianRecord.payload?.SUB_STUS?.toLowerCase() === "submitted" &&
    diffInSec < 289440
  ) {
    /* Creating an object that will be passed to the StartExecutionCommand. */
    const params = {
      input: JSON.stringify({
        id,
      }),
      name: id,
      stateMachineArn: process.env.stateMachineArn,
    };

    /* Creating a new instance of the StartExecutionCommand class. */
    const command = new StartExecutionCommand(params);

    try {
      /* Sending the command to the Step Function service. */
      const result = await client.send(command);
      console.log(
        "Result from starting step function command",
        JSON.stringify(result, null, 2)
      );
    } catch (e) {
      await trackError(e);
    } finally {
      console.log("finally");
    }
  } else {
    console.log(`Record ${id} not submitted within last 200 days. Ignoring...`);
  }
};
