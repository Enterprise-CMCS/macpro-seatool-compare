import { has } from "lodash";
import { trackError } from "../../../libs";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, match: false };

  try {
    if (has(data, ["seatoolRecord", "STATE_PLAN", "SUBMISSION_DATE"])) {
      const rawDate = data.seatoolRecord.STATE_PLAN.SUBMISSION_DATE;
      const date = new Date(rawDate);
      const fullDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      data.seatoolSigDate = fullDate;
    }

    if (
      data.appianSigDate &&
      data.seatoolSigDate &&
      data.appianSigDate === data.seatoolSigDate
    ) {
      data.match = true;
    }
  } catch (e) {
    await trackError(e);
  } finally {
    console.log("Data after compare task:", JSON.stringify(data, null, 2));
    callback(null, data);
  }
};