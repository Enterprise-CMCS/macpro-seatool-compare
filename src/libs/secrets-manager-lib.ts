import {
  SecretsManagerClient,
  GetSecretValueCommand,
  ListSecretsCommand,
} from "@aws-sdk/client-secrets-manager";

export const getSecretsValue = async (region: string, secretId: string) => {
  console.log("region", region, "secretId", secretId);
  const client = new SecretsManagerClient({ region });
  const input = { SecretId: secretId };
  const command = new GetSecretValueCommand(input);
  try {
    const response = await client.send(command);
    console.log("response", response);
    console.log("type of response", typeof response);
    
    const result = JSON.parse(response.SecretString ?? "");
    return result;
  } catch (e) {
    console.log("getSecretsValue ERROR - ", e);
    console.log("getSecretsValue ERROR", JSON.stringify(e, null, 2));
  }
};

export const doesSecretExist = async (region: string, secretId: string) => {
  const client = new SecretsManagerClient({ region });
  const input = { Filters: [{ Key: "name", Values: [secretId] }] };
  const command = new ListSecretsCommand(input);
  const { SecretList } = await client.send(command);

  if (SecretList) return SecretList.some((secret) => secret.Name === secretId);
  else return;
};
