import express from "express";
import crypto from "crypto";

import { BakongKHQR, khqrData, IndividualInfo } from "bakong-khqr";

import {
  checkTransactionByMd5,
  getBakongAccount,
} from "../services/bakongService.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const BAKONG_TEST_MODE = process.env.BAKONG_TEST_MODE === "true";

const BAKONG_TEST_AMOUNT_KHR = Number(
  process.env.BAKONG_TEST_AMOUNT_KHR || 100,
);

const MERCHANT_NAME = "PANHA THEARITH";
const MERCHANT_CITY = "Phnom Penh";

/*
|--------------------------------------------------------------------------
| Helper: Create unique payment reference
|--------------------------------------------------------------------------
*/

function createPaymentReference() {
  const timestamp = Date.now().toString().slice(-10);

  const random = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `SUB-${timestamp}-${random}`;
}

/*
|--------------------------------------------------------------------------
| POST /api/payment/create
|--------------------------------------------------------------------------
|
| Creates a Bakong dynamic KHQR.
|
| Test mode:
|   Subscription = real USD price
|   Bakong payment = 100 KHR
|
|--------------------------------------------------------------------------
*/

router.post("/create", async (req, res) => {
  try {
    const { planId, planName, amount, ownerId } = req.body;

    console.log("");
    console.log("----------------------------------------");
    console.log("CREATE BAKONG PAYMENT");
    console.log("----------------------------------------");

    console.log({
      planId,
      planName,
      amount,
      ownerId,
      testMode: BAKONG_TEST_MODE,
    });

    /*
    |--------------------------------------------------------------------------
    | Validate request
    |--------------------------------------------------------------------------
    */

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    if (!planName) {
      return res.status(400).json({
        success: false,
        message: "Plan name is required",
      });
    }

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required",
      });
    }

    const subscriptionAmount = Number(amount);

    if (!Number.isFinite(subscriptionAmount) || subscriptionAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription amount",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine Bakong payment amount
    |--------------------------------------------------------------------------
    */

    const paymentAmount = BAKONG_TEST_MODE
      ? BAKONG_TEST_AMOUNT_KHR
      : subscriptionAmount;

    const paymentCurrency = BAKONG_TEST_MODE
      ? khqrData.currency.khr
      : khqrData.currency.usd;

    const paymentCurrencyName = BAKONG_TEST_MODE ? "KHR" : "USD";

    /*
    |--------------------------------------------------------------------------
    | Get Bakong account
    |--------------------------------------------------------------------------
    */

    const bakongAccount = getBakongAccount();

    /*
    |--------------------------------------------------------------------------
    | Create unique payment reference
    |--------------------------------------------------------------------------
    */

    const paymentReference = createPaymentReference();

    /*
    |--------------------------------------------------------------------------
    | KHQR expiration
    |--------------------------------------------------------------------------
    */

    const expiresAt = Date.now() + 5 * 60 * 1000;

    /*
    |--------------------------------------------------------------------------
    | KHQR optional data
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | This data MUST be passed as the 4th
    | argument of IndividualInfo.
    |
    |--------------------------------------------------------------------------
    */

    const optionalData = {
      currency: paymentCurrency,

      amount: paymentAmount,

      billNumber: paymentReference,

      storeLabel: "RentEase",

      terminalLabel: "Subscription",

      expirationTimestamp: expiresAt,

      merchantCategoryCode: "5999",
    };

    /*
    |--------------------------------------------------------------------------
    | Create IndividualInfo
    |--------------------------------------------------------------------------
    |
    | Correct constructor:
    |
    | IndividualInfo(
    |   bakongAccount,
    |   merchantName,
    |   merchantCity,
    |   optionalData
    | )
    |
    |--------------------------------------------------------------------------
    */

    const individualInfo = new IndividualInfo(
      bakongAccount,
      MERCHANT_NAME,
      MERCHANT_CITY,
      optionalData,
    );

    /*
    |--------------------------------------------------------------------------
    | Generate KHQR
    |--------------------------------------------------------------------------
    */

    const khqr = new BakongKHQR();

    const khqrResult = khqr.generateIndividual(individualInfo);

    console.log("");
    console.log("KHQR generation result:");
    console.log(khqrResult);

    /*
    |--------------------------------------------------------------------------
    | Validate KHQR generation
    |--------------------------------------------------------------------------
    */

    if (!khqrResult || khqrResult.status?.code !== 0 || !khqrResult.data) {
      console.error("KHQR generation failed:", khqrResult);

      return res.status(500).json({
        success: false,
        message: khqrResult?.status?.message || "Failed to generate KHQR",
        errorCode: khqrResult?.status?.errorCode || null,
      });
    }

    const qr = khqrResult.data.qr;
    const md5 = khqrResult.data.md5;

    /*
    |--------------------------------------------------------------------------
    | Return payment information
    |--------------------------------------------------------------------------
    */

    const payment = {
      /*
      | Subscription information
      */

      planId,

      planName,

      subscriptionAmount,

      subscriptionCurrency: "USD",

      /*
      | Actual Bakong payment
      */

      paymentAmount,

      paymentCurrency: paymentCurrencyName,

      paymentMethod: "Bakong",

      /*
      | Payment reference
      */

      paymentReference,

      /*
      | Bakong information
      */

      bakongAccount,

      merchantName: MERCHANT_NAME,

      merchantCity: MERCHANT_CITY,

      /*
      | QR
      */

      qr,

      md5,

      /*
      | Expiration
      */

      expiresAt,

      /*
      | Test mode
      */

      testMode: BAKONG_TEST_MODE,
    };

    console.log("");
    console.log("----------------------------------------");
    console.log("PAYMENT CREATED");
    console.log("----------------------------------------");

    console.log({
      planId,

      planName,

      subscriptionAmount,

      subscriptionCurrency: "USD",

      paymentAmount,

      paymentCurrency: paymentCurrencyName,

      paymentReference,

      bakongAccount,

      md5,

      expiresAt,

      testMode: BAKONG_TEST_MODE,
    });

    console.log("----------------------------------------");
    console.log("");

    return res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Create Bakong payment error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to create Bakong payment",
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/payment/check
|--------------------------------------------------------------------------
|
| Check whether the user actually paid.
|
| IMPORTANT:
|
| Clicking "Check Payment" DOES NOT mean payment
| is successful.
|
| This endpoint asks Bakong:
|
|   "Does this MD5 have a real transaction?"
|
|--------------------------------------------------------------------------
*/

router.post("/check", async (req, res) => {
  try {
    const { md5, expectedAmount, expectedCurrency, ownerId, planId } = req.body;

    console.log("");
    console.log("----------------------------------------");
    console.log("CHECK BAKONG PAYMENT");
    console.log("----------------------------------------");

    console.log({
      md5,
      expectedAmount,
      expectedCurrency,
      ownerId,
      planId,
      testMode: BAKONG_TEST_MODE,
    });

    /*
    |--------------------------------------------------------------------------
    | Validate request
    |--------------------------------------------------------------------------
    */

    if (!md5) {
      return res.status(400).json({
        success: false,
        paid: false,
        message: "MD5 is required",
      });
    }

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        paid: false,
        message: "Owner ID is required",
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        paid: false,
        message: "Plan ID is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Server-side expected payment
    |--------------------------------------------------------------------------
    |
    | NEVER trust frontend amount/currency
    | while running test mode.
    |
    |--------------------------------------------------------------------------
    */

    let serverExpectedAmount;
    let serverExpectedCurrency;

    if (BAKONG_TEST_MODE) {
      serverExpectedAmount = BAKONG_TEST_AMOUNT_KHR;

      serverExpectedCurrency = "KHR";
    } else {
      serverExpectedAmount = Number(expectedAmount);

      serverExpectedCurrency = expectedCurrency || "USD";
    }

    /*
    |--------------------------------------------------------------------------
    | Validate expected amount
    |--------------------------------------------------------------------------
    */

    if (!Number.isFinite(serverExpectedAmount) || serverExpectedAmount <= 0) {
      return res.status(400).json({
        success: false,
        paid: false,
        message: "Invalid expected payment amount",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Ask Bakong about this transaction
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("Checking transaction with Bakong...");

    const transaction = await checkTransactionByMd5(md5);

    console.log("");
    console.log("Bakong transaction response:");

    console.log(transaction);

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT:
    |
    | responseCode !== 0
    |
    | means the transaction was not successfully
    | returned by Bakong.
    |--------------------------------------------------------------------------
    */

    if (!transaction || transaction.responseCode !== 0) {
      console.log("");
      console.log("PAYMENT NOT VERIFIED");

      return res.status(200).json({
        success: true,
        paid: false,
        message:
          transaction?.responseMessage || "Payment has not been received yet",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get transaction data
    |--------------------------------------------------------------------------
    */

    const transactionData = transaction.data;

    if (!transactionData) {
      return res.status(200).json({
        success: true,
        paid: false,
        message: "Payment has not been received yet",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Transaction fields
    |--------------------------------------------------------------------------
    */

    const transactionHash = transactionData.hash;

    const receiver = transactionData.toAccountId;

    const sender = transactionData.fromAccountId;

    const transactionAmount = Number(transactionData.amount);

    const transactionCurrency = transactionData.currency;

    /*
    |--------------------------------------------------------------------------
    | Verify transaction hash
    |--------------------------------------------------------------------------
    */

    if (!transactionHash) {
      return res.status(200).json({
        success: true,
        paid: false,
        message: "Transaction hash not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify receiver
    |--------------------------------------------------------------------------
    */

    const configuredBakongAccount = getBakongAccount();

    if (receiver !== configuredBakongAccount) {
      console.error("Incorrect Bakong receiver:", {
        expected: configuredBakongAccount,

        received: receiver,
      });

      return res.status(200).json({
        success: true,
        paid: false,
        message: "Payment was sent to the wrong Bakong account",

        payment: {
          receiver,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify currency
    |--------------------------------------------------------------------------
    */

    if (transactionCurrency !== serverExpectedCurrency) {
      console.error("Incorrect currency:", {
        expected: serverExpectedCurrency,

        received: transactionCurrency,
      });

      return res.status(200).json({
        success: true,
        paid: false,
        message: `Incorrect currency. Expected ${serverExpectedCurrency}`,

        payment: {
          transactionCurrency,

          expectedCurrency: serverExpectedCurrency,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify amount
    |--------------------------------------------------------------------------
    */

    if (transactionAmount !== serverExpectedAmount) {
      console.error("Incorrect payment amount:", {
        expected: serverExpectedAmount,

        received: transactionAmount,
      });

      return res.status(200).json({
        success: true,
        paid: false,
        message: `Incorrect payment amount. Expected ${serverExpectedAmount} ${serverExpectedCurrency}`,

        payment: {
          transactionAmount,

          expectedAmount: serverExpectedAmount,

          transactionCurrency,

          expectedCurrency: serverExpectedCurrency,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT VERIFIED
    |--------------------------------------------------------------------------
    |
    | Only NOW can paid become true.
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("========================================");
    console.log("BAKONG PAYMENT VERIFIED");
    console.log("========================================");

    console.log({
      transactionHash,

      receiver,

      sender,

      amount: transactionAmount,

      currency: transactionCurrency,

      ownerId,

      planId,
    });

    console.log("========================================");
    console.log("");

    return res.status(200).json({
      success: true,

      paid: true,

      message: "Bakong payment verified successfully",

      payment: {
        transactionHash,

        receiver,

        sender,

        amount: transactionAmount,

        currency: transactionCurrency,

        externalRef: transactionData.externalRef || "",

        createdDateMs: transactionData.createdDateMs || null,

        acknowledgedDateMs: transactionData.acknowledgedDateMs || null,

        trackingStatus: transactionData.trackingStatus || null,

        ownerId,

        planId,
      },
    });
  } catch (error) {
    console.error("Check Bakong payment error:", error);

    /*
    |--------------------------------------------------------------------------
    | A failed Bakong/API request is NOT a paid payment.
    |--------------------------------------------------------------------------
    */

    return res.status(500).json({
      success: false,

      paid: false,

      message:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to check Bakong payment",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Export router
|--------------------------------------------------------------------------
*/

export default router;
