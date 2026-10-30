// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();

// const BAKONG_API_URL =
//   process.env.BAKONG_API_URL || "https://api-bakong.nbc.gov.kh";

// const BAKONG_API_TOKEN = process.env.BAKONG_API_TOKEN;

// const BAKONG_ACCOUNT = process.env.BAKONG_ACCOUNT;

// /**
//  * Get configured Bakong account.
//  */
// export function getBakongAccount() {
//   if (!BAKONG_ACCOUNT) {
//     throw new Error("BAKONG_ACCOUNT is not configured in .env");
//   }

//   return BAKONG_ACCOUNT.trim();
// }

// /**
//  * Get Bakong API token.
//  */
// function getBakongToken() {
//   if (!BAKONG_API_TOKEN) {
//     throw new Error("BAKONG_API_TOKEN is not configured in .env");
//   }

//   return BAKONG_API_TOKEN.trim();
// }

// /**
//  * Check transaction by MD5.
//  *
//  * Bakong:
//  * POST /v1/check_transaction_by_md5
//  */
// export async function checkTransactionByMd5(md5) {
//   if (!md5) {
//     throw new Error("MD5 is required");
//   }

//   const token = getBakongToken();

//   const url = `${BAKONG_API_URL}/v1/check_transaction_by_md5`;

//   try {
//     const response = await axios.post(
//       url,
//       {
//         md5,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },

//         timeout: 15000,
//       },
//     );

//     return response.data;
//   } catch (error) {
//     console.error("Bakong API request failed:", {
//       status: error.response?.status,
//       data: error.response?.data,
//       message: error.message,
//     });

//     throw error;
//   }
// }


import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/*
|--------------------------------------------------------------------------
| Bakong configuration
|--------------------------------------------------------------------------
*/

const BAKONG_API_URL =
  process.env.BAKONG_API_URL || "https://api-bakong.nbc.gov.kh";

const BAKONG_API_TOKEN = process.env.BAKONG_API_TOKEN;

const BAKONG_ACCOUNT = process.env.BAKONG_ACCOUNT;

/*
|--------------------------------------------------------------------------
| Get Bakong account
|--------------------------------------------------------------------------
*/

export function getBakongAccount() {
  if (!BAKONG_ACCOUNT) {
    throw new Error("BAKONG_ACCOUNT is not configured in .env");
  }

  return BAKONG_ACCOUNT.trim();
}

/*
|--------------------------------------------------------------------------
| Get Bakong token
|--------------------------------------------------------------------------
*/

function getBakongToken() {
  if (!BAKONG_API_TOKEN) {
    throw new Error("BAKONG_API_TOKEN is not configured in .env");
  }

  return BAKONG_API_TOKEN.trim();
}

/*
|--------------------------------------------------------------------------
| Check transaction by MD5
|--------------------------------------------------------------------------
*/

export async function checkTransactionByMd5(md5) {
  if (!md5) {
    throw new Error("MD5 is required");
  }

  const token = getBakongToken();

  const url = `${BAKONG_API_URL}/v1/check_transaction_by_md5`;

  try {
    const response = await axios.post(
      url,

      {
        md5,
      },

      {
        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",

          Accept: "application/json",
        },

        timeout: 15000,
      },
    );

    return response.data;
  } catch (error) {
    console.error("Bakong API request failed:", {
      status: error.response?.status,

      data: error.response?.data,

      message: error.message,
    });

    throw error;
  }
}
