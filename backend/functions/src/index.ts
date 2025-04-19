import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
// @ts-ignore
import { askCojiHandler } from "./askCoji";

// 기본 테스트 함수 (비워도 됨)
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// 코지 함수 등록
export const askCoji = onRequest(askCojiHandler);
