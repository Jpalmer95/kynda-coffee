import { Client, Environment } from "square";

// Square client for POS/inventory sync
export const square = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment:
    process.env.SQUARE_ENVIRONMENT === "production"
      ? Environment.Production
      : Environment.Sandbox,
});

export const squareCatalog = square.catalogApi;
export const squareInventory = square.inventoryApi;
export const squareOrders = square.ordersApi;
export const squarePayments = square.paymentsApi;
export const squareCustomers = square.customersApi;
