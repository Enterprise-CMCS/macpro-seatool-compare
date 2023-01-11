import {
  PutMetricDataCommand,
  CloudWatchClient,
} from "@aws-sdk/client-cloudwatch";
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

/**
 * Sends metric data to CloudWatch
 * @param params - {
 * @returns The response from the PutMetricDataCommand.
 */
export async function sendMetricData(params) {
  console.log("Sending metric data: ", JSON.stringify(params));
  const client = new CloudWatchClient();
  const command = new PutMetricDataCommand(params);
  try {
    const response = await client.send(command);
    console.log("Response from sending metric data", JSON.stringify(response));
    return response;
  } catch (e) {
    console.log("Error from sending metric data", e);
  }
}

/**
 * It takes a type and a message, and sends the message to the log stream of that type
 */
export async function putLogsEvent({ type, message }) {
  const client = new CloudWatchLogsClient({ region: process.env.region });
  const input = {
    logEvents: [{ message, timestamp: new Date().getTime() }],
    logGroupName: process.env.sesLogGroupName,
    logStreamName: type,
  };
  const command = new PutLogEventsCommand(input);

  try {
    const response = await client.send(command);
    console.log(
      "Response from sending log event:",
      JSON.stringify(response, null, 2)
    );
  } catch (e) {
    console.log("Error from sending log event", e);
  }
}
