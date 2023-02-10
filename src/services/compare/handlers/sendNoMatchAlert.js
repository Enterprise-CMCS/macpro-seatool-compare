import {
  sendTemplatedEmail,
  doesSecretExist,
  getSecretsValue,
  putLogsEvent,
  trackError,
} from "../../../libs";

const Templates = {
  SendNoMatchTemplate: "SendNoMatchTemplate",
  SendNoMatchTemplateAB: "SendNoMatchTemplateAB",
  SendNoMatchTemplateChp: "SendNoMatchTemplateChp",
  SendNoMatchTemplateChpAB: "SendNoMatchTemplateChpAB",
};

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const region = process.env.region;
  const project = process.env.project;
  const stage = process.env.stage;

  // use this secret path to define the { emailRecipients, sourceEmail } for the does not match email
  let secretId = `${project}/${stage}/alerts`;

  const data = { ...event.Payload };

  const secretExists = await doesSecretExist(region, secretId);

  /* This is checking to see if the secret exists. If it does not exist, it will not send an email. */
  try {
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches
      const params = getEmailParams({ id: data.id, Template: Templates.SendNoMatchTemplate });
      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details: ",
        JSON.stringify(params, null, 2)
      );

      await putLogsEvent({
        type: "NOTFOUND",
        message: `Alert for ${data.id} - TEST `,
      });
    } else {
      let isProgramTypeChp = false;
      if (data.programType == "CHP") {
        secretId = `${project}/${stage}/alerts/CHP`;
        isProgramTypeChp = true;
      }

      const { emailRecipients, sourceEmail, emailRecipientsA, emailRecipientsB } = await getSecretsValue({
        region,
        secretId,
      });

      let recipientType;
      let recipients;
      // if it greater then 2 days but less then 4 days
      if (
        data.secSinceMmdlSigned > 48 * 3600 &&
        data.secSinceMmdlSigned < 48 * 2 * 3600
      ) {
        recipientType = "emailRecipientsA";
        recipients = emailRecipientsA;
        console.table({
          secSinceMmdlSigned: data.secSinceMmdlSigned,
          twoDays: 48 * 3600,
          recipients,
          recipientType,
          "(data.secSinceMmdlSigned > (48 * 3600)) && (data.secSinceMmdlSigned < ((48 * 2) * 3600))":
            data.secSinceMmdlSigned > 48 * 3600 &&
            data.secSinceMmdlSigned < 48 * 2 * 3600,
        });
      }
      // if it is greater then 4 days
      else if (data.secSinceMmdlSigned > 48 * 2 * 3600) {
        recipientType = "emailRecipientsB";
        recipients = emailRecipientsB;
        console.table({
          secSinceMmdlSigned: data.secSinceMmdlSigned,
          twoDays: 48 * 3600,
          recipients,
          recipientType,
          "(data.secSinceMmdlSigned > (48 * 3600))":
            data.secSinceMmdlSigned > 48 * 3600,
        });
      }
      // if it is less then 2 days
      else {
        recipientType = "emailRecipients";
        recipients = emailRecipients;
        console.table({
          secSinceMmdlSigned: data.secSinceMmdlSigned,
          twoDays: 48 * 3600,
          recipients,
          recipientType,
          "(data.secSinceMmdlSigned < (48 * 3600))":
            data.secSinceMmdlSigned < 48 * 3600,
        });
      }

      // you can also use the data.programType value here if needed "MAC" | "HHS" | "CHP"
      let params;
      if (!isProgramTypeChp) {
        //for non chip
        if (recipientType == "emailRecipients") {
          params = getEmailParams({
            emailRecipients: recipients,
            sourceEmail: sourceEmail,
            id: data.id,
            Template: Templates.SendNoMatchTemplate
          });
        }else{
          params = getEmailParams({
            emailRecipients: recipients,
            sourceEmail: sourceEmail,
            id: data.id,
            Template: Templates.SendNoMatchTemplateAB
          });
        }
      }else{
        // for chip
        if (recipientType == "emailRecipients") {
          params = getEmailParams({
            emailRecipients: recipients,
            sourceEmail: sourceEmail,
            id: data.id,
            Template: Templates.SendNoMatchTemplateChp
          });
        }else{
          params = getEmailParams({
            emailRecipients: recipients,
            sourceEmail: sourceEmail,
            id: data.id,
            Template: Templates.SendNoMatchTemplateChpAB
          });
        }
      }

      // previously we were using sendAlert,
      //now we are using SendTemplatedEmail as we are sending template email
      await sendTemplatedEmail(params);

      await putLogsEvent({
        type: "NOTFOUND",
        message: `Alert for ${data.id} - sent to ${JSON.stringify(
          emailRecipients
        )} recipient:${recipientType} `,
      });


    }
  } catch (e) {
    await trackError(e);
  } finally {
    callback(null, data);
  }
};

const getEmailParams = ({emailRecipients = ["notexistrecipients@example.com"], sourceEmail = "officialcms@example.com", id, Template}) => {
  return {
    Destination:{
      ToAddresses: emailRecipients
    },
    Source: sourceEmail,
    Template: Template,
    TemplateData: JSON.stringify({id: id})
  };
};