import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { getItem, trackError } from "../../../libs";
import { getAppianSigInfo } from "./utils/getAppianlInfoFromRecord";
import { AppianRecord } from "./interfaces";

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

  /* A function that returns an object with the following properties:
  - appianSigned: boolean
  - secSinceAppianSigned?: number */
  const sigInfo = getAppianSigInfo(appianRecord as AppianRecord);

  /* Checking if the appian was signed within the last 250 days. */
  if (
    sigInfo.appianSigned &&
    sigInfo.secSinceAppianSigned &&
    sigInfo.secSinceAppianSigned < 21686400
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
    console.log(`Record ${id} not signed within last 250 days. Ignoring...`);
  }
};
