import { Client, Environment } from "square";

let _square: Client | null = null;

// Lazy initialization — only creates client when first accessed
function getSquare(): Client {
  if (!_square) {
    _square = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN!,
      environment:
        process.env.SQUARE_ENVIRONMENT === "production"
          ? Environment.Production
          : Environment.Sandbox,
    });
  }
  return _square;
}

export const squareCatalog = () => getSquare().catalogApi;
export const squareInventory = () => getSquare().inventoryApi;
export const squareOrders = () => getSquare().ordersApi;
export const squarePayments = () => getSquare().paymentsApi;
export const squareCustomers = () => getSquare().customersApi;
export const squareLocations = () => getSquare().locationsApi;
export const squareClient = () => getSquare();
