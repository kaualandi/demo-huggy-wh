// {
//   baseUrl: process.env.VOISTON_BASE_URL,
//   dataPartner: process.env.VOISTON_DATA_PARTNER,
//   apiKey: process.env.VOISTON_API_KEY,
// };
import axios from "axios";


console.log(process.env.VOISTON_API_KEY);

export const voistonApi = axios.create({
  baseURL: process.env.VOISTON_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "apiKey": process.env.VOISTON_API_KEY || ''
  }
});