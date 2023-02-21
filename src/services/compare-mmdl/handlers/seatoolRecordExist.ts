import { getItem, trackError } from "../../../libs";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, seatoolExist: false };
  try {
    const item = await getItem({
      tableName: process.env.seatoolTableName,
      id: data.transmittalNumber, // we use the transmittal number here
    });

    if (item) {
      data.seatoolExist = true;
      data.seatoolRecord = item;
    } else {
      console.log(
        `No Seatool record found for mmdl record id: ${data.id}, tranmittalNumber: ${data.transmittalNumber}`
      );
    }
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(
      `data after finding seatool item: ${JSON.stringify(data, null, 2)}`
    );

    callback(null, data);
  }
};